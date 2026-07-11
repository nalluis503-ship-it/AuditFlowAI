from fastapi import FastAPI

from backend.app.api.routes import router as api_router
from backend.app.api.source_routes import router as source_router

app = FastAPI(
    title="AuditFlow AI API",
    version="0.9.0",
    description="Backend for traceable audit source ingestion",
)

app.include_router(api_router)
app.include_router(source_router)


@app.get("/")
def root():
    return {
        "message": "AuditFlow AI backend running",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
    }
