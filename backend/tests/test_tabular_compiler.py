import duckdb
import pytest

from backend.app.core.errors import InvalidSourceError
from backend.app.domain.tabular_models import TabularPlan
from backend.app.tabular.compiler import TabularPlanCompiler


def _column(name: str) -> dict:
    return {"kind": "column", "column": name}


def _literal(value) -> dict:
    return {"kind": "literal", "value": value}


def test_compiler_quotes_identifiers_and_literals_without_raw_sql():
    unusual_column = 'customer"name'
    expected_value = "O'Reilly"
    plan = TabularPlan.model_validate(
        {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": "source-id"}],
            "steps": [
                {
                    "type": "filter",
                    "id": "matched",
                    "input": "source",
                    "where": {
                        "kind": "binary",
                        "operator": "equals",
                        "arguments": [
                            _column(unusual_column),
                            _literal(expected_value),
                        ],
                    },
                },
                {
                    "type": "select",
                    "id": "selected",
                    "input": "matched",
                    "columns": [
                        {
                            "name": "safe_name",
                            "expression": _column(unusual_column),
                        }
                    ],
                },
            ],
            "output": "selected",
        }
    )
    compiler = TabularPlanCompiler()
    compiled = compiler.compile(
        plan,
        input_views={"source": "physical_source"},
        input_schemas={"source": [unusual_column]},
    )

    connection = duckdb.connect(database=":memory:")
    try:
        connection.execute(
            '''CREATE VIEW "physical_source" AS
               SELECT 'O''Reilly' AS "customer""name"
               UNION ALL
               SELECT 'Other' AS "customer""name"'''
        )
        assert connection.execute(compiled.sql).fetchall() == [(expected_value,)]
    finally:
        connection.close()


def test_compiler_rejects_union_with_different_ordered_schema():
    plan = TabularPlan.model_validate(
        {
            "version": "1.0",
            "inputs": [
                {"alias": "left", "source_id": "left-id"},
                {"alias": "right", "source_id": "right-id"},
            ],
            "steps": [
                {
                    "type": "union",
                    "id": "combined",
                    "inputs": ["left", "right"],
                }
            ],
            "output": "combined",
        }
    )

    with pytest.raises(InvalidSourceError) as captured:
        TabularPlanCompiler().compile(
            plan,
            input_views={"left": "left_view", "right": "right_view"},
            input_schemas={"left": ["id", "value"], "right": ["value", "id"]},
        )

    assert captured.value.code == "tabular_union_schema_mismatch"


def test_compiler_rejects_duplicate_output_column_names():
    plan = TabularPlan.model_validate(
        {
            "version": "1.0",
            "inputs": [{"alias": "source", "source_id": "source-id"}],
            "steps": [
                {
                    "type": "select",
                    "id": "selected",
                    "input": "source",
                    "columns": [
                        {"name": "duplicate", "expression": _column("first")},
                        {"name": "duplicate", "expression": _column("second")},
                    ],
                }
            ],
            "output": "selected",
        }
    )

    with pytest.raises(InvalidSourceError) as captured:
        TabularPlanCompiler().compile(
            plan,
            input_views={"source": "physical_source"},
            input_schemas={"source": ["first", "second"]},
        )

    assert captured.value.code == "duplicate_tabular_output_columns"
