from fastapi import FastAPI

app = FastAPI(title="WorldOfCodes Learning API", version="0.1.0")


@app.get("/api/health", tags=["Service"])
def health() -> dict[str, str]:
    return {"status": "ok"}
