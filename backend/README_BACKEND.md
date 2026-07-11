# AuditFlow AI - Backend

## Estado

Primer flujo real de ingestión de fuentes tabulares.

## Tecnología

- Python 3.13
- FastAPI
- Uvicorn
- openpyxl

## Preparar entorno

Desde la raíz del repositorio:

```powershell
py -3.13 -m venv .\backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
```

## Ejecutar servidor

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
```

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Estado base del backend |
| GET | `/health` | Verificación de salud |
| GET | `/api/v1/status` | Estado de la API v1 |
| POST | `/api/v1/sources/ingest` | Almacena y perfila un CSV o XLSX real |

## Ingestión de fuentes

La ingestión actual:

1. valida que el archivo sea CSV o XLSX;
2. limita cada archivo a 25 MB;
3. almacena el archivo con un identificador interno;
4. calcula su SHA-256 durante la escritura;
5. obtiene hojas, filas, columnas, nulos y duplicados reales;
6. persiste el perfil resultante como JSON.

Los datos locales se almacenan en `backend/storage/`, directorio excluido de Git.

## Pruebas

```powershell
.\backend\.venv\Scripts\python.exe -m unittest discover `
  -s .\backend\tests `
  -p "test_*.py" `
  -v
```

## Estado actual

Checkpoint: v0.9.0 - Real source ingestion.
