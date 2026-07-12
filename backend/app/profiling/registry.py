from pathlib import Path

from backend.app.core.errors import InvalidSourceError
from backend.app.profiling.contracts import SourceProfiler


class ProfilerRegistry:
    def __init__(self, profilers: list[SourceProfiler]) -> None:
        self._profilers = tuple(profilers)

    @property
    def supported_extensions(self) -> frozenset[str]:
        return frozenset(
            extension
            for profiler in self._profilers
            for extension in profiler.supported_extensions
        )

    def resolve(self, path: Path) -> SourceProfiler:
        extension = path.suffix.lower()
        for profiler in self._profilers:
            if extension in profiler.supported_extensions:
                return profiler

        raise InvalidSourceError(
            "The source format is not supported.",
            code="unsupported_source_format",
            status_code=400,
            details={
                "extension": extension,
                "supported_extensions": sorted(self.supported_extensions),
            },
        )
