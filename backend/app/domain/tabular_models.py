from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_IDENTIFIER_PATTERN = r"^[A-Za-z][A-Za-z0-9_]{0,63}$"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class TabularScalarType(StrEnum):
    STRING = "string"
    INTEGER = "integer"
    DECIMAL = "decimal"
    BOOLEAN = "boolean"
    DATE = "date"
    TIMESTAMP = "timestamp"


class ExpressionKind(StrEnum):
    COLUMN = "column"
    LITERAL = "literal"
    CAST = "cast"
    UNARY = "unary"
    BINARY = "binary"
    FUNCTION = "function"


class ExpressionOperator(StrEnum):
    NOT = "not"
    NEGATE = "negate"

    ADD = "add"
    SUBTRACT = "subtract"
    MULTIPLY = "multiply"
    DIVIDE = "divide"
    MODULO = "modulo"
    CONCAT = "concat"

    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    GREATER_OR_EQUAL = "greater_or_equal"
    LESS_THAN = "less_than"
    LESS_OR_EQUAL = "less_or_equal"
    AND = "and"
    OR = "or"

    LOWER = "lower"
    UPPER = "upper"
    TRIM = "trim"
    LENGTH = "length"
    ABS = "abs"
    ROUND = "round"
    COALESCE = "coalesce"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"
    YEAR = "year"
    MONTH = "month"
    DAY = "day"


_UNARY_OPERATORS = {
    ExpressionOperator.NOT,
    ExpressionOperator.NEGATE,
}
_BINARY_OPERATORS = {
    ExpressionOperator.ADD,
    ExpressionOperator.SUBTRACT,
    ExpressionOperator.MULTIPLY,
    ExpressionOperator.DIVIDE,
    ExpressionOperator.MODULO,
    ExpressionOperator.CONCAT,
    ExpressionOperator.EQUALS,
    ExpressionOperator.NOT_EQUALS,
    ExpressionOperator.GREATER_THAN,
    ExpressionOperator.GREATER_OR_EQUAL,
    ExpressionOperator.LESS_THAN,
    ExpressionOperator.LESS_OR_EQUAL,
    ExpressionOperator.AND,
    ExpressionOperator.OR,
}
_FUNCTION_ARITY: dict[ExpressionOperator, tuple[int, int | None]] = {
    ExpressionOperator.LOWER: (1, 1),
    ExpressionOperator.UPPER: (1, 1),
    ExpressionOperator.TRIM: (1, 1),
    ExpressionOperator.LENGTH: (1, 1),
    ExpressionOperator.ABS: (1, 1),
    ExpressionOperator.ROUND: (1, 2),
    ExpressionOperator.COALESCE: (2, None),
    ExpressionOperator.CONTAINS: (2, 2),
    ExpressionOperator.STARTS_WITH: (2, 2),
    ExpressionOperator.ENDS_WITH: (2, 2),
    ExpressionOperator.IS_NULL: (1, 1),
    ExpressionOperator.IS_NOT_NULL: (1, 1),
    ExpressionOperator.YEAR: (1, 1),
    ExpressionOperator.MONTH: (1, 1),
    ExpressionOperator.DAY: (1, 1),
}


