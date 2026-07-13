# AuditFlowAI Backend v0.12.0 — Scalable Sources

Base trazable para registrar, transferir, perfilar y consultar fuentes tabulares reales sin cargar archivos completos en memoria.

## Alcance real

Este checkpoint agrega una capa general de fuentes escalables sobre la ejecución durable de v0.11.0. No está diseñado alrededor de comparar dos bases ni de otro caso fijo: proporciona infraestructura reutilizable para cualquier análisis posterior.

Capacidades ejecutables:

- Carga directa por streaming de CSV, XLSX y Parquet.
- Sesiones de carga fragmentada y reanudable.
- Verificación SHA-256 de cada parte y del archivo completo.
- Partes idempotentes y transferibles fuera de orden.
- Ensamblado durable mediante job persistente.
- Recuperación de cargas después de reiniciar la API.
- Expiración y limpieza de sesiones abandonadas.
- Registro persistente de fuentes y perfiles.
- Perfilado fuera de memoria con DuckDB para CSV y Parquet.
- Perfilado secuencial de XLSX con openpyxl y conteo de duplicados en disco.
- Detección y confirmación de encabezados.
- Vista previa paginada y limitada para CSV, XLSX y Parquet.
- Jobs durables con progreso, eventos, cancelación, reintentos y recuperación.
- Migraciones exclusivamente mediante Alembic.

No incorpora todavía conectores SQL institucionales, almacenamiento de objetos distribuido, transformación universal, ejecutores estadísticos, análisis documental ni orquestación de IA.

## Arquitectura

```text
backend/
├── app/
│   ├── api/                 # HTTP y contratos
│   ├── application/         # Casos de uso
│   ├── core/                # Configuración, errores y logging
│   ├── domain/              # Modelos, puertos y contratos
│   ├── execution/           # Registro, runner, worker y ejecutores
│   ├── infrastructure/      # SQLite, repositorios y almacenamiento
│   └── profiling/           # Perfilado y vista previa
├── migrations/              # Alembic
├── scripts/                 # Operaciones de migración
└── tests/                   # Pruebas funcionales y de recuperación
```

La transferencia fragmentada, el catálogo, la ejecución y el perfilado están separados. El auditor no necesita conocer partes, DuckDB, SQL ni rutas físicas; esas decisiones pertenecen al backend.

## Flujo de carga reanudable

```text
crear sesión
→ subir partes verificadas
→ reanudar después de interrupción
→ solicitar finalización
→ job durable ensambla y verifica
→ registrar fuente
→ perfilar
→ conservar evidencia y eventos
```

