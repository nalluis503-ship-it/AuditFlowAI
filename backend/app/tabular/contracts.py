from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from backend.app.domain.models import SheetProfile, SourceRecord
from backend.app.domain.tabular_models import TabularPlan

ProgressReporter = Callable[[float, str | None, str | None], None]
CancellationCheck = Callable[[], None]


@dataclass(frozen=True, slots=True)
class ResolvedTabularInput:
    alias: str
    source: SourceRecord
    sheet: SheetProfile


@dataclass(frozen=True, slots=True)
class MaterializedTabularResult:
    path: Path
    engine: str
    output_columns: tuple[str, ...]


class TabularEngine(Protocol):
    name: str

    def materialize(
        self,
        plan: TabularPlan,
        *,
        run_id: str,
        inputs: list[ResolvedTabularInput],
        report_progress: ProgressReporter,
        check_cancelled: CancellationCheck,
    ) -> MaterializedTabularResult: ...

    def cleanup(self, run_id: str) -> None: ...
