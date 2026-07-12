from pathlib import Path
from typing import Protocol

from backend.app.domain.models import ProfileOptions, SheetProfile


class SourceProfiler(Protocol):
    name: str
    supported_extensions: frozenset[str]

    def profile(
        self,
        path: Path,
        *,
        source_id: str,
        options: ProfileOptions,
    ) -> list[SheetProfile]: ...
