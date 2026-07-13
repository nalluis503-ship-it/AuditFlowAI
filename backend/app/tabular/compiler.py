from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from backend.app.core.errors import InvalidSourceError
from backend.app.domain.tabular_models import (
    AggregateFunction,
    AggregateStep,
    DistinctStep,
    ExpressionKind,
    ExpressionOperator,
    FilterStep,
    JoinComparison,
    JoinSide,
    JoinStep,
    LimitStep,
    SelectStep,
    SortStep,
    TabularExpression,
    TabularPlan,
    TabularScalarType,
    UnionStep,
)


@dataclass(frozen=True, slots=True)
class CompiledTabularPlan:
    sql: str
    output_columns: tuple[str, ...]


def quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def quote_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            raise InvalidSourceError(
                "Tabular literal values must be finite numbers.",
                code="invalid_tabular_literal",
            )
        return repr(value)
    if isinstance(value, datetime | date):
        text = value.isoformat()
    elif isinstance(value, str):
        text = value
    else:
        raise InvalidSourceError(
            "The tabular plan contains an unsupported literal value.",
            code="invalid_tabular_literal",
            details={"value_type": type(value).__name__},
        )
    return "'" + text.replace("'", "''") + "'"


_CAST_TYPES = {
    TabularScalarType.STRING: "VARCHAR",
    TabularScalarType.INTEGER: "BIGINT",
    TabularScalarType.DECIMAL: "DECIMAL(38, 10)",
    TabularScalarType.BOOLEAN: "BOOLEAN",
    TabularScalarType.DATE: "DATE",
    TabularScalarType.TIMESTAMP: "TIMESTAMP",
}

_BINARY_SQL = {
    ExpressionOperator.ADD: "+",
    ExpressionOperator.SUBTRACT: "-",
    ExpressionOperator.MULTIPLY: "*",
    ExpressionOperator.DIVIDE: "/",
    ExpressionOperator.MODULO: "%",
    ExpressionOperator.CONCAT: "||",
    ExpressionOperator.EQUALS: "=",
    ExpressionOperator.NOT_EQUALS: "<>",
    ExpressionOperator.GREATER_THAN: ">",
    ExpressionOperator.GREATER_OR_EQUAL: ">=",
    ExpressionOperator.LESS_THAN: "<",
    ExpressionOperator.LESS_OR_EQUAL: "<=",
    ExpressionOperator.AND: "AND",
    ExpressionOperator.OR: "OR",
}

_JOIN_SQL = {
    JoinComparison.EQUALS: "=",
    JoinComparison.NOT_EQUALS: "<>",
    JoinComparison.GREATER_THAN: ">",
    JoinComparison.GREATER_OR_EQUAL: ">=",
    JoinComparison.LESS_THAN: "<",
    JoinComparison.LESS_OR_EQUAL: "<=",
}


