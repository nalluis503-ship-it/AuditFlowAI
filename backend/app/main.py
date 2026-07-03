from fastapi import FastAPI

app = FastAPI(
    title="AuditFlow AI API",
    version="0.3.0",
    description="Backend base for AuditFlow AI"
)

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
