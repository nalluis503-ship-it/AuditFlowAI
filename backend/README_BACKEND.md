# AuditFlowAI Backend v0.11.0 — Durable Jobs

Base trazable para ingestión de fuentes reales, perfilado tabular y ejecución durable en segundo plano.

## Alcance real

Este checkpoint agrega una cola local persistente sobre SQLite. No incorpora todavía un orquestador universal de IA, conectores SQL institucionales, cargas fragmentadas reanudables ni ejecución distribuida.

Capacidades ejecutables:

- Carga por bloques de CSV, XLSX y Parquet.
- Almacenamiento atómico y SHA-256 durante la recepción.
- Catálogo persistente de fuentes.
- Perfilado con DuckDB y openpyxl.
- Detección y confirmación de encabezados.
- Trabajos persistentes con estados, progreso, intentos y resultados.
- Reclamación atómica mediante lease para evitar doble ejecución.
- Heartbeat del worker y recuperación de leases vencidos.
- Cancelación cooperativa.
- Reintentos automáticos con espera exponencial y reintento manual.
- Registro persistente de eventos del trabajo.
- Idempotencia opcional para evitar trabajos duplicados.
- Conservación de jobs y fuentes después de reiniciar la API.
- Protección para impedir eliminar una fuente con trabajo activo.
- Migraciones exclusivamente mediante Alembic.

## Arquitectura

```text
backend/
├── app/
│   ├── api/                 # HTTP y contratos
│   ├── application/         # Casos de uso
│   ├── core/                # Configuración, errores y logging
│   ├── domain/              # Modelos y contratos
│   ├── execution/           # Registro, runner, worker y ejecutores
│   ├── infrastructure/      # SQLite, repositorios y almacenamiento
│   └── profiling/           # Motores de perfilado
├── migrations/              # Alembic
├── scripts/                 # Operaciones de migración
└── tests/                   # Pruebas funcionales y de recuperación
```

El dominio de jobs no depende de FastAPI, DuckDB ni del worker local. Los ejecutores se registran mediante `JobExecutorRegistry`, por lo que un backend de cola externo podrá sustituir al worker local sin cambiar el contrato HTTP ni los casos de uso.

## Modelo de ejecución

```text
solicitud
→ archivo almacenado
→ job queued
→ claim atómico
→ running + lease
→ heartbeat + progreso
→ succeeded / failed / canceled
```

Si el proceso se interrumpe, el lease vence. Otro worker recupera el trabajo y lo vuelve a colocar en cola mientras queden intentos disponibles.

## Requisitos

- Python 3.13
- Windows PowerShell para los comandos del proyecto actual

## Crear entorno

Desde la raíz del repositorio:

```powershell
py -3.13 -m venv .\backend\.venv

.\backend\.venv\Scripts\python.exe -m pip install `
  --upgrade pip

.\backend\.venv\Scripts\python.exe -m pip install `
  -r .\backend\requirements-dev.txt
```

## Aplicar migraciones

```powershell
.\backend\.venv\Scripts\python.exe -m `
  backend.scripts.migrate_database
```

La revisión de este checkpoint es:

```text
20260712_0002
```

La migración `0002` conserva intactas las filas existentes en `sources` y agrega `jobs` y `job_events`.

## Ejecutar

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn `
  backend.app.main:app `
  --host 127.0.0.1 `
  --port 8000
```

El worker local inicia y se detiene con el ciclo de vida de FastAPI. Puede deshabilitarse con:

```text
AUDITFLOW_JOB_WORKER_ENABLED=false
```

## Endpoints

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/health` | Disponibilidad del proceso |
| GET | `/ready` | Acceso a base y almacenamiento |
| GET | `/api/v1/status` | Estado y worker local |
| GET | `/api/v1/capabilities` | Capacidades ejecutables reales |
| POST | `/api/v1/sources/ingest-async` | Almacenar fuente y crear job de perfilado |
| POST | `/api/v1/sources/{id}/reprofile-async` | Reperfilar mediante job durable |
| POST | `/api/v1/sources/ingest` | Compatibilidad síncrona temporal |
| POST | `/api/v1/sources/{id}/reprofile` | Compatibilidad síncrona temporal |
| GET | `/api/v1/sources` | Listar fuentes |
| GET | `/api/v1/sources/{id}` | Recuperar fuente y perfil |
| DELETE | `/api/v1/sources/{id}` | Eliminar fuente sin jobs activos |
| POST | `/api/v1/jobs` | Crear un job registrado |
| GET | `/api/v1/jobs` | Listar y filtrar jobs |
| GET | `/api/v1/jobs/{id}` | Consultar estado y progreso |
| GET | `/api/v1/jobs/{id}/events` | Consultar trazabilidad del job |
| POST | `/api/v1/jobs/{id}/cancel` | Solicitar cancelación |
| POST | `/api/v1/jobs/{id}/retry` | Reintentar manualmente |

## Configuración de jobs

| Variable | Valor predeterminado |
|---|---:|
| `AUDITFLOW_JOB_WORKER_ENABLED` | `true` |
| `AUDITFLOW_JOB_POLL_INTERVAL_SECONDS` | `0.5` |
| `AUDITFLOW_JOB_LEASE_SECONDS` | `300` |
| `AUDITFLOW_JOB_HEARTBEAT_SECONDS` | `30` |
| `AUDITFLOW_JOB_RECOVERY_INTERVAL_SECONDS` | `60` |
| `AUDITFLOW_JOB_SHUTDOWN_TIMEOUT_SECONDS` | `30` |
| `AUDITFLOW_JOB_DEFAULT_MAX_ATTEMPTS` | `3` |
| `AUDITFLOW_JOB_MAX_ATTEMPTS` | `10` |
| `AUDITFLOW_JOB_RETRY_BASE_SECONDS` | `5` |
| `AUDITFLOW_JOB_RETRY_MAX_SECONDS` | `3600` |

El heartbeat debe ser menor que el lease.

## Pruebas y calidad

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests
.\backend\.venv\Scripts\python.exe -m ruff check .\backend
.\backend\.venv\Scripts\python.exe -m ruff format --check .\backend
.\backend\.venv\Scripts\python.exe -m compileall -q .\backend
.\backend\.venv\Scripts\python.exe -m pip check
```

Las pruebas cubren:

- migración desde `20260712_0001` sin pérdida de fuentes;
- paridad exacta entre el esquema Alembic y los modelos SQLAlchemy;
- downgrade y reaplicación limpia de la revisión durable;
- persistencia y eventos;
- claim atómico;
- cancelación antes y durante la ejecución;
- reintento manual con límite global;
- backoff exponencial con espera máxima configurada;
- recuperación de leases vencidos;
- supervivencia de un job a un reinicio;
- perfilado durable real de una fuente;
- idempotencia;
- protección de recursos con trabajos activos.

## Límites declarados

- La transferencia HTTP todavía no es fragmentada ni reanudable.
- El worker actual es local; no es una cola distribuida.
- La cancelación del perfilador es cooperativa entre etapas, no interrumpe una llamada interna de DuckDB u openpyxl.
- El progreso durante el escaneo es por etapa, no por porcentaje exacto de filas.
- Los resultados de jobs deben contener metadatos y referencias a artefactos, no grandes conjuntos de datos incrustados en SQLite.
- No existen todavía conectores SQL, ejecutores estadísticos generales, análisis documental ni planificador de IA.

## Seguridad de reintentos

`AUDITFLOW_JOB_RETRY_MAX_SECONDS` limita la espera del backoff exponencial. Los reintentos manuales respetan `AUDITFLOW_JOB_MAX_ATTEMPTS`.
