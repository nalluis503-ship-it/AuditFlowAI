import csv
from dataclasses import dataclass
from pathlib import Path

from backend.app.core.errors import InvalidSourceError


@dataclass(frozen=True, slots=True)
class CsvFormat:
    encoding: str
    delimiter: str
    sampled_rows: list[list[str]]

    @property
    def duckdb_encoding(self) -> str:
        return "utf-8" if self.encoding.startswith("utf-8") else "latin-1"


def inspect_csv_format(path: Path, *, scan_rows: int) -> CsvFormat:
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
                reader = csv.reader(source, delimiter=delimiter)
                rows: list[list[str]] = []
                for row in reader:
                    rows.append(row)
                    if len(rows) >= scan_rows:
                        break

                return CsvFormat(
                    encoding=encoding,
                    delimiter=delimiter,
                    sampled_rows=rows,
                )
        except UnicodeDecodeError as exc:
            last_error = exc

    raise InvalidSourceError(
        "The CSV encoding is not supported. Use UTF-8 or Windows-1252.",
        code="unsupported_csv_encoding",
    ) from last_error
