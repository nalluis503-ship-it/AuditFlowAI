import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

from backend.app.services.source_ingestion import (
    SourceIngestionError,
    profile_source_path,
)


class SourceProfilingTests(unittest.TestCase):
    def test_profiles_csv_with_real_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "payments.csv"
            path.write_text(
                "id,name,amount\n"
                "1,Ana,10\n"
                "2,,20\n"
                "2,,20\n",
                encoding="utf-8",
            )

            sheets = profile_source_path(path, ".csv")
            profile = sheets[0]

            self.assertEqual(profile.name, "payments")
            self.assertEqual(profile.header_row_number, 1)
            self.assertEqual(profile.row_count, 3)
            self.assertEqual(profile.column_count, 3)
            self.assertEqual(profile.duplicate_row_count, 1)
            self.assertEqual(
                [column.name for column in profile.columns],
                ["id", "name", "amount"],
            )
            self.assertEqual(profile.columns[1].null_count, 2)
            self.assertEqual(profile.columns[1].non_null_count, 1)

    def test_profiles_each_xlsx_sheet(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "audit.xlsx"
            workbook = Workbook()

            first_sheet = workbook.active
            first_sheet.title = "Invoices"
            first_sheet.append(["folio", "amount"])
            first_sheet.append(["A-1", 100])
            first_sheet.append(["A-1", 100])

            second_sheet = workbook.create_sheet("Empty")
            second_sheet.append(["code", "description"])

            workbook.save(path)
            workbook.close()

            sheets = profile_source_path(path, ".xlsx")

            self.assertEqual(len(sheets), 2)
            self.assertEqual(sheets[0].name, "Invoices")
            self.assertEqual(sheets[0].row_count, 2)
            self.assertEqual(sheets[0].duplicate_row_count, 1)
            self.assertEqual(sheets[1].name, "Empty")
            self.assertEqual(sheets[1].row_count, 0)
            self.assertEqual(sheets[1].column_count, 2)

    def test_rejects_unsupported_extension(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "notes.txt"
            path.write_text("not tabular", encoding="utf-8")

            with self.assertRaises(SourceIngestionError):
                profile_source_path(path, ".txt")


if __name__ == "__main__":
    unittest.main()
