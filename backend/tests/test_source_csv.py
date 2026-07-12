import hashlib


def test_ingests_profiles_persists_and_lists_csv(client):
    content = b"id,name,amount\n1,Ana,10\n2,,20\n2,,20\n"

    response = client.post(
        "/api/v1/sources/ingest",
        files={"file": ("payments.csv", content, "text/csv")},
    )

    assert response.status_code == 201
    profile = response.json()["data"]
    assert profile["original_name"] == "payments.csv"
    assert profile["sha256"] == hashlib.sha256(content).hexdigest()
    assert profile["status"] == "ready"
    assert profile["profile_engine"] == "duckdb"
    assert profile["completeness"] == "exact"

    sheet = profile["sheets"][0]
    assert sheet["header_row_number"] == 1
    assert sheet["row_count"] == 3
    assert sheet["column_count"] == 3
    assert sheet["duplicate_row_count"] == 1
    assert sheet["null_cell_count"] == 2
    assert sheet["columns"][1]["name"] == "name"
    assert sheet["columns"][1]["null_count"] == 2

    listed = client.get("/api/v1/sources").json()["data"]
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == profile["id"]

    loaded = client.get(f"/api/v1/sources/{profile['id']}").json()["data"]
    assert loaded["profile"]["sha256"] == profile["sha256"]


def test_rejects_unsupported_source_without_simulation(client):
    response = client.post(
        "/api/v1/sources/ingest",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "unsupported_source_format"
