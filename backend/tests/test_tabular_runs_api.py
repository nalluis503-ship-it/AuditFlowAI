import io

from openpyxl import Workbook


def _column(name: str) -> dict:
    return {"kind": "column", "column": name}


def _literal(value) -> dict:
    return {"kind": "literal", "value": value}


def _cast_integer(expression: dict) -> dict:
    return {
        "kind": "cast",
        "data_type": "integer",
        "arguments": [expression],
    }


def _ingest_csv(client, name: str, content: bytes) -> dict:
    response = client.post(
        "/api/v1/sources/ingest",
        files={"file": (name, content, "text/csv")},
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def _run_once(client) -> None:
    assert client.app.state.container.job_worker.run_once() is True


def test_typed_tabular_run_materializes_traceable_derived_source(client):
    source = _ingest_csv(
        client,
        "transactions.csv",
        b"category,amount\nA,10\nA,20\nB,30\nB,5\n",
    )
    request = {
        "name": "Amounts over threshold by category",
        "output_name": "category-summary",
        "idempotency_key": "tabular-summary-v1",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "transactions", "source_id": source["id"]}],
            "steps": [
                {
                    "type": "filter",
                    "id": "filtered",
                    "input": "transactions",
                    "where": {
                        "kind": "binary",
                        "operator": "greater_than",
                        "arguments": [
                            _cast_integer(_column("amount")),
                            _literal(10),
                        ],
                    },
                },
                {
                    "type": "select",
                    "id": "selected",
                    "input": "filtered",
                    "columns": [
                        {"name": "category", "expression": _column("category")},
                        {
                            "name": "amount_value",
                            "expression": _cast_integer(_column("amount")),
                        },
                    ],
                },
                {
                    "type": "aggregate",
                    "id": "summary",
                    "input": "selected",
                    "group_by": [
                        {"name": "category", "expression": _column("category")}
                    ],
                    "measures": [
                        {
                            "name": "total_amount",
                            "function": "sum",
                            "expression": _column("amount_value"),
                        },
                        {"name": "row_count", "function": "count"},
                    ],
                },
                {
                    "type": "sort",
                    "id": "ordered",
                    "input": "summary",
                    "keys": [
                        {
                            "expression": _column("category"),
                            "direction": "asc",
                            "nulls": "last",
                        }
                    ],
                },
            ],
            "output": "ordered",
        },
    }

    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text
    submission = accepted.json()["data"]
    run = submission["run"]
    job = submission["job"]
    assert job["job_type"] == "tabular.execute"
    assert run["output_name"] == "category-summary.parquet"
    assert run["inputs"][0]["source_sha256"] == source["sha256"]
    assert run["inputs"][0]["profile_version"] == source["profile_version"]
    assert run["inputs"][0]["profile_engine"] == source["profile_engine"]
    assert [item["name"] for item in run["inputs"][0]["columns"]] == [
        "category",
        "amount",
    ]

    _run_once(client)

    completed = client.get(f"/api/v1/tabular-runs/{run['id']}").json()["data"]
    assert completed["job"]["status"] == "succeeded"
    assert completed["run"]["engine"] == "duckdb"
    output_id = completed["run"]["output_source_id"]

    output = client.get(f"/api/v1/sources/{output_id}")
    assert output.status_code == 200
    output_data = output.json()["data"]
    assert output_data["status"] == "ready"
    assert output_data["original_name"] == "category-summary.parquet"
    assert output_data["profile"]["sheets"][0]["row_count"] == 2

    preview = client.get(
        f"/api/v1/sources/{output_id}/preview",
        params={"limit": 10},
    ).json()["data"]
    assert preview["columns"] == ["category", "total_amount", "row_count"]
    assert preview["rows"] == [["A", "20", "1"], ["B", "30", "1"]]

    events = client.get(f"/api/v1/jobs/{job['id']}/events").json()["data"]
    assert events["total"] >= 5

    repeated = client.post("/api/v1/tabular-runs", json=request)
    assert repeated.status_code == 202
    repeated_data = repeated.json()["data"]
    assert repeated_data["run"]["id"] == run["id"]
    assert repeated_data["job"]["id"] == job["id"]

    changed = dict(request)
    changed["output_name"] = "different-output"
    conflict = client.post("/api/v1/tabular-runs", json=changed)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "tabular_idempotency_conflict"


