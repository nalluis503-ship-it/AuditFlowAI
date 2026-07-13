import hashlib


def _csv_content() -> bytes:
    rows = ["id,name,amount"]
    rows.extend(f"{index},Person {index},{index * 10}" for index in range(1, 6000))
    rows.append("5999,Person 5999,59990")
    return ("\n".join(rows) + "\n").encode()


def _create_session(client, content: bytes, *, part_size: int = 65536):
    response = client.post(
        "/api/v1/upload-sessions",
        json={
            "original_name": "large-payments.csv",
            "media_type": "text/csv",
            "size_bytes": len(content),
            "part_size_bytes": part_size,
            "sha256": hashlib.sha256(content).hexdigest(),
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


def _parts(content: bytes, part_size: int) -> list[bytes]:
    return [
        content[offset : offset + part_size]
        for offset in range(0, len(content), part_size)
    ]


def _put_part(client, session_id: str, number: int, payload: bytes):
    return client.put(
        f"/api/v1/upload-sessions/{session_id}/parts/{number}",
        content=payload,
        headers={
            "Content-Type": "application/octet-stream",
            "X-Part-SHA256": hashlib.sha256(payload).hexdigest(),
        },
    )


def test_resumable_upload_completes_as_durable_profile_job(client):
    content = _csv_content()
    session = _create_session(client, content)
    session_id = session["id"]
    parts = _parts(content, session["part_size_bytes"])

    assert session["expected_part_count"] == len(parts)
    assert session["next_missing_part_number"] == 1

    order = [*range(2, len(parts) + 1), 1]
    for number in order:
        response = _put_part(client, session_id, number, parts[number - 1])
        assert response.status_code == 200
        assert response.json()["data"]["part_number"] == number

    idempotent = _put_part(client, session_id, 1, parts[0])
    assert idempotent.status_code == 200

    listed_parts = client.get(
        f"/api/v1/upload-sessions/{session_id}/parts",
        params={"limit": 2, "offset": 0},
    ).json()["data"]
    assert listed_parts["total"] == len(parts)
    assert [item["part_number"] for item in listed_parts["items"]] == [1, 2]

    stored = client.get(f"/api/v1/upload-sessions/{session_id}").json()["data"]
    assert stored["received_part_count"] == len(parts)
    assert stored["received_size_bytes"] == len(content)
    assert stored["progress_percent"] == 100.0
    assert stored["next_missing_part_number"] is None

    accepted = client.post(f"/api/v1/upload-sessions/{session_id}/complete")
    assert accepted.status_code == 202
    accepted_data = accepted.json()["data"]
    job_id = accepted_data["job"]["id"]
    source_id = accepted_data["source_id"]
    assert accepted_data["job"]["job_type"] == "source.complete_upload"

    container = client.app.state.container
    assert container.job_worker.run_once() is True

    job = client.get(f"/api/v1/jobs/{job_id}").json()["data"]
    assert job["status"] == "succeeded"
    assert job["progress_percent"] == 100.0
    assert job["result"]["source_id"] == source_id

    completed = client.get(f"/api/v1/upload-sessions/{session_id}").json()["data"]
    assert completed["status"] == "completed"
    assert completed["source_id"] == source_id

    source = client.get(f"/api/v1/sources/{source_id}").json()["data"]
    assert source["status"] == "ready"
    assert source["profile"]["sha256"] == hashlib.sha256(content).hexdigest()
    assert source["profile"]["sheets"][0]["row_count"] == 6000

    events = client.get(f"/api/v1/jobs/{job_id}/events").json()["data"]["items"]
    assert all(item["resource_type"] == "upload_session" for item in events)
    assert all(item["resource_id"] == session_id for item in events)
    assert events[-1]["event_type"] == "job.succeeded"


def test_completion_rejects_missing_parts_and_conflicting_part(client):
    content = _csv_content()
    session = _create_session(client, content)
    session_id = session["id"]
    parts = _parts(content, session["part_size_bytes"])

    first = _put_part(client, session_id, 1, parts[0])
    assert first.status_code == 200

    conflicting_payload = b"x" * len(parts[0])
    conflict = _put_part(client, session_id, 1, conflicting_payload)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "upload_part_conflict"

    incomplete = client.post(f"/api/v1/upload-sessions/{session_id}/complete")
    assert incomplete.status_code == 409
    assert incomplete.json()["error"]["code"] == "upload_parts_incomplete"


def test_upload_session_can_be_aborted_and_files_are_removed(client):
    content = _csv_content()
    session = _create_session(client, content)
    session_id = session["id"]
    first_part = _parts(content, session["part_size_bytes"])[0]
    assert _put_part(client, session_id, 1, first_part).status_code == 200

    part_path = client.app.state.container.settings.upload_storage / session_id
    assert part_path.exists()

    aborted = client.delete(f"/api/v1/upload-sessions/{session_id}")
    assert aborted.status_code == 204
    assert not part_path.exists()

    detail = client.get(f"/api/v1/upload-sessions/{session_id}").json()["data"]
    assert detail["status"] == "aborted"


def test_part_integrity_failures_do_not_register_progress(client):
    content = _csv_content()
    session = _create_session(client, content)
    session_id = session["id"]
    first_part = _parts(content, session["part_size_bytes"])[0]

    wrong_checksum = client.put(
        f"/api/v1/upload-sessions/{session_id}/parts/1",
        content=first_part,
        headers={"X-Part-SHA256": "0" * 64},
    )
    assert wrong_checksum.status_code == 422
    assert wrong_checksum.json()["error"]["code"] == ("upload_part_checksum_mismatch")

    wrong_size_payload = first_part[:-1]
    wrong_size = client.put(
        f"/api/v1/upload-sessions/{session_id}/parts/1",
        content=wrong_size_payload,
        headers={"X-Part-SHA256": hashlib.sha256(wrong_size_payload).hexdigest()},
    )
    assert wrong_size.status_code == 422
    assert wrong_size.json()["error"]["code"] == "upload_part_size_mismatch"

    detail = client.get(f"/api/v1/upload-sessions/{session_id}").json()["data"]
    assert detail["received_part_count"] == 0
    assert detail["received_size_bytes"] == 0
    assert detail["next_missing_part_number"] == 1