class TabularPlanCompiler:
    def compile(
        self,
        plan: TabularPlan,
        *,
        input_views: dict[str, str],
        input_schemas: dict[str, list[str]],
    ) -> CompiledTabularPlan:
        missing_views = sorted(set(input_schemas) - set(input_views))
        if missing_views:
            raise InvalidSourceError(
                "The tabular engine did not prepare every plan input.",
                code="tabular_input_not_prepared",
                details={"missing_inputs": missing_views},
            )

        schemas: dict[str, list[str]] = {
            name: list(columns) for name, columns in input_schemas.items()
        }
        ctes = [
            f"{quote_identifier(alias)} AS "
            f"(SELECT * FROM {quote_identifier(input_views[alias])})"
            for alias in [item.alias for item in plan.inputs]
        ]

        for step in plan.steps:
            if isinstance(step, SelectStep):
                source_columns = self._require_schema(schemas, step.input)
                self._require_unique_names(
                    [item.name for item in step.columns],
                    step_id=step.id,
                )
                projections = [
                    f"{self._expression(item.expression, source_columns)} "
                    f"AS {quote_identifier(item.name)}"
                    for item in step.columns
                ]
                sql = (
                    f"SELECT {', '.join(projections)} "
                    f"FROM {quote_identifier(step.input)}"
                )
                schemas[step.id] = [item.name for item in step.columns]

            elif isinstance(step, FilterStep):
                source_columns = self._require_schema(schemas, step.input)
                condition = self._expression(step.where, source_columns)
                sql = f"SELECT * FROM {quote_identifier(step.input)} WHERE {condition}"
                schemas[step.id] = list(source_columns)

            elif isinstance(step, SortStep):
                source_columns = self._require_schema(schemas, step.input)
                keys = [
                    f"{self._expression(item.expression, source_columns)} "
                    f"{item.direction.value.upper()} NULLS {item.nulls.value.upper()}"
                    for item in step.keys
                ]
                sql = (
                    f"SELECT * FROM {quote_identifier(step.input)} "
                    f"ORDER BY {', '.join(keys)}"
                )
                schemas[step.id] = list(source_columns)

            elif isinstance(step, DistinctStep):
                source_columns = self._require_schema(schemas, step.input)
                sql = f"SELECT DISTINCT * FROM {quote_identifier(step.input)}"
                schemas[step.id] = list(source_columns)

            elif isinstance(step, AggregateStep):
                source_columns = self._require_schema(schemas, step.input)
                names = [item.name for item in step.group_by] + [
                    item.name for item in step.measures
                ]
                self._require_unique_names(names, step_id=step.id)
                projections: list[str] = []
                for item in step.group_by:
                    projections.append(
                        f"{self._expression(item.expression, source_columns)} "
                        f"AS {quote_identifier(item.name)}"
                    )
                for item in step.measures:
                    aggregate = self._aggregate(
                        item.function,
                        item.expression,
                        source_columns,
                    )
                    projections.append(f"{aggregate} AS {quote_identifier(item.name)}")
                sql = (
                    f"SELECT {', '.join(projections)} "
                    f"FROM {quote_identifier(step.input)}"
                )
                if step.group_by:
                    positions = ", ".join(
                        str(index) for index in range(1, len(step.group_by) + 1)
                    )
                    sql += f" GROUP BY {positions}"
                schemas[step.id] = names

            elif isinstance(step, JoinStep):
                left_columns = self._require_schema(schemas, step.left)
                right_columns = self._require_schema(schemas, step.right)
                self._require_unique_names(
                    [item.name for item in step.columns],
                    step_id=step.id,
                )
                conditions: list[str] = []
                for condition in step.conditions:
                    self._require_column(condition.left_column, left_columns)
                    self._require_column(condition.right_column, right_columns)
                    conditions.append(
                        f"l.{quote_identifier(condition.left_column)} "
                        f"{_JOIN_SQL[condition.comparison]} "
                        f"r.{quote_identifier(condition.right_column)}"
                    )
                projections: list[str] = []
                for item in step.columns:
                    columns = (
                        left_columns if item.side == JoinSide.LEFT else right_columns
                    )
                    self._require_column(item.column, columns)
                    prefix = "l" if item.side == JoinSide.LEFT else "r"
                    projections.append(
                        f"{prefix}.{quote_identifier(item.column)} "
                        f"AS {quote_identifier(item.name)}"
                    )
                sql = (
                    f"SELECT {', '.join(projections)} "
                    f"FROM {quote_identifier(step.left)} AS l "
                    f"{step.how.value.upper()} JOIN "
                    f"{quote_identifier(step.right)} AS r "
                    f"ON {' AND '.join(conditions)}"
                )
                schemas[step.id] = [item.name for item in step.columns]

            elif isinstance(step, UnionStep):
                source_schemas = [
                    self._require_schema(schemas, item) for item in step.inputs
                ]
                first = source_schemas[0]
                for index, current in enumerate(source_schemas[1:], start=2):
                    if current != first:
                        raise InvalidSourceError(
                            "Union inputs must have matching ordered columns.",
                            code="tabular_union_schema_mismatch",
                            details={
                                "step_id": step.id,
                                "expected_columns": first,
                                "input_position": index,
                                "actual_columns": current,
                            },
                        )
                separator = " UNION ALL " if step.all else " UNION "
                sql = separator.join(
                    f"SELECT * FROM {quote_identifier(item)}" for item in step.inputs
                )
                schemas[step.id] = list(first)

            elif isinstance(step, LimitStep):
                source_columns = self._require_schema(schemas, step.input)
                sql = f"SELECT * FROM {quote_identifier(step.input)} LIMIT {step.rows}"
                schemas[step.id] = list(source_columns)

            else:  # pragma: no cover - Pydantic prevents unknown step models.
                raise InvalidSourceError(
                    "The tabular plan contains an unsupported operation.",
                    code="unsupported_tabular_step",
                )

            ctes.append(f"{quote_identifier(step.id)} AS ({sql})")

        output_columns = self._require_schema(schemas, plan.output)
        query = (
            "WITH "
            + ",\n".join(ctes)
            + f"\nSELECT * FROM {quote_identifier(plan.output)}"
        )
        return CompiledTabularPlan(
            sql=query,
            output_columns=tuple(output_columns),
        )

    def _expression(
        self,
        expression: TabularExpression,
        columns: list[str],
    ) -> str:
        if expression.kind == ExpressionKind.COLUMN:
            assert expression.column is not None
            self._require_column(expression.column, columns)
            return quote_identifier(expression.column)

        if expression.kind == ExpressionKind.LITERAL:
            return quote_literal(expression.value)

        if expression.kind == ExpressionKind.CAST:
            assert expression.data_type is not None
            return (
                f"CAST({self._expression(expression.arguments[0], columns)} "
                f"AS {_CAST_TYPES[expression.data_type]})"
            )

        if expression.kind == ExpressionKind.UNARY:
            assert expression.operator is not None
            argument = self._expression(expression.arguments[0], columns)
            if expression.operator == ExpressionOperator.NOT:
                return f"(NOT ({argument}))"
            return f"(-({argument}))"

        if expression.kind == ExpressionKind.BINARY:
            assert expression.operator is not None
            left = self._expression(expression.arguments[0], columns)
            right = self._expression(expression.arguments[1], columns)
            return f"(({left}) {_BINARY_SQL[expression.operator]} ({right}))"

        assert expression.kind == ExpressionKind.FUNCTION
        assert expression.operator is not None
        args = [self._expression(item, columns) for item in expression.arguments]
        operator = expression.operator
        if operator in {
            ExpressionOperator.LOWER,
            ExpressionOperator.UPPER,
            ExpressionOperator.TRIM,
            ExpressionOperator.LENGTH,
            ExpressionOperator.ABS,
            ExpressionOperator.ROUND,
            ExpressionOperator.COALESCE,
        }:
            return f"{operator.value.upper()}({', '.join(args)})"
        if operator == ExpressionOperator.CONTAINS:
            return f"CONTAINS(CAST({args[0]} AS VARCHAR), CAST({args[1]} AS VARCHAR))"
        if operator == ExpressionOperator.STARTS_WITH:
            return (
                f"STARTS_WITH(CAST({args[0]} AS VARCHAR), CAST({args[1]} AS VARCHAR))"
            )
        if operator == ExpressionOperator.ENDS_WITH:
            return f"ENDS_WITH(CAST({args[0]} AS VARCHAR), CAST({args[1]} AS VARCHAR))"
        if operator == ExpressionOperator.IS_NULL:
            return f"(({args[0]}) IS NULL)"
        if operator == ExpressionOperator.IS_NOT_NULL:
            return f"(({args[0]}) IS NOT NULL)"
        if operator in {
            ExpressionOperator.YEAR,
            ExpressionOperator.MONTH,
            ExpressionOperator.DAY,
        }:
            return f"{operator.value.upper()}({args[0]})"
        raise InvalidSourceError(
            "The tabular expression function is not supported.",
            code="unsupported_tabular_expression",
            details={"operator": operator.value},
        )

    def _aggregate(
        self,
        function: AggregateFunction,
        expression: TabularExpression | None,
        columns: list[str],
    ) -> str:
        if function == AggregateFunction.COUNT and expression is None:
            return "COUNT(*)"
        if expression is None:
            raise InvalidSourceError(
                "The aggregate expression is required.",
                code="invalid_tabular_aggregate",
            )
        compiled = self._expression(expression, columns)
        if function == AggregateFunction.COUNT:
            return f"COUNT({compiled})"
        if function == AggregateFunction.COUNT_DISTINCT:
            return f"COUNT(DISTINCT {compiled})"
        mapping = {
            AggregateFunction.SUM: "SUM",
            AggregateFunction.AVERAGE: "AVG",
            AggregateFunction.MINIMUM: "MIN",
            AggregateFunction.MAXIMUM: "MAX",
        }
        return f"{mapping[function]}({compiled})"

    @staticmethod
    def _require_schema(schemas: dict[str, list[str]], name: str) -> list[str]:
        try:
            return schemas[name]
        except KeyError as exc:
            raise InvalidSourceError(
                "The tabular plan references an unavailable dataset.",
                code="tabular_dataset_not_found",
                details={"dataset": name},
            ) from exc

    @staticmethod
    def _require_column(column: str, columns: list[str]) -> None:
        if column not in columns:
            raise InvalidSourceError(
                "The tabular plan references a column that does not exist.",
                code="tabular_column_not_found",
                details={
                    "column": column,
                    "available_columns": columns,
                },
            )

    @staticmethod
    def _require_unique_names(names: list[str], *, step_id: str) -> None:
        duplicates = sorted({name for name in names if names.count(name) > 1})
        if duplicates:
            raise InvalidSourceError(
                "A tabular operation cannot produce duplicate column names.",
                code="duplicate_tabular_output_columns",
                details={"step_id": step_id, "columns": duplicates},
            )