def test_tabular_join_combines_multiple_sources_without_raw_sql(client):
    employees = _ingest_csv(
        client,
        "employees.csv",
        b"id,name\n1,Ana\n2,Luis\n",
    )
    payments = _ingest_csv(
        client,
        "payments.csv",
        b"employee_id,amount\n1,100\n1,50\n2,75\n",
    )
    request = {
        "name": "Payments by employee",
        "output_name": "payments-by-employee.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [
                {"alias": "employees", "source_id": employees["id"]},
                {"alias": "payments", "source_id": payments["id"]},
            ],
            "steps": [
                {
                    "type": "join",
                    "id": "matched",
                    "left": "employees",
                    "right": "payments",
                    "how": "inner",
                    "conditions": [
                        {
                            "left_column": "id",
                            "right_column": "employee_id",
                            "comparison": "equals",
                        }
                    ],
                    "columns": [
                        {"side": "left", "column": "name", "name": "name"},
                        {
                            "side": "right",
                            "column": "amount",
                            "name": "amount",
                        },
                    ],
                },
                {
                    "type": "aggregate",
                    "id": "summary",
                    "input": "matched",
                    "group_by": [{"name": "name", "expression": _column("name")}],
                    "measures": [
                        {
                            "name": "total_amount",
                            "function": "sum",
                            "expression": _cast_integer(_column("amount")),
                        }
                    ],
                },
                {
                    "type": "sort",
                    "id": "ordered",
                    "input": "summary",
                    "keys": [{"expression": _column("name")}],
                },
            ],
            "output": "ordered",
        },
    }

    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text
    run = accepted.json()["data"]["run"]
    _run_once(client)

    output_id = client.get(f"/api/v1/tabular-runs/{run['id']}").json()["data"]["run"][
        "output_source_id"
    ]
    preview = client.get(
        f"/api/v1/sources/{output_id}/preview",
        params={"limit": 10},
    ).json()["data"]
    assert preview["rows"] == [["Ana", "150"], ["Luis", "75"]]

    catalog = client.get("/api/v1/tabular-runs/catalog").json()["data"]
    assert catalog["raw_sql_accepted"] is False
    assert "join" in catalog["step_types"]

    raw_sql = {
        "name": "Unsafe",
        "output_name": "unsafe.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "employees", "source_id": employees["id"]}],
            "steps": [{"type": "sql", "id": "unsafe", "sql": "DROP TABLE x"}],
            "output": "unsafe",
        },
    }
    rejected = client.post("/api/v1/tabular-runs", json=raw_sql)
    assert rejected.status_code == 422


def test_active_tabular_run_blocks_source_deletion_until_canceled(client):
    source = _ingest_csv(client, "active.csv", b"id,value\n1,A\n")
    request = {
        "name": "Active run",
        "output_name": "active-result.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": source["id"]}],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [{"name": "id", "expression": _column("id")}],
                }
            ],
            "output": "selected",
        },
    }
    accepted = client.post("/api/v1/tabular-runs", json=request)
    run = accepted.json()["data"]["run"]

    blocked = client.delete(f"/api/v1/sources/{source['id']}")
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "source_tabular_run_active"

    canceled = client.post(f"/api/v1/tabular-runs/{run['id']}/cancel")
    assert canceled.status_code == 200
    assert canceled.json()["data"]["job"]["status"] == "canceled"

    deleted = client.delete(f"/api/v1/sources/{source['id']}")
    assert deleted.status_code == 204


def test_xlsx_sheet_can_feed_typed_tabular_run(client):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Invoices"
    sheet.append(["REPORT"])
    sheet.append(["folio", "amount"])
    sheet.append(["A-1", 100])
    sheet.append(["A-2", 200])
    buffer = io.BytesIO()
    workbook.save(buffer)
    workbook.close()

    response = client.post(
        "/api/v1/sources/ingest",
        files={
            "file": (
                "invoices.xlsx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    source = response.json()["data"]
    request = {
        "name": "Invoice projection",
        "output_name": "invoice-projection.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [
                {
                    "alias": "invoices",
                    "source_id": source["id"],
                    "sheet_name": "Invoices",
                }
            ],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "invoices",
                    "columns": [
                        {"name": "folio", "expression": _column("folio")},
                        {
                            "name": "amount",
                            "expression": _cast_integer(_column("amount")),
                        },
                    ],
                }
            ],
            "output": "selected",
        },
    }
    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text
    run = accepted.json()["data"]["run"]
    _run_once(client)

    completed = client.get(f"/api/v1/tabular-runs/{run['id']}").json()["data"]
    assert completed["job"]["status"] == "succeeded"
    preview = client.get(
        f"/api/v1/sources/{run['output_source_id']}/preview",
        params={"limit": 10},
    ).json()["data"]
    assert preview["rows"] == [["A-1", "100"], ["A-2", "200"]]


