# AuditFlowAI Backend v0.10.0 Foundation R3

Base limpia y trazable para ingestión, persistencia y perfilado de fuentes tabulares reales.

## Alcance real de este checkpoint

Este backend fortalece la capa de datos. No afirma todavía disponer de un orquestador universal de IA, análisis estadístico general, trabajos distribuidos ni procesamiento documental completo.

Capacidades ejecutables actuales:

- Carga por bloques de CSV, XLSX y Parquet sin leer el archivo completo en memoria.
- Límite de carga directa configurable.
- Almacenamiento atómico del original y cálculo SHA-256 durante la carga.
- Catálogo persistente de fuentes con SQLite y SQLAlchemy.
- Migraciones de esquema exclusivamente mediante Alembic.
- Verificación estricta de que la base esté en la revisión Alembic vigente.
- Perfilado CSV y Parquet con DuckDB y uso de disco temporal.
- Perfilado XLSX en lectura secuencial con openpyxl.
- Validación defensiva del contenedor XLSX antes de abrirlo.
- Detección de candidatos de encabezado y confirmación explícita por hoja.
- Conteos de filas, columnas, vacíos y duplicados exactos.
- Reperfilado sin volver a subir el archivo.
- Catálogo de capacidades limitado a ejecutores reales.
- Errores uniformes y aplicación construida mediante fábrica y contenedor de dependencias.
- Importación idempotente del almacenamiento v0.9, conservando copia de los perfiles originales.

## Estructura

```text
backend/
├── app/
│   ├── api/                 # HTTP y contratos de entrada/salida
│   ├── application/         # Casos de uso
│   ├── core/                # Configuración, errores y logging
│   ├── domain/              # Modelos y contratos
│   ├── infrastructure/      # Base de datos, almacenamiento y repositorios
│   └── profiling/           # Motores reales de perfilado
├── migrations/              # Alembic
├── scripts/                 # Migraciones operativas
└── tests/                   # Pruebas funcionales y de disciplina
```

## Requisitos

- Python 3.13
- Windows PowerShell para los comandos de instalación del proyecto actual

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

Alembic es la única autoridad del esquema. La API se niega a iniciar si la revisión almacenada no coincide con la revisión vigente del código.

## Importar almacenamiento v0.9

```powershell
.\backend\.venv\Scripts\python.exe -m `
  backend.scripts.migrate_v090_storage `
  --storage-root .\backend\storage
```

El importador:

1. verifica cada original contra su SHA-256;
2. conserva el archivo original existente;
3. guarda el nuevo layout sin sobrescrituras parciales;
4. archiva el perfil v0.9 bajo `storage/migration/v090-profiles`;
5. registra la fuente en SQLite;
6. puede ejecutarse nuevamente sin duplicar registros.

## Ejecutar

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn `
  backend.app.main:app `
  --reload
```

## Pruebas y calidad

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests
.\backend\.venv\Scripts\python.exe -m ruff check .\backend
.\backend\.venv\Scripts\python.exe -m ruff format --check .\backend
.\backend\.venv\Scripts\python.exe -m compileall -q .\backend
```

## Endpoints

| Método | Endpoint | Propósito |
|---|---|---|
| GET | `/health` | Disponibilidad básica del proceso |
| GET | `/ready` | Acceso a base y almacenamiento |
| GET | `/api/v1/status` | Estado de API v1 |
| GET | `/api/v1/capabilities` | Capacidades realmente ejecutables |
| POST | `/api/v1/sources/ingest` | Registrar y perfilar una fuente real |
| GET | `/api/v1/sources` | Listar catálogo persistente |
| GET | `/api/v1/sources/{id}` | Recuperar fuente y perfil |
| POST | `/api/v1/sources/{id}/reprofile` | Confirmar encabezados y recalcular |
| DELETE | `/api/v1/sources/{id}` | Eliminar fuente y perfil |

## Límites declarados

- La carga y el perfilado todavía permanecen ligados a la petición HTTP.
- No existen aún cargas fragmentadas reanudables.
- No existen aún trabajos durables en segundo plano.
- No existen aún conectores SQL institucionales.
- No existen aún ejecutores generales de transformación, estadística, anomalías o documentos.
- No existe aún un planificador de IA autorizado a ejecutar capacidades.

Estos límites se exponen también en el catálogo de capacidades para evitar que el frontend prometa funciones inexistentes.
