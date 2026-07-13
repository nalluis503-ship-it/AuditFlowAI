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
    SourcePreview,
)
from backend.app.profiling.csv_format import inspect_csv_format
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

    def preview(
        self,
        path: Path,
        *,
        source_id: str,
        sheet: SheetProfile,
        offset: int,
        limit: int,
    ) -> SourcePreview:
        extension = path.suffix.lower()
        connection = self._connect(source_id)
        try:
            if extension == ".csv":
                csv_format = inspect_csv_format(
                    path, scan_rows=self._settings.header_scan_rows
                )
                try:
                    relation = connection.read_csv(
                        str(path),
                        header=True,
                        delimiter=csv_format.delimiter,
                        skiprows=(sheet.header_row_number or 1) - 1,
                        all_varchar=True,
                        encoding=(csv_format.duckdb_encoding),
                    )
                except Exception as exc:
                    raise InvalidSourceError(
                        "The CSV preview could not be created.",
                        code="csv_preview_failed",
                    ) from exc
            elif extension == ".parquet":
                try:
                    relation = connection.read_parquet(str(path))
                except Exception as exc:
                    raise InvalidSourceError(
                        "The Parquet preview could not be created.",
                        code="parquet_preview_failed",
                    ) from exc
            else:
                raise InvalidSourceError(
                    "The selected preview engine does not support this source.",
                    code="unsupported_preview_engine",
                )

            view_name = _SAFE_VIEW.sub("_", f"preview_{uuid4().hex}")
            relation.create_view(view_name, replace=True)
            quoted_view = _quote_identifier(view_name)
            raw_rows = connection.execute(
                f"SELECT * FROM {quoted_view} LIMIT ? OFFSET ?",
                [limit, offset],
            ).fetchall()
            rows = [
                [None if is_null(value) else normalize_text(value) for value in row]
                for row in raw_rows
            ]
            return SourcePreview(
                source_id=source_id,
                sheet_name=sheet.name,
                columns=list(relation.columns),
                rows=rows,
                offset=offset,
                limit=limit,
                returned=len(rows),
                total_rows=sheet.row_count,
            )
        finally:
            connection.close()

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
        csv_format = inspect_csv_format(path, scan_rows=self._settings.header_scan_rows)
        detection = detect_header(csv_format.sampled_rows)
        sheet_name = path.stem
        explicit_header = options.header_for(sheet_name)
        header_row = explicit_header or detection.row_number or 1

        connection = self._connect(source_id)
        try:
            try:
                relation = connection.read_csv(
                    str(path),
                    header=True,
                    delimiter=csv_format.delimiter,
                    skiprows=header_row - 1,
                    all_varchar=True,
                    encoding=csv_format.duckdb_encoding,
                )
            except Exception as exc:
                raise InvalidSourceError(
                    "The CSV file could not be parsed.",
                    code="csv_parse_failed",
                    details={
                        "encoding": csv_format.encoding,
                        "delimiter": csv_format.delimiter,
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