def test_union_distinct_functions_and_limit_are_composable(client):
    first = _ingest_csv(
        client,
        "first.csv",
        b"id,value\n1,alpha\n2,beta\n2,beta\n",
    )
    second = _ingest_csv(
        client,
        "second.csv",
        b"id,value\n2,beta\n3,gamma\n",
    )
    request = {
        "name": "Reusable composition",
        "output_name": "composed.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [
                {"alias": "first", "source_id": first["id"]},
                {"alias": "second", "source_id": second["id"]},
            ],
            "steps": [
                {
                    "type": "union",
                    "id": "combined",
                    "inputs": ["first", "second"],
                    "all": True,
                },
                {
                    "type": "distinct",
                    "id": "unique_rows",
                    "input": "combined",
                },
                {
                    "type": "select",
                    "id": "normalized",
                    "input": "unique_rows",
                    "columns": [
                        {"name": "id", "expression": _cast_integer(_column("id"))},
                        {
                            "name": "value",
                            "expression": {
                                "kind": "function",
                                "operator": "upper",
                                "arguments": [_column("value")],
                            },
                        },
                    ],
                },
                {
                    "type": "sort",
                    "id": "ordered",
                    "input": "normalized",
                    "keys": [{"expression": _column("id")}],
                },
                {
                    "type": "limit",
                    "id": "first_two",
                    "input": "ordered",
                    "rows": 2,
                },
            ],
            "output": "first_two",
        },
    }

    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text
    run = accepted.json()["data"]["run"]
    _run_once(client)

    completed = client.get(f"/api/v1/tabular-runs/{run['id']}").json()["data"]
    assert completed["job"]["status"] == "succeeded"
    preview = client.get(
        f"/api/v1/sources/{run['output_source_id']}/preview",
        params={"limit": 10},
    ).json()["data"]
    assert preview["rows"] == [["1", "ALPHA"], ["2", "BETA"]]


def test_invalid_data_cast_fails_permanently_without_automatic_retry(client):
    source = _ingest_csv(client, "invalid.csv", b"amount\nnot-a-number\n")
    request = {
        "name": "Invalid cast",
        "output_name": "invalid-cast.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": source["id"]}],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [
                        {
                            "name": "amount",
                            "expression": _cast_integer(_column("amount")),
                        }
                    ],
                }
            ],
            "output": "selected",
        },
    }

    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text
    job_id = accepted.json()["data"]["job"]["id"]
    _run_once(client)

    job = client.get(f"/api/v1/jobs/{job_id}").json()["data"]
    assert job["status"] == "failed"
    assert job["attempt_count"] == 1
    assert job["error_code"] == "tabular_plan_execution_invalid"
    assert job["available_at"] is not None


def test_lineage_snapshot_detects_profile_reinterpretation_before_retry(client):
    source = _ingest_csv(
        client,
        "header-change.csv",
        b"REPORT\nid,value\n1,A\n2,B\n",
    )
    assert source["sheets"][0]["header_row_number"] == 2
    request = {
        "name": "Header-sensitive run",
        "output_name": "header-sensitive.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": source["id"]}],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [
                        {"name": "id", "expression": _column("id")},
                        {"name": "value", "expression": _column("value")},
                    ],
                }
            ],
            "output": "selected",
        },
    }

    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text
    run = accepted.json()["data"]["run"]
    assert run["inputs"][0]["header_row_number"] == 2
    assert [item["name"] for item in run["inputs"][0]["columns"]] == [
        "id",
        "value",
    ]

    canceled = client.post(f"/api/v1/tabular-runs/{run['id']}/cancel")
    assert canceled.status_code == 200

    reprofiling = client.post(
        f"/api/v1/sources/{source['id']}/reprofile",
        json={"header_rows": {"*": 3}},
    )
    assert reprofiling.status_code == 200, reprofiling.text
    assert reprofiling.json()["data"]["sheets"][0]["header_row_number"] == 3

    retried = client.post(f"/api/v1/tabular-runs/{run['id']}/retry")
    assert retried.status_code == 202, retried.text
    _run_once(client)

    job = client.get(f"/api/v1/jobs/{run['job_id']}").json()["data"]
    assert job["status"] == "failed"
    assert job["error_code"] == "tabular_input_lineage_changed"


def test_source_profile_operations_and_expression_shapes_are_guarded(client):
    source = _ingest_csv(client, "guarded.csv", b"id,value\n1,A\n")
    request = {
        "name": "Guarded run",
        "output_name": "guarded.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": source["id"]}],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [{"name": "id", "expression": _column("id")}],
                }
            ],
            "output": "selected",
        },
    }
    accepted = client.post("/api/v1/tabular-runs", json=request)
    assert accepted.status_code == 202, accepted.text

    blocked = client.post(
        f"/api/v1/sources/{source['id']}/reprofile-async",
        json={"header_rows": {}},
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "source_tabular_run_active"

    invalid = request | {
        "name": "Invalid expression shape",
        "output_name": "invalid-expression.parquet",
        "plan": {
            **request["plan"],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [
                        {
                            "name": "id",
                            "expression": {
                                "kind": "column",
                                "column": "id",
                                "value": 123,
                            },
                        }
                    ],
                }
            ],
        },
    }
    rejected = client.post("/api/v1/tabular-runs", json=invalid)
    assert rejected.status_code == 422


def test_source_with_active_profile_job_cannot_enter_tabular_run(client):
    response = client.post(
        "/api/v1/sources/ingest-async",
        files={"file": ("pending.csv", b"id,value\n1,A\n", "text/csv")},
    )
    assert response.status_code == 202, response.text
    source = response.json()["data"]["source"]
    request = {
        "name": "Blocked by active source job",
        "output_name": "blocked.parquet",
        "plan": {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": source["id"]}],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [{"name": "id", "expression": _column("id")}],
                }
            ],
            "output": "selected",
        },
    }

    blocked = client.post("/api/v1/tabular-runs", json=request)
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "tabular_input_job_active"
