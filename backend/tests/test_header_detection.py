def test_detects_and_allows_confirming_institutional_header(client):
    content = (
        b"FORMATO INSTITUCIONAL,,\n"
        b"Generado,2026,\n"
        b"folio,nombre,importe\n"
        b"A-1,Ana,100\n"
        b"A-2,Luis,200\n"
    )

    created = client.post(
        "/api/v1/sources/ingest",
        files={"file": ("institutional.csv", content, "text/csv")},
    )
    assert created.status_code == 201
    profile = created.json()["data"]
    source_id = profile["id"]

    assert profile["sheets"][0]["header_row_number"] == 3
    assert profile["sheets"][0]["row_count"] == 2

    reprofiling = client.post(
        f"/api/v1/sources/{source_id}/reprofile",
        json={"header_rows": {"institutional": 3}},
    )
    assert reprofiling.status_code == 200
    updated = reprofiling.json()["data"]["sheets"][0]
    assert updated["header_row_number"] == 3
    assert updated["header_confidence"] == 1.0
    assert [column["name"] for column in updated["columns"]] == [
        "folio",
        "nombre",
        "importe",
    ]
