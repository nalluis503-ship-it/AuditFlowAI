# AuditFlowAI Backend v0.13.0 — Motor tabular general

Backend trazable para recibir fuentes reales, ejecutar trabajo durable y materializar operaciones tabulares generales sin convertir la experiencia del auditor en un editor SQL.

## Alcance real

Este checkpoint agrega un motor de operaciones tabulares sobre las fuentes escalables de v0.12.0. No está construido alrededor de comparar dos bases ni de un flujo fijo. Una ejecución puede usar una o varias fuentes y combinar operaciones reutilizables:

- seleccionar y renombrar columnas;
- filtrar registros con expresiones tipadas;
- ordenar;
- eliminar filas duplicadas;
- agrupar y calcular medidas;
- relacionar fuentes mediante joins;
- concatenar fuentes compatibles mediante union;
- limitar resultados;
- materializar el resultado como una nueva fuente Parquet.

Cada resultado queda registrado como una fuente real, con perfil, SHA-256, job durable, eventos y linaje de entrada. La IA todavía no forma parte de este checkpoint: primero se consolida el motor verificable que una futura orquestación podrá utilizar.

## Principio de experiencia

El contrato técnico usa planes tipados para que el backend pueda validar y ejecutar operaciones de manera segura. El auditor normal no deberá redactar JSON, SQL, nombres de tablas ni expresiones técnicas. La interfaz y la futura IA traducirán la intención del auditor a este contrato interno.

El backend no acepta SQL libre:

```text
intención del auditor
→ plan tipado validado
→ job durable
→ DuckDB ejecuta fuera de memoria
→ resultado Parquet
→ fuente derivada y trazable
```

## Capacidades disponibles

### Fuentes

- Carga directa por streaming de CSV, XLSX y Parquet.
- Carga fragmentada, reanudable y verificable por SHA-256.
- Perfilado real con DuckDB u openpyxl.
- Detección y confirmación de encabezados.
- Vista previa limitada y paginada.
- Catálogo persistente de fuentes.

### Ejecución

- Jobs persistentes con progreso, eventos y leases.
- Recuperación después de reiniciar la API.
- Cancelación cooperativa.
- Reintentos controlados.
- Idempotencia.
- Registro separado de corridas tabulares y su linaje.

### Motor tabular

- Planes versionados y tipados.
- Una o muchas fuentes de entrada.
- Operaciones `select`, `filter`, `sort`, `distinct`, `aggregate`, `join`, `union` y `limit`.
- Expresiones de columnas, literales, casts, operaciones binarias, operaciones unarias y funciones autorizadas.
- Materialización Parquet comprimida con Zstandard.
- Conservación exacta de sumas enteras mediante `DECIMAL(38,0)` al escribir Parquet; un valor fuera de rango falla en lugar de degradarse silenciosamente a punto flotante.
- Preparación secuencial de hojas XLSX a Parquet temporal.
- Verificación del esquema físico antes y después de ejecutar.
- Resultado registrado y perfilado como fuente derivada.

## Arquitectura

```text
backend/
├── app/
│   ├── api/                 # HTTP y contratos externos
│   ├── application/         # Casos de uso
│   ├── core/                # Configuración, errores y logging
│   ├── domain/              # Modelos y puertos
│   ├── execution/           # Jobs, runner, worker y ejecutores
│   ├── infrastructure/      # SQLite, DuckDB, repositorios y archivos
│   ├── profiling/           # Perfilado, encabezados y vista previa
│   └── tabular/             # Contrato y compilador del plan tipado
├── migrations/              # Revisiones Alembic
├── scripts/                 # Operaciones administrativas
└── tests/                   # Pruebas funcionales, migraciones y recuperación
```

El compilador no recibe fragmentos SQL del cliente. Construye SQL interno únicamente a partir de modelos cerrados, operadores enumerados, identificadores citados y literales escapados.

## Linaje de una corrida

Al aceptar una corrida se conserva una instantánea por entrada:

- posición y alias;
- identificador de fuente;
- nombre y tamaño del archivo;
- SHA-256;
- hoja seleccionada;
- fila de encabezado;
- versión y motor del perfil;
- columnas ordenadas, posiciones y tipos inferidos.

