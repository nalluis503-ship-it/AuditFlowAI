import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from starlette.datastructures import Headers, UploadFile

from backend.app.services.source_ingestion import ingest_source_file


class SourceIngestionTests(unittest.IsolatedAsyncioTestCase):
    async def test_stores_file_hash_and_persisted_profile(self):
        content = (
            b"id,name,amount\n"
            b"1,Ana,10\n"
            b"2,,20\n"
            b"2,,20\n"
        )

        with tempfile.TemporaryDirectory() as directory:
            storage_root = Path(directory)
            source_storage = storage_root / "sources"
            profile_storage = storage_root / "profiles"

            upload = UploadFile(
                file=io.BytesIO(content),
                filename="payments.csv",
                headers=Headers(
                    {"content-type": "text/csv"}
                ),
            )

            with (
                patch(
                    "backend.app.services.source_ingestion."
                    "SOURCE_STORAGE",
                    source_storage,
                ),
                patch(
                    "backend.app.services.source_ingestion."
                    "PROFILE_STORAGE",
                    profile_storage,
                ),
            ):
                profile = await ingest_source_file(upload)

            stored_file = (
                source_storage / f"{profile.id}.csv"
            )
            persisted_file = (
                profile_storage / f"{profile.id}.json"
            )

            self.assertTrue(stored_file.is_file())
            self.assertTrue(persisted_file.is_file())
            self.assertEqual(stored_file.read_bytes(), content)
            self.assertEqual(profile.original_name, "payments.csv")
            self.assertEqual(profile.extension, "csv")
            self.assertEqual(profile.media_type, "text/csv")
            self.assertEqual(profile.size_bytes, len(content))
            self.assertEqual(
                profile.sha256,
                hashlib.sha256(content).hexdigest(),
            )
            self.assertEqual(profile.sheets[0].row_count, 3)
            self.assertEqual(
                profile.sheets[0].duplicate_row_count,
                1,
            )

            persisted = json.loads(
                persisted_file.read_text(encoding="utf-8")
            )

            self.assertEqual(persisted["id"], profile.id)
            self.assertEqual(
                persisted["sha256"],
                profile.sha256,
            )
            self.assertEqual(
                persisted["sheets"],
                profile.model_dump(mode="json")["sheets"],
            )


if __name__ == "__main__":
    unittest.main()
