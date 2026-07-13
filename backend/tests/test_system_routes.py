def test_system_routes_are_real_and_ready(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/ready").json() == {"status": "ready"}

    status = client.get("/api/v1/status")
    assert status.status_code == 200
    payload = status.json()["data"]
    assert payload["simulated_data"] is False
    assert payload["durable_jobs"] is True
    assert payload["resumable_uploads"] is True
    assert payload["version"] == "0.12.0"

    paths = set(client.app.openapi()["paths"])
    assert "/api/v1/sources/ingest" in paths
    assert "/api/v1/sources" in paths
    assert "/api/v1/capabilities" in paths
    assert "/api/v1/jobs" in paths
    assert "/api/v1/jobs/{job_id}" in paths
    assert "/api/v1/sources/ingest-async" in paths
    assert "/api/v1/workflows" not in paths
    assert "/api/v1/nodes" not in paths