Cada sesión reserva desde el inicio un `source_id`. Esto hace que la finalización sea idempotente y recuperable incluso si el proceso se interrumpe entre el ensamblado, el registro y el perfilado.

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
20260712_0003
```

La migración `0003` conserva `sources`, `jobs` y `job_events`, y agrega:

- `upload_sessions`
- `upload_parts`

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
| GET | `/ready` | Acceso a base y almacenamiento |
| GET | `/api/v1/status` | Estado del backend y worker |
| GET | `/api/v1/capabilities` | Capacidades ejecutables reales |
| POST | `/api/v1/upload-sessions` | Crear una carga reanudable |
| GET | `/api/v1/upload-sessions/{id}` | Consultar avance y siguiente parte faltante |
| GET | `/api/v1/upload-sessions/{id}/parts` | Listar partes registradas de forma paginada |
| PUT | `/api/v1/upload-sessions/{id}/parts/{n}` | Guardar una parte binaria verificada |
| POST | `/api/v1/upload-sessions/{id}/complete` | Crear job durable de ensamblado y perfilado |
| DELETE | `/api/v1/upload-sessions/{id}` | Abortar una sesión sin job activo |
| POST | `/api/v1/sources/ingest-async` | Carga directa y perfilado durable |
| GET | `/api/v1/sources` | Listar fuentes |
| GET | `/api/v1/sources/{id}` | Recuperar fuente y perfil |
| GET | `/api/v1/sources/{id}/preview` | Obtener vista previa limitada por hoja |
| POST | `/api/v1/sources/{id}/reprofile-async` | Reperfilar con encabezados confirmados |
| DELETE | `/api/v1/sources/{id}` | Eliminar una fuente sin jobs activos |
| GET | `/api/v1/jobs/{id}` | Consultar estado y progreso |
| GET | `/api/v1/jobs/{id}/events` | Consultar trazabilidad |
| POST | `/api/v1/jobs/{id}/cancel` | Solicitar cancelación |
| POST | `/api/v1/jobs/{id}/retry` | Reintentar un job terminal permitido |

## Contrato de partes

Cada `PUT` usa cuerpo binario y requiere:

```text
X-Part-SHA256: <64 caracteres hexadecimales>
Content-Type: application/octet-stream
```

El backend valida:

- número de parte dentro del plan;
- tamaño exacto esperado;
- SHA-256 declarado;
- idempotencia de la parte;
- integridad física antes del ensamblado;
- tamaño y SHA-256 del archivo completo.

Las partes pueden llegar fuera de orden. La finalización no se acepta mientras falte alguna.

## Configuración de cargas escalables

| Variable | Valor predeterminado |
|---|---:|
| `AUDITFLOW_RESUMABLE_MAX_UPLOAD_BYTES` | `1099511627776` (1 TiB) |
| `AUDITFLOW_RESUMABLE_DEFAULT_PART_BYTES` | `16777216` (16 MiB) |
| `AUDITFLOW_RESUMABLE_MIN_PART_BYTES` | `1048576` (1 MiB) |
| `AUDITFLOW_RESUMABLE_MAX_PART_BYTES` | `134217728` (128 MiB) |
| `AUDITFLOW_RESUMABLE_MAX_PARTS` | `100000` |
| `AUDITFLOW_UPLOAD_SESSION_TTL_SECONDS` | `86400` |

Los límites son configurables. El valor máximo declarado no garantiza capacidad física: el despliegue debe definir cuotas de disco, concurrencia y retención de acuerdo con el servidor real.

## Vista previa segura

La vista previa nunca devuelve la fuente completa. Acepta:

- `sheet`: hoja opcional;
- `offset`: hasta `100000`;
- `limit`: máximo `200` filas.

CSV y Parquet utilizan DuckDB con límite y desplazamiento. XLSX se lee en modo secuencial. Esta función es para inspección, no sustituye el futuro motor general de consultas.

## Pruebas y calidad

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests
.\backend\.venv\Scripts\python.exe -m ruff check .\backend
.\backend\.venv\Scripts\python.exe -m ruff format --check .\backend
.\backend\.venv\Scripts\python.exe -m compileall -q .\backend
.\backend\.venv\Scripts\python.exe -m pip check
```

Las pruebas cubren:

- migración `0002 → 0003` sin pérdida de fuentes ni jobs;
- paridad Alembic/SQLAlchemy;
- downgrade y reaplicación;
- carga reanudable fuera de orden;
- reanudación después de reiniciar;
- idempotencia y conflictos de partes;
- tamaños y checksums incorrectos;
- finalización durable y perfilado real;
- expiración y limpieza en arranque;
- vistas previas CSV, XLSX y Parquet;
- cancelación, reintentos, leases y recuperación de jobs;
- compatibilidad con la carga directa existente.

## Límites declarados

- El proveedor de almacenamiento actual es el sistema de archivos local.
- El worker actual es local y no distribuido.
- El ensamblado necesita espacio temporal equivalente al archivo original, además del destino final durante la confirmación.
- La vista previa XLSX debe recorrer filas anteriores al `offset` porque el formato no permite acceso columnar eficiente.
- No se convierte todavía toda fuente a una representación Parquet interna.
- No existen todavía cuotas por usuario o auditoría.
- No existen todavía conectores SQL administrados ni almacenamiento S3-compatible.
- Los resultados de análisis todavía no se registran como fuentes derivadas.

## Próximos incrementos recomendados

1. Artefactos y fuentes derivadas con linaje.
2. Materialización Parquet configurable para CSV y XLSX.
3. Cuotas, retención y administración de almacenamiento.
4. Proveedor S3-compatible sin cambiar los casos de uso.
5. Catálogo semántico de fuentes institucionales administradas.
6. Motor general de operaciones: filtrar, agrupar, transformar, validar y detectar.