Antes de ejecutar o reintentar, el backend vuelve a comprobar esa evidencia. Si la fuente fue reinterpretada, reperfilada con otro encabezado o ya no coincide con la instantánea, la corrida falla de forma permanente con `tabular_input_lineage_changed` en lugar de producir un resultado ambiguo.

Mientras una fuente participa en una corrida tabular activa no puede eliminarse ni reperfilarse. Del mismo modo, una fuente con otro job activo no puede incorporarse a una nueva corrida tabular.

## Formato del plan interno

Ejemplo reducido de una agregación:

```json
{
  "version": "1.0",
  "inputs": [
    {
      "alias": "movimientos",
      "source_id": "SOURCE_ID"
    }
  ],
  "steps": [
    {
      "type": "filter",
      "id": "relevantes",
      "input": "movimientos",
      "where": {
        "kind": "binary",
        "operator": "greater_than",
        "arguments": [
          {
            "kind": "cast",
            "data_type": "decimal",
            "arguments": [
              {"kind": "column", "column": "importe"}
            ]
          },
          {"kind": "literal", "value": 100000}
        ]
      }
    },
    {
      "type": "aggregate",
      "id": "resumen",
      "input": "relevantes",
      "group_by": [
        {
          "name": "proveedor",
          "expression": {"kind": "column", "column": "proveedor"}
        }
      ],
      "measures": [
        {
          "name": "importe_total",
          "function": "sum",
          "expression": {
            "kind": "cast",
            "data_type": "decimal",
            "arguments": [
              {"kind": "column", "column": "importe"}
            ]
          }
        },
        {
          "name": "movimientos",
          "function": "count"
        }
      ]
    }
  ],
  "output": "resumen"
}
```

Este JSON es un contrato backend, no la interfaz final del auditor.

## Operaciones y expresiones

### Pasos

| Paso | Propósito |
|---|---|
| `select` | Proyectar, transformar y renombrar columnas |
| `filter` | Conservar filas que cumplan una expresión |
| `sort` | Ordenar por una o varias expresiones |
| `distinct` | Eliminar filas completamente duplicadas |
| `aggregate` | Agrupar y calcular medidas |
| `join` | Relacionar dos conjuntos disponibles |
| `union` | Concatenar conjuntos con columnas ordenadas compatibles |
| `limit` | Restringir el número de filas materializadas |

### Tipos de expresión

- `column`
- `literal`
- `cast`
- `unary`
- `binary`
- `function`

### Casts

- `string`
- `integer`
- `decimal`
- `boolean`
- `date`
- `timestamp`

### Agregaciones

- `count`
- `count_distinct`
- `sum`
- `average`
- `minimum`
- `maximum`

El catálogo completo y vigente se consulta en `GET /api/v1/tabular-runs/catalog`.

## Migración

La revisión de este checkpoint es:

```text
20260712_0004
```

La migración conserva las tablas anteriores y agrega:

- `tabular_runs`
- `tabular_run_inputs`

Aplicar migraciones:

```powershell
.\backend\.venv\Scripts\python.exe -m `
  backend.scripts.migrate_database
```

La API no crea ni altera tablas al iniciar. Si la base no está en la revisión esperada, el arranque falla con una instrucción explícita para migrar.

## Ejecutar

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn `
  backend.app.main:app `
  --host 127.0.0.1 `
  --port 8000
