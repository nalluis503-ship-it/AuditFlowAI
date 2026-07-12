import io

import pyarrow as pa
import pyarrow.parquet as pq
from openpyxl import Workbook


def _xlsx_bytes() -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Invoices"
    sheet.append(["REPORT"])
    sheet.append(["folio", "amount"])
    sheet.append(["A-1", 100])
    sheet.append(["A-1", 100])

    buffer = io.BytesIO()
    workbook.save(buffer)
    workbook.close()
    return buffer.getvalue()


def test_profiles_xlsx_with_streaming_engine(client):
    response = client.post(
        "/api/v1/sources/ingest",
        files={
            "file": (
                "audit.xlsx",
                _xlsx_bytes(),
                ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            )
        },
    )

    assert response.status_code == 201
    sheet = response.json()["data"]["sheets"][0]
    assert sheet["header_row_number"] == 2
    assert sheet["row_count"] == 2
    assert sheet["duplicate_row_count"] == 1


def test_profiles_parquet(client):
    table = pa.table(
        {
            "id": [1, 2, 2],
            "amount": [10, None, None],
        }
    )
    buffer = io.BytesIO()
    pq.write_table(table, buffer)

    response = client.post(
        "/api/v1/sources/ingest",
        files={
            "file": (
                "payments.parquet",
                buffer.getvalue(),
                "application/vnd.apache.parquet",
            )
        },
    )

    assert response.status_code == 201
    sheet = response.json()["data"]["sheets"][0]
    assert sheet["row_count"] == 3
    assert sheet["column_count"] == 2
    assert sheet["duplicate_row_count"] == 1
    assert sheet["null_cell_count"] == 2
