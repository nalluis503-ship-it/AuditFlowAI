from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from backend.app.application.cancellation import OperationCancelled
from backend.app.application.source_service import SourceService
from backend.app.core.config import Settings
from backend.app.core.errors import (
    AuditFlowError,
    InvalidSourceError,
    ResourceNotFoundError,
)
from backend.app.domain.job_models import JobStatus
from backend.app.domain.job_repositories import JobRepository
from backend.app.domain.models import (
    ProfileOptions,
    SheetProfile,
    SourceRecord,
    SourceStatus,
)
from backend.app.domain.tabular_models import (
    TabularColumnSnapshot,
    TabularExecutionResult,
    TabularPlan,
    TabularRunInputRecord,
    TabularRunRecord,
)
from backend.app.domain.tabular_repositories import TabularRunRepository
from backend.app.tabular.compiler import TabularPlanCompiler
from backend.app.tabular.contracts import (
    CancellationCheck,
    ProgressReporter,
    ResolvedTabularInput,
    TabularEngine,
)


class TabularRunService:
    def __init__(
        self,
        *,
        repository: TabularRunRepository,
        job_repository: JobRepository,
        source_service: SourceService,
        engine: TabularEngine,
        settings: Settings,
    ) -> None:
        self._repository = repository
        self._job_repository = job_repository
        self._source_service = source_service
        self._engine = engine
        self._settings = settings
        self._compiler = TabularPlanCompiler()

    def create(
        self,
        *,
        name: str,
        output_name: str,
        plan: TabularPlan,
        idempotency_key: str | None,
    ) -> TabularRunRecord:
        normalized_name = name.strip()
        if not normalized_name:
            raise InvalidSourceError(
                "A tabular run must have a name.",
                code="missing_tabular_run_name",
                status_code=422,
            )
        resolved_output_name = output_name.strip()
        if not resolved_output_name.lower().endswith(".parquet"):
            resolved_output_name += ".parquet"
        safe_output_name, extension = self._source_service.normalize_source_name(
            resolved_output_name
        )
        if extension != ".parquet":
            raise InvalidSourceError(
                "Tabular runs currently materialize Parquet outputs.",
                code="invalid_tabular_output_format",
                status_code=422,
            )

        normalized_idempotency_key = None
        if idempotency_key is not None:
            normalized_idempotency_key = idempotency_key.strip()
            if not normalized_idempotency_key:
                raise InvalidSourceError(
                    "The tabular idempotency key cannot be blank.",
                    code="invalid_tabular_idempotency_key",
                    status_code=422,
                )

        self._validate_limits(plan)
        resolved_inputs = self._resolve_inputs(plan)
        input_schemas = {
            item.alias: [column.name for column in item.sheet.columns]
            for item in resolved_inputs
        }
        self._compiler.compile(
            plan,
            input_views={
                item.alias: f"validation_input_{position}"
                for position, item in enumerate(resolved_inputs, start=1)
            },
            input_schemas=input_schemas,
        )

        canonical = json.dumps(
            {
                "name": normalized_name,
                "output_name": safe_output_name,
                "plan": plan.model_dump(mode="json"),
            },
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        )
        plan_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

        if normalized_idempotency_key:
            existing = self._repository.get_by_idempotency_key(
                normalized_idempotency_key
            )
            if existing is not None:
                if existing.plan_hash != plan_hash:
                    raise AuditFlowError(
                        "The idempotency key belongs to a different tabular run.",
                        code="tabular_idempotency_conflict",
                        status_code=409,
                        details={"run_id": existing.id},
                    )
                return existing

        now = datetime.now(UTC)
        run = TabularRunRecord(
            id=uuid4().hex,
            name=normalized_name,
            output_name=safe_output_name,
            plan=plan,
            plan_hash=plan_hash,
            inputs=[
                TabularRunInputRecord(
                    position=position,
                    alias=item.alias,
                    source_id=item.source.id,
                    sheet_name=item.sheet.name,
                    source_name=item.source.original_name,
                    source_sha256=item.source.sha256 or "",
                    source_size_bytes=item.source.size_bytes,
                    profile_version=item.source.profile.profile_version,
                    profile_engine=item.source.profile.profile_engine,
                    header_row_number=item.sheet.header_row_number,
                    columns=[
                        TabularColumnSnapshot(
                            position=column.position,
                            name=column.name,
                            data_type=column.data_type,
                        )
                        for column in item.sheet.columns
                    ],
                )
                for position, item in enumerate(resolved_inputs, start=1)
            ],
            output_source_id=uuid4().hex,
            idempotency_key=normalized_idempotency_key,
            created_at=now,
            updated_at=now,
        )
        created = self._repository.create(run)
        if created.plan_hash != plan_hash:
            raise AuditFlowError(
                "The idempotency key was claimed by a different tabular run.",
                code="tabular_idempotency_conflict",
                status_code=409,
                details={"run_id": created.id},
            )
        return created

    def attach_job(self, run_id: str, job_id: str) -> TabularRunRecord:
        run = self.get(run_id)
        if run.job_id and run.job_id != job_id:
            raise AuditFlowError(
                "The tabular run already has a different durable job.",
                code="tabular_run_job_conflict",
                status_code=409,
                details={"run_id": run_id, "job_id": run.job_id},
            )
        run.job_id = job_id
        run.updated_at = datetime.now(UTC)
        return self._repository.update(run)

    def get(self, run_id: str) -> TabularRunRecord:
        run = self._repository.get(run_id)
        if run is None:
            raise ResourceNotFoundError("tabular_run", run_id)
        return run

    def list(
        self,
        *,
        limit: int,
        offset: int,
    ) -> tuple[list[TabularRunRecord], int]:
        return (
            self._repository.list(limit=limit, offset=offset),
            self._repository.count(),
        )

    def ensure_source_is_idle(self, source_id: str) -> None:
        active: list[str] = []
        for job_id in self._repository.list_job_ids_for_source(source_id):
            job = self._job_repository.get(job_id)
            if job is not None and job.status in {JobStatus.QUEUED, JobStatus.RUNNING}:
                active.append(job_id)
        if active:
            raise AuditFlowError(
                "The source participates in an active tabular run.",
                code="source_tabular_run_active",
                status_code=409,
                details={"source_id": source_id, "job_ids": active},
            )

    def execute_sync(
        self,
        run_id: str,
        *,
        report_progress: ProgressReporter,
        check_cancelled: CancellationCheck,
    ) -> TabularExecutionResult:
        run = self.get(run_id)
        existing_output = self._try_get_source(run.output_source_id)
        if (
            existing_output is not None
            and existing_output.status == SourceStatus.READY
            and existing_output.profile is not None
        ):
            run.engine = run.engine or self._engine.name
            run.updated_at = datetime.now(UTC)
            self._repository.update(run)
            sheet = existing_output.profile.sheets[0]
            return TabularExecutionResult(
                run_id=run.id,
                output_source_id=existing_output.id,
                engine=run.engine,
                row_count=sheet.row_count,
                column_count=sheet.column_count,
                output_name=run.output_name,
            )
        if existing_output is not None:
            self._source_service.delete(existing_output.id)

        resolved_inputs = self._resolve_run_inputs(run)
        output_registered = False
        try:
            report_progress(
                5.0,
                "validating_inputs",
                "Validating source lineage and physical inputs.",
            )
            check_cancelled()
            materialized = self._engine.materialize(
                run.plan,
                run_id=run.id,
                inputs=resolved_inputs,
                report_progress=report_progress,
                check_cancelled=check_cancelled,
            )
            size_bytes, sha256 = self._hash_file(materialized.path)
            check_cancelled()
            report_progress(
                72.0,
                "registering_output",
                "Registering the derived source with immutable evidence.",
            )
            self._source_service.register_prepared_source(
                source_id=run.output_source_id,
                original_name=run.output_name,
                media_type="application/vnd.apache.parquet",
                prepared_path=materialized.path,
                size_bytes=size_bytes,
                sha256=sha256,
            )
            output_registered = True

            def output_profile_progress(
                percent: float,
                stage: str | None,
                message: str | None,
            ) -> None:
                mapped = 75.0 + (min(100.0, max(0.0, percent)) * 0.24)
                report_progress(
                    mapped,
                    f"profiling_output.{stage or 'working'}",
                    message,
                )

            profile = self._source_service.profile_sync(
                run.output_source_id,
                options=ProfileOptions(),
                report_progress=output_profile_progress,
                check_cancelled=check_cancelled,
            )
            if len(profile.sheets) != 1:
                raise InvalidSourceError(
                    "A derived Parquet source must contain one tabular dataset.",
                    code="invalid_derived_source_profile",
                    status_code=500,
                )
            sheet = profile.sheets[0]
            run.engine = materialized.engine
            run.updated_at = datetime.now(UTC)
            self._repository.update(run)
            report_progress(
                100.0,
                "completed",
                "The tabular run produced a traceable derived source.",
            )
            return TabularExecutionResult(
                run_id=run.id,
                output_source_id=run.output_source_id,
                engine=materialized.engine,
                row_count=sheet.row_count,
                column_count=sheet.column_count,
                output_name=run.output_name,
            )
        except OperationCancelled:
            if output_registered:
                self._source_service.delete(run.output_source_id)
            raise
        except Exception:
            if output_registered:
                self._source_service.delete(run.output_source_id)
            raise
        finally:
            self._engine.cleanup(run.id)

    def _resolve_inputs(self, plan: TabularPlan) -> list[ResolvedTabularInput]:
        return [
            self._resolve_input(
                alias=item.alias,
                source_id=item.source_id,
                requested_sheet=item.sheet_name,
            )
            for item in plan.inputs
        ]

    def _resolve_run_inputs(
        self,
        run: TabularRunRecord,
    ) -> list[ResolvedTabularInput]:
        resolved: list[ResolvedTabularInput] = []
        for snapshot in run.inputs:
            item = self._resolve_input(
                alias=snapshot.alias,
                source_id=snapshot.source_id,
                requested_sheet=snapshot.sheet_name,
            )
            assert item.source.profile is not None
            current_columns = [
                TabularColumnSnapshot(
                    position=column.position,
                    name=column.name,
                    data_type=column.data_type,
                )
                for column in item.sheet.columns
            ]
            if (
                item.source.sha256 != snapshot.source_sha256
                or item.source.size_bytes != snapshot.source_size_bytes
                or item.source.original_name != snapshot.source_name
                or item.source.profile.profile_version != snapshot.profile_version
                or item.source.profile.profile_engine != snapshot.profile_engine
                or item.sheet.header_row_number != snapshot.header_row_number
                or current_columns != snapshot.columns
            ):
                raise InvalidSourceError(
                    "A tabular input no longer matches the recorded lineage snapshot.",
                    code="tabular_input_lineage_changed",
                    status_code=409,
                    details={"source_id": snapshot.source_id},
                )
            resolved.append(item)
        return resolved

    def _resolve_input(
        self,
        *,
        alias: str,
        source_id: str,
        requested_sheet: str | None,
    ) -> ResolvedTabularInput:
        if self._job_repository.has_active_for_resource(
            resource_type="source",
            resource_id=source_id,
        ):
            raise AuditFlowError(
                "A source cannot enter a tabular run while another durable "
                "source operation is active.",
                code="tabular_input_job_active",
                status_code=409,
                details={"source_id": source_id},
            )
        source = self._source_service.get(source_id)
        if source.status != SourceStatus.READY or source.profile is None:
            raise InvalidSourceError(
                "Every tabular input must have a ready verified profile.",
                code="tabular_input_not_ready",
                status_code=409,
                details={"source_id": source_id, "status": source.status.value},
            )
        if not source.sha256 or not source.stored_path:
            raise InvalidSourceError(
                "A tabular input is missing immutable storage evidence.",
                code="tabular_input_incomplete",
                status_code=409,
                details={"source_id": source_id},
            )
        sheet = self._select_sheet(source, requested_sheet)
        if not sheet.columns:
            raise InvalidSourceError(
                "The selected tabular input does not contain usable columns.",
                code="tabular_input_has_no_columns",
                status_code=409,
                details={"source_id": source_id, "sheet": sheet.name},
            )
        return ResolvedTabularInput(alias=alias, source=source, sheet=sheet)

    @staticmethod
    def _select_sheet(
        source: SourceRecord,
        requested_sheet: str | None,
    ) -> SheetProfile:
        assert source.profile is not None
        sheets = source.profile.sheets
        if requested_sheet is None:
            if len(sheets) != 1:
                raise InvalidSourceError(
                    "The source contains multiple sheets; select one explicitly.",
                    code="tabular_sheet_required",
                    status_code=422,
                    details={
                        "source_id": source.id,
                        "available_sheets": [sheet.name for sheet in sheets],
                    },
                )
            return sheets[0]
        selected = next(
            (sheet for sheet in sheets if sheet.name == requested_sheet), None
        )
        if selected is None:
            raise InvalidSourceError(
                "The requested tabular sheet does not exist.",
                code="source_sheet_not_found",
                status_code=404,
                details={
                    "source_id": source.id,
                    "sheet": requested_sheet,
                    "available_sheets": [sheet.name for sheet in sheets],
                },
            )
        return selected

    def _validate_limits(self, plan: TabularPlan) -> None:
        if len(plan.inputs) > self._settings.tabular_max_inputs:
            raise InvalidSourceError(
                "The tabular plan exceeds the configured input limit.",
                code="tabular_input_limit_exceeded",
                status_code=422,
                details={"maximum": self._settings.tabular_max_inputs},
            )
        if len(plan.steps) > self._settings.tabular_max_steps:
            raise InvalidSourceError(
                "The tabular plan exceeds the configured operation limit.",
                code="tabular_step_limit_exceeded",
                status_code=422,
                details={"maximum": self._settings.tabular_max_steps},
            )

    def _hash_file(self, path: Path) -> tuple[int, str]:
        digest = hashlib.sha256()
        size_bytes = 0
        with path.open("rb") as source:
            while chunk := source.read(self._settings.upload_chunk_bytes):
                size_bytes += len(chunk)
                digest.update(chunk)
        return size_bytes, digest.hexdigest()

    def _try_get_source(self, source_id: str) -> SourceRecord | None:
        try:
            return self._source_service.get(source_id)
        except ResourceNotFoundError:
            return None
