from fastapi import FastAPI
from backend.app.api.routes import router as api_router

app = FastAPI(
    title="AuditFlow AI API",
    version="0.3.2",
    description="Backend base for AuditFlow AI"
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "message": "AuditFlow AI backend running"
    }

@app.get("/health")
def health():
    return {
        "status": "ok"
    }
