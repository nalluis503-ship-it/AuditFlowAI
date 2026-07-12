def test_async_ingest_runs_as_durable_profile_job(client):
    content = b"id,name,amount\n1,Ana,10\n2,,20\n2,,20\n"

    accepted = client.post(
        "/api/v1/sources/ingest-async",
        files={"file": ("payments.csv", content, "text/csv")},
    )

    assert accepted.status_code == 202
    data = accepted.json()["data"]
    source_id = data["source"]["id"]
    job_id = data["job"]["id"]
    assert data["source"]["status"] == "stored"
    assert data["job"]["status"] == "queued"

    container = client.app.state.container
    assert container.job_worker.run_once() is True

    job = client.get(f"/api/v1/jobs/{job_id}").json()["data"]
    assert job["status"] == "succeeded"
    assert job["progress_percent"] == 100.0
    assert job["result"]["source_id"] == source_id

    source = client.get(f"/api/v1/sources/{source_id}").json()["data"]
    assert source["status"] == "ready"
    assert source["profile"]["sheets"][0]["row_count"] == 3

    events = client.get(f"/api/v1/jobs/{job_id}/events").json()["data"]["items"]
    event_types = [item["event_type"] for item in events]
    assert all(item["resource_type"] == "source" for item in events)
    assert all(item["resource_id"] == source_id for item in events)
    assert event_types[0] == "job.queued"
    assert "job.started" in event_types
    assert "job.progress" in event_types
    assert event_types[-1] == "job.succeeded"


def test_queued_job_can_be_canceled_without_execution(client):
    accepted = client.post(
        "/api/v1/sources/ingest-async",
        files={"file": ("cancel.csv", b"id\n1\n", "text/csv")},
    )
    job_id = accepted.json()["data"]["job"]["id"]
    source_id = accepted.json()["data"]["source"]["id"]

    canceled = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert canceled.status_code == 200
    assert canceled.json()["data"]["status"] == "canceled"
    assert canceled.json()["data"]["cancel_requested"] is True

    assert client.app.state.container.job_worker.run_once() is False
    source = client.get(f"/api/v1/sources/{source_id}").json()["data"]
    assert source["status"] == "stored"


def test_job_creation_is_idempotent(client):
    payload = {
        "job_type": "source.profile",
        "payload": {"source_id": "missing", "header_rows": {}},
        "idempotency_key": "same-operation",
    }

    first = client.post("/api/v1/jobs", json=payload)
    second = client.post("/api/v1/jobs", json=payload)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["data"]["id"] == second.json()["data"]["id"]
    assert client.get("/api/v1/jobs").json()["data"]["total"] == 1


def test_source_cannot_be_deleted_while_job_is_active(client):
    accepted = client.post(
        "/api/v1/sources/ingest-async",
        files={"file": ("protected.csv", b"id\n1\n", "text/csv")},
    )
    data = accepted.json()["data"]
    source_id = data["source"]["id"]
    job_id = data["job"]["id"]

    blocked = client.delete(f"/api/v1/sources/{source_id}")
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "resource_job_active"

    assert client.post(f"/api/v1/jobs/{job_id}/cancel").status_code == 200
    assert client.delete(f"/api/v1/sources/{source_id}").status_code == 204