```

## Endpoints principales

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/health` | Disponibilidad del proceso |
| GET | `/ready` | Base y almacenamiento disponibles |
| GET | `/api/v1/status` | Estado real del backend y worker |
| GET | `/api/v1/capabilities` | Capacidades con ejecutores reales |
| POST | `/api/v1/upload-sessions` | Crear carga reanudable |
| PUT | `/api/v1/upload-sessions/{id}/parts/{n}` | Guardar parte verificada |
| POST | `/api/v1/upload-sessions/{id}/complete` | Finalizar mediante job durable |
| POST | `/api/v1/sources/ingest-async` | Carga directa con perfilado durable |
| GET | `/api/v1/sources` | Listar fuentes |
| GET | `/api/v1/sources/{id}` | Consultar fuente y perfil |
| GET | `/api/v1/sources/{id}/preview` | Vista previa limitada |
| POST | `/api/v1/sources/{id}/reprofile-async` | Reperfilar con encabezados confirmados |
| DELETE | `/api/v1/sources/{id}` | Eliminar fuente sin trabajo activo |
| GET | `/api/v1/jobs/{id}` | Estado y progreso de un job |
| GET | `/api/v1/jobs/{id}/events` | Trazabilidad de un job |
| POST | `/api/v1/jobs/{id}/cancel` | Solicitar cancelación |
| POST | `/api/v1/jobs/{id}/retry` | Reintentar job terminal permitido |
| GET | `/api/v1/tabular-runs/catalog` | Catálogo del plan tipado |
| POST | `/api/v1/tabular-runs` | Crear corrida y job durable |
| GET | `/api/v1/tabular-runs` | Listar corridas y estado de job |
| GET | `/api/v1/tabular-runs/{id}` | Consultar plan, linaje y resultado |
| POST | `/api/v1/tabular-runs/{id}/cancel` | Cancelar corrida activa |
| POST | `/api/v1/tabular-runs/{id}/retry` | Reintentar corrida fallida o cancelada |

## Configuración

| Variable | Predeterminado |
|---|---:|
| `AUDITFLOW_DUCKDB_MEMORY_LIMIT` | `1GB` |
| `AUDITFLOW_DUCKDB_THREADS` | `4` |
| `AUDITFLOW_TABULAR_MAX_INPUTS` | `32` |
| `AUDITFLOW_TABULAR_MAX_STEPS` | `200` |
| `AUDITFLOW_JOB_DEFAULT_MAX_ATTEMPTS` | `3` |
| `AUDITFLOW_JOB_MAX_ATTEMPTS` | `10` |

Los límites del modelo también restringen el número de columnas, condiciones, claves de ordenamiento y argumentos por expresión. El despliegue debe ajustar memoria, disco, concurrencia y retención de acuerdo con el servidor real.

## Pruebas y calidad

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests
.\backend\.venv\Scripts\python.exe -m ruff check .\backend
.\backend\.venv\Scripts\python.exe -m ruff format --check .\backend
.\backend\.venv\Scripts\python.exe -m compileall -q .\backend
.\backend\.venv\Scripts\python.exe -m pip check
```

La suite cubre, entre otros puntos:

- migración `0003 → 0004` sin pérdida de fuentes ni jobs;
- paridad Alembic/SQLAlchemy;
- downgrade y reaplicación;
- selección, filtros, agregaciones, joins, union, distinct y limit;
- múltiples fuentes;
- hojas XLSX;
- materialización y perfilado del Parquet derivado;
- sumas enteras exactas al escribir Parquet;
- idempotencia de corridas;
- rechazo de SQL libre;
- escape de identificadores y literales;
- errores permanentes de conversión de datos;
- protección ante reperfilado concurrente;
- detección de cambios en el linaje antes de reintentar;
- cancelación, reintentos, jobs y eventos.

## Límites declarados

- El almacenamiento actual es el sistema de archivos local.
- El worker actual es local y no distribuido.
- DuckDB es el único motor tabular conectado en este checkpoint.
- XLSX se convierte temporalmente de forma secuencial antes de ejecutar.
- La cancelación ocurre entre etapas; no interrumpe todavía una consulta DuckDB en curso.
- Los joins no cuentan todavía con estimación de cardinalidad ni advertencias de explosión de filas.
- No existen funciones de ventana, pivotes, reglas de validación de alto nivel ni operaciones estadísticas avanzadas.
- No existen conectores SQL institucionales ni almacenamiento S3-compatible.
- No existe todavía un catálogo semántico para traducir nombres técnicos a conceptos de auditoría.
- No existe todavía una IA que genere planes; el motor solo ejecuta contratos reales y verificables.

## Próximos incrementos recomendados

1. Estimación previa de costo, cardinalidad y tamaño de salida.
2. Validaciones de calidad de datos como operaciones de primera clase.
3. Fuentes derivadas con relaciones navegables desde el catálogo.
4. Conectores administrados de solo lectura con pushdown.
5. Cuotas, retención y almacenamiento de objetos.
6. Orquestación asistida por IA sobre el registro real de capacidades.
