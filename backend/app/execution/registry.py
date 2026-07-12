from backend.app.execution.contracts import JobExecutor


class JobExecutorRegistry:
    def __init__(self, executors: list[JobExecutor]) -> None:
        registry: dict[str, JobExecutor] = {}
        for executor in executors:
            if executor.job_type in registry:
                raise ValueError(
                    f"Duplicate job executor registration: {executor.job_type}"
                )
            registry[executor.job_type] = executor
        self._executors = registry

    @property
    def supported_types(self) -> frozenset[str]:
        return frozenset(self._executors)

    def supports(self, job_type: str) -> bool:
        return job_type in self._executors

    def resolve(self, job_type: str) -> JobExecutor:
        try:
            return self._executors[job_type]
        except KeyError as exc:
            raise KeyError(f"No executor is registered for {job_type}.") from exc
