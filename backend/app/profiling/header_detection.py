from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

from backend.app.domain.models import HeaderCandidate


def is_null(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def normalize_text(value: Any) -> str:
    if is_null(value):
        return ""
    if isinstance(value, datetime | date | time):
        return value.isoformat()
    return str(value).strip()


@dataclass(frozen=True, slots=True)
class HeaderDetection:
    row_number: int | None
    confidence: float | None
    candidates: list[HeaderCandidate]


def detect_header(
    rows: list[list[Any]],
    *,
    max_candidates: int = 3,
) -> HeaderDetection:
    if not rows:
        return HeaderDetection(None, None, [])

    width = max((len(row) for row in rows), default=0)
    if width == 0:
        return HeaderDetection(None, None, [])

    scored: list[tuple[float, int, list[Any]]] = []

    for index, row in enumerate(rows):
        non_empty = [value for value in row if not is_null(value)]
        if not non_empty:
            continue

        non_empty_ratio = len(non_empty) / width
        unique_ratio = len(
            {normalize_text(value).casefold() for value in non_empty}
        ) / len(non_empty)
        text_ratio = sum(
            isinstance(value, str) and bool(value.strip()) for value in non_empty
        ) / len(non_empty)

        following = rows[index + 1 : index + 4]
        following_density = 0.0
        if following:
            following_density = sum(
                sum(not is_null(value) for value in candidate) / width
                for candidate in following
            ) / len(following)

        score = (
            non_empty_ratio * 0.35
            + unique_ratio * 0.20
            + text_ratio * 0.20
            + following_density * 0.25
        )

        if len(non_empty) <= 1:
            score *= 0.35
        if not following:
            score *= 0.60

        scored.append((score, index + 1, row))

    if not scored:
        return HeaderDetection(None, None, [])

    scored.sort(key=lambda item: (-item[0], item[1]))
    candidates = [
        HeaderCandidate(
            row_number=row_number,
            confidence=round(max(0.0, min(score, 1.0)), 4),
            values=[normalize_text(value) for value in row if not is_null(value)][:12],
        )
        for score, row_number, row in scored[:max_candidates]
    ]

    best = candidates[0]
    return HeaderDetection(
        row_number=best.row_number,
        confidence=best.confidence,
        candidates=candidates,
    )


def build_column_names(
    header_values: list[Any],
    width: int,
) -> list[str]:
    names: list[str] = []
    occurrences: dict[str, int] = {}

    for index in range(width):
        value = header_values[index] if index < len(header_values) else None
        base = normalize_text(value) if not is_null(value) else f"column_{index + 1}"
        occurrence = occurrences.get(base, 0) + 1
        occurrences[base] = occurrence
        names.append(base if occurrence == 1 else f"{base}_{occurrence}")

    return names


def infer_data_type(values: list[Any]) -> str:
    normalized = [value for value in values if not is_null(value)]
    if not normalized:
        return "unknown"

    allowed_bool = {
        "true",
        "false",
        "yes",
        "no",
        "si",
        "sí",
        "0",
        "1",
    }
    if all(normalize_text(value).casefold() in allowed_bool for value in normalized):
        return "boolean"

    try:
        for value in normalized:
            int(normalize_text(value))
        return "integer"
    except (TypeError, ValueError):
        pass

    try:
        for value in normalized:
            float(normalize_text(value).replace(",", ""))
        return "decimal"
    except (TypeError, ValueError):
        pass

    if all(isinstance(value, datetime) for value in normalized):
        return "datetime"
    if all(isinstance(value, date) for value in normalized):
        return "date"
    return "text"
