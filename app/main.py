from fastapi import FastAPI
from sqlalchemy import text

from app.database.session import engine
from app.api.auth import router as auth_router
from app.api.requests import router as requests_router
from app.api.approvals import router as approvals_router
from app.api.workflows import router as workflows_router

app = FastAPI(
    title="OpsPilot API",
    description="AI-powered workflow automation platform",
    version="0.1.0",
)
app.include_router(auth_router)
app.include_router(requests_router)
app.include_router(approvals_router)
app.include_router(workflows_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "opspilot-api",
    }


@app.get("/health/db")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "connected",
    }