from pathlib import Path
from typing import Protocol

from backend.app.domain.models import (
    ProfileOptions,
    SheetProfile,
    SourcePreview,
)


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

    def preview(
        self,
        path: Path,
        *,
        source_id: str,
        sheet: SheetProfile,
        offset: int,
        limit: int,
    ) -> SourcePreview: ...