class TabularExpression(StrictModel):
    kind: ExpressionKind
    column: str | None = Field(default=None, min_length=1, max_length=512)
    value: Any = None
    data_type: TabularScalarType | None = None
    operator: ExpressionOperator | None = None
    arguments: list[TabularExpression] = Field(default_factory=list, max_length=32)

    @model_validator(mode="after")
    def validate_shape(self) -> TabularExpression:
        if self.kind == ExpressionKind.COLUMN:
            if not self.column:
                raise ValueError("A column expression requires a column name.")
            if (
                self.operator is not None
                or self.data_type is not None
                or self.arguments
                or self.value is not None
            ):
                raise ValueError("A column expression only accepts 'column'.")
            return self

        if self.kind == ExpressionKind.LITERAL:
            if self.column is not None or self.operator is not None:
                raise ValueError("A literal expression only accepts 'value'.")
            if self.data_type is not None or self.arguments:
                raise ValueError(
                    "A literal expression cannot cast or contain arguments."
                )
            if isinstance(self.value, dict | list | tuple | set):
                raise ValueError("Literal values must be scalar JSON values.")
            return self

        if self.kind == ExpressionKind.CAST:
            if self.data_type is None or len(self.arguments) != 1:
                raise ValueError(
                    "A cast expression requires one argument and data_type."
                )
            if (
                self.column is not None
                or self.operator is not None
                or self.value is not None
            ):
                raise ValueError(
                    "A cast expression cannot define column, operator, or value."
                )
            return self

        if self.kind == ExpressionKind.UNARY:
            if self.operator not in _UNARY_OPERATORS or len(self.arguments) != 1:
                raise ValueError(
                    "A unary expression requires a unary operator and one argument."
                )
            if (
                self.column is not None
                or self.data_type is not None
                or self.value is not None
            ):
                raise ValueError(
                    "A unary expression cannot define column, data_type, or value."
                )
            return self

        if self.kind == ExpressionKind.BINARY:
            if self.operator not in _BINARY_OPERATORS or len(self.arguments) != 2:
                raise ValueError(
                    "A binary expression requires a binary operator and two arguments."
                )
            if (
                self.column is not None
                or self.data_type is not None
                or self.value is not None
            ):
                raise ValueError(
                    "A binary expression cannot define column, data_type, or value."
                )
            return self

        if self.kind == ExpressionKind.FUNCTION:
            bounds = _FUNCTION_ARITY.get(self.operator)
            if bounds is None:
                raise ValueError("A function expression requires a supported function.")
            minimum, maximum = bounds
            if len(self.arguments) < minimum or (
                maximum is not None and len(self.arguments) > maximum
            ):
                raise ValueError(
                    f"Function {self.operator.value} expects between "
                    f"{minimum} and {maximum or 'unlimited'} arguments."
                )
            if (
                self.column is not None
                or self.data_type is not None
                or self.value is not None
            ):
                raise ValueError(
                    "A function expression cannot define column, data_type, or value."
                )
            return self

        raise ValueError("Unsupported expression kind.")


class NamedExpression(StrictModel):
    name: str = Field(min_length=1, max_length=512)
    expression: TabularExpression


class SortDirection(StrEnum):
    ASC = "asc"
    DESC = "desc"


class NullPlacement(StrEnum):
    FIRST = "first"
    LAST = "last"


class SortKey(StrictModel):
    expression: TabularExpression
    direction: SortDirection = SortDirection.ASC
    nulls: NullPlacement = NullPlacement.LAST


class AggregateFunction(StrEnum):
    COUNT = "count"
    COUNT_DISTINCT = "count_distinct"
    SUM = "sum"
    AVERAGE = "average"
    MINIMUM = "minimum"
    MAXIMUM = "maximum"


class AggregateMeasure(StrictModel):
    name: str = Field(min_length=1, max_length=512)
    function: AggregateFunction
    expression: TabularExpression | None = None

    @model_validator(mode="after")
    def validate_expression(self) -> AggregateMeasure:
        if self.function != AggregateFunction.COUNT and self.expression is None:
            raise ValueError("This aggregate function requires an expression.")
        return self


class JoinType(StrEnum):
    INNER = "inner"
    LEFT = "left"
    RIGHT = "right"
    FULL = "full"


