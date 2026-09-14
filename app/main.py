from fastapi import FastAPI

app = FastAPI(
    title="OpsPilot API",
    description="AI-powered workflow automation platform",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "opspilot-api"
    }