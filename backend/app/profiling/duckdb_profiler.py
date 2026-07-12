import csv
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

import duckdb

from backend.app.core.config import Settings
from backend.app.core.errors import InvalidSourceError
from backend.app.domain.models import (
    ColumnProfile,
    HeaderCandidate,
    ProfileOptions,
    SheetProfile,
)
from backend.app.profiling.header_detection import (
    detect_header,
    infer_data_type,
    is_null,
    normalize_text,
)

_SAFE_VIEW = re.compile(r"[^a-zA-Z0-9_]")


def _quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


class DuckDBTabularProfiler:
    """Out-of-core profiler for CSV and Parquet sources."""

    name = "duckdb"
    supported_extensions = frozenset({".csv", ".parquet"})

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def profile(
        self,
        path: Path,
        *,
        source_id: str,
        options: ProfileOptions,
    ) -> list[SheetProfile]:
        extension = path.suffix.lower()
        if extension == ".csv":
            return [
                self._profile_csv(
                    path,
                    source_id=source_id,
                    options=options,
                )
            ]
        if extension == ".parquet":
            return [
                self._profile_parquet(
                    path,
                    source_id=source_id,
                )
            ]
        raise InvalidSourceError(
            "The selected profiling engine does not support this source.",
            code="unsupported_profile_engine",
        )

    def _connect(self, source_id: str) -> duckdb.DuckDBPyConnection:
        work_dir = self._settings.work_storage / source_id
        work_dir.mkdir(parents=True, exist_ok=True)
        connection = duckdb.connect(database=":memory:")
        escaped = work_dir.as_posix().replace("'", "''")
        connection.execute(f"SET temp_directory='{escaped}'")
        connection.execute(f"SET memory_limit='{self._settings.duckdb_memory_limit}'")
        connection.execute(f"SET threads={self._settings.duckdb_threads}")
        return connection

    def _profile_csv(
        self,
        path: Path,
        *,
        source_id: str,
        options: ProfileOptions,
    ) -> SheetProfile:
        encoding, delimiter, sampled_rows = self._sample_csv(path)
        detection = detect_header(sampled_rows)
        sheet_name = path.stem
        explicit_header = options.header_for(sheet_name)
        header_row = explicit_header or detection.row_number or 1

        connection = self._connect(source_id)
        try:
            try:
                relation = connection.read_csv(
                    str(path),
                    header=True,
                    delimiter=delimiter,
                    skiprows=header_row - 1,
                    all_varchar=True,
                    encoding=("utf-8" if encoding.startswith("utf-8") else "latin-1"),
                )
            except Exception as exc:
                raise InvalidSourceError(
                    "The CSV file could not be parsed.",
                    code="csv_parse_failed",
                    details={
                        "encoding": encoding,
                        "delimiter": delimiter,
                        "header_row_number": header_row,
                    },
                ) from exc

            return self._profile_relation(
                connection,
                relation,
                sheet_name=sheet_name,
                header_row_number=header_row,
                header_confidence=(1.0 if explicit_header else detection.confidence),
                header_candidates=detection.candidates,
            )
        finally:
            connection.close()

    def _profile_parquet(
        self,
        path: Path,
        *,
        source_id: str,
    ) -> SheetProfile:
        connection = self._connect(source_id)
        try:
            try:
                relation = connection.read_parquet(str(path))
            except Exception as exc:
                raise InvalidSourceError(
                    "The Parquet file could not be opened.",
                    code="parquet_parse_failed",
                ) from exc

            return self._profile_relation(
                connection,
                relation,
                sheet_name=path.stem,
                header_row_number=None,
                header_confidence=None,
                header_candidates=[],
            )
        finally:
            connection.close()

    def _profile_relation(
        self,
        connection: duckdb.DuckDBPyConnection,
        relation: duckdb.DuckDBPyRelation,
        *,
        sheet_name: str,
        header_row_number: int | None,
        header_confidence: float | None,
        header_candidates: list[HeaderCandidate],
    ) -> SheetProfile:
        view_name = _SAFE_VIEW.sub(
            "_",
            f"auditflow_{uuid4().hex}",
        )
        relation.create_view(view_name, replace=True)
        quoted_view = _quote_identifier(view_name)
        columns = list(relation.columns)
        row_count = int(
            connection.execute(f"SELECT COUNT(*) FROM {quoted_view}").fetchone()[0]
        )

        duplicate_row_count = 0
        if row_count:
            distinct_count = int(
                connection.execute(
                    f"SELECT COUNT(*) FROM (SELECT DISTINCT * FROM {quoted_view})"
                ).fetchone()[0]
            )
            duplicate_row_count = row_count - distinct_count

        column_profiles: list[ColumnProfile] = []
        total_nulls = 0

        for position, column_name in enumerate(columns, start=1):
            quoted = _quote_identifier(column_name)
            null_count, distinct_count = connection.execute(
                "SELECT "
                f"COUNT(*) FILTER (WHERE {quoted} IS NULL), "
                f"COUNT(DISTINCT {quoted}) "
                f"FROM {quoted_view}"
            ).fetchone()
            null_count = int(null_count)
            distinct_count = int(distinct_count)
            non_null_count = row_count - null_count
            total_nulls += null_count

            raw_samples = connection.execute(
                f"SELECT DISTINCT {quoted} "
                f"FROM {quoted_view} "
                f"WHERE {quoted} IS NOT NULL "
                f"LIMIT {self._settings.profile_sample_values}"
            ).fetchall()
            samples: list[Any] = [
                row[0] for row in raw_samples if row and not is_null(row[0])
            ]

            column_profiles.append(
                ColumnProfile(
                    name=column_name,
                    position=position,
                    data_type=infer_data_type(samples),
                    null_count=null_count,
                    non_null_count=non_null_count,
                    null_percentage=(
                        round((null_count / row_count) * 100, 4) if row_count else 0.0
                    ),
                    distinct_count=distinct_count,
                    sample_values=[normalize_text(value) for value in samples],
                )
            )

        total_cells = row_count * len(columns)
        return SheetProfile(
            name=sheet_name,
            header_row_number=header_row_number,
            header_confidence=header_confidence,
            header_candidates=header_candidates,
            row_count=row_count,
            column_count=len(columns),
            duplicate_row_count=duplicate_row_count,
            total_cell_count=total_cells,
            null_cell_count=total_nulls,
            null_percentage=(
                round((total_nulls / total_cells) * 100, 4) if total_cells else 0.0
            ),
            columns=column_profiles,
        )

    def _sample_csv(
        self,
        path: Path,
    ) -> tuple[str, str, list[list[str]]]:
        last_error: UnicodeDecodeError | None = None

        for encoding in ("utf-8-sig", "utf-8", "cp1252"):
            try:
                with path.open(
                    "r",
                    encoding=encoding,
                    errors="strict",
                    newline="",
                ) as source:
                    sample_text = source.read(65536)
                    if "\x00" in sample_text:
                        raise InvalidSourceError(
                            "The CSV contains binary null bytes.",
                            code="binary_csv",
                        )

                    try:
                        dialect = csv.Sniffer().sniff(
                            sample_text,
                            delimiters=",;\t|",
                        )
                        delimiter = dialect.delimiter
                    except csv.Error:
                        delimiter = ","

                    source.seek(0)
                    reader = csv.reader(
                        source,
                        delimiter=delimiter,
                    )
                    rows: list[list[str]] = []
                    for row in reader:
                        rows.append(row)
                        if len(rows) >= self._settings.header_scan_rows:
                            break

                    return encoding, delimiter, rows
            except UnicodeDecodeError as exc:
                last_error = exc

        raise InvalidSourceError(
            "The CSV encoding is not supported. Use UTF-8 or Windows-1252.",
            code="unsupported_csv_encoding",
        ) from last_error