class JoinComparison(StrEnum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    GREATER_OR_EQUAL = "greater_or_equal"
    LESS_THAN = "less_than"
    LESS_OR_EQUAL = "less_or_equal"


class JoinCondition(StrictModel):
    left_column: str = Field(min_length=1, max_length=512)
    right_column: str = Field(min_length=1, max_length=512)
    comparison: JoinComparison = JoinComparison.EQUALS


class JoinSide(StrEnum):
    LEFT = "left"
    RIGHT = "right"


class JoinProjection(StrictModel):
    side: JoinSide
    column: str = Field(min_length=1, max_length=512)
    name: str = Field(min_length=1, max_length=512)


class TabularInput(StrictModel):
    alias: str = Field(pattern=_IDENTIFIER_PATTERN)
    source_id: str = Field(min_length=1, max_length=64)
    sheet_name: str | None = Field(default=None, min_length=1, max_length=512)


class SelectStep(StrictModel):
    type: Literal["select"] = "select"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    input: str = Field(pattern=_IDENTIFIER_PATTERN)
    columns: list[NamedExpression] = Field(min_length=1, max_length=1000)


class FilterStep(StrictModel):
    type: Literal["filter"] = "filter"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    input: str = Field(pattern=_IDENTIFIER_PATTERN)
    where: TabularExpression


class SortStep(StrictModel):
    type: Literal["sort"] = "sort"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    input: str = Field(pattern=_IDENTIFIER_PATTERN)
    keys: list[SortKey] = Field(min_length=1, max_length=100)


class DistinctStep(StrictModel):
    type: Literal["distinct"] = "distinct"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    input: str = Field(pattern=_IDENTIFIER_PATTERN)


class AggregateStep(StrictModel):
    type: Literal["aggregate"] = "aggregate"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    input: str = Field(pattern=_IDENTIFIER_PATTERN)
    group_by: list[NamedExpression] = Field(default_factory=list, max_length=200)
    measures: list[AggregateMeasure] = Field(min_length=1, max_length=200)


class JoinStep(StrictModel):
    type: Literal["join"] = "join"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    left: str = Field(pattern=_IDENTIFIER_PATTERN)
    right: str = Field(pattern=_IDENTIFIER_PATTERN)
    how: JoinType = JoinType.INNER
    conditions: list[JoinCondition] = Field(min_length=1, max_length=32)
    columns: list[JoinProjection] = Field(min_length=1, max_length=1000)


class UnionStep(StrictModel):
    type: Literal["union"] = "union"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    inputs: list[str] = Field(min_length=2, max_length=100)
    all: bool = True

    @field_validator("inputs")
    @classmethod
    def validate_input_names(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("Union inputs must be unique.")
        return value


class LimitStep(StrictModel):
    type: Literal["limit"] = "limit"
    id: str = Field(pattern=_IDENTIFIER_PATTERN)
    input: str = Field(pattern=_IDENTIFIER_PATTERN)
    rows: int = Field(ge=1, le=1_000_000_000)


TabularStep = Annotated[
    SelectStep
    | FilterStep
    | SortStep
    | DistinctStep
    | AggregateStep
    | JoinStep
    | UnionStep
    | LimitStep,
    Field(discriminator="type"),
]


class TabularPlan(StrictModel):
    version: Literal["1.0"] = "1.0"
    inputs: list[TabularInput] = Field(min_length=1, max_length=100)
    steps: list[TabularStep] = Field(min_length=1, max_length=500)
    output: str = Field(pattern=_IDENTIFIER_PATTERN)

    @model_validator(mode="after")
    def validate_names(self) -> TabularPlan:
        input_aliases = [item.alias for item in self.inputs]
        if len(set(input_aliases)) != len(input_aliases):
            raise ValueError("Input aliases must be unique.")

        step_ids = [step.id for step in self.steps]
        if len(set(step_ids)) != len(step_ids):
            raise ValueError("Step IDs must be unique.")

        collisions = sorted(set(input_aliases) & set(step_ids))
        if collisions:
            raise ValueError(
                "Input aliases and step IDs cannot collide: " + ", ".join(collisions)
            )

        available = set(input_aliases)
        for step in self.steps:
            references: list[str]
            if isinstance(
                step,
                SelectStep
                | FilterStep
                | SortStep
                | DistinctStep
                | AggregateStep
                | LimitStep,
            ):
                references = [step.input]
            elif isinstance(step, JoinStep):
                references = [step.left, step.right]
            else:
                references = list(step.inputs)

            missing = [name for name in references if name not in available]
            if missing:
                raise ValueError(
                    f"Step {step.id} references unavailable datasets: {missing}."
                )
            available.add(step.id)

        if self.output not in set(step_ids):
            raise ValueError("The output must reference a materialized plan step.")
        return self


class TabularColumnSnapshot(StrictModel):
    position: int = Field(ge=1)
    name: str = Field(min_length=1, max_length=512)
    data_type: str = Field(min_length=1, max_length=128)


class TabularRunInputRecord(StrictModel):
    position: int = Field(ge=1)
    alias: str = Field(pattern=_IDENTIFIER_PATTERN)
    source_id: str = Field(min_length=1, max_length=64)
    sheet_name: str = Field(min_length=1, max_length=512)
    source_name: str = Field(min_length=1, max_length=512)
    source_sha256: str = Field(min_length=64, max_length=64)
    source_size_bytes: int = Field(ge=0)
    profile_version: str = Field(min_length=1, max_length=64)
    profile_engine: str = Field(min_length=1, max_length=128)
    header_row_number: int | None = Field(default=None, ge=1)
    columns: list[TabularColumnSnapshot] = Field(min_length=1, max_length=1000)


class TabularRunRecord(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=512)
    output_name: str = Field(min_length=1, max_length=512)
    plan: TabularPlan
    plan_hash: str = Field(min_length=64, max_length=64)
    inputs: list[TabularRunInputRecord]
    output_source_id: str = Field(min_length=1, max_length=64)
    job_id: str | None = Field(default=None, min_length=1, max_length=64)
    engine: str | None = Field(default=None, max_length=128)
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=255)
    created_at: datetime
    updated_at: datetime


class TabularExecutionResult(StrictModel):
    run_id: str
    output_source_id: str
    engine: str
    row_count: int = Field(ge=0)
    column_count: int = Field(ge=0)
    output_name: str
