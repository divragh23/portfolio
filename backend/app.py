"""Tiny inference proxy for the traffic-sign Roboflow model.

The browser never sees the Roboflow API key. It uploads an image to this
service, which forwards the request to Roboflow using the key stored in a
server-side environment variable, then returns the predictions.

Environment variables (set these in DigitalOcean -> App -> Settings -> Env):
  ROBOFLOW_API_KEY   your *private* Roboflow API key (kept server-side)
  ROBOFLOW_MODEL_ID  model + version, e.g. "traffic-signs/2"
  ALLOWED_ORIGINS    comma-separated origins allowed to call this API
                     (default: https://div23.app)
"""

import base64
import os

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")
ROBOFLOW_MODEL_ID = os.environ.get("ROBOFLOW_MODEL_ID", "")  # e.g. "traffic-signs/2"
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS", "https://div23.app,http://localhost:8000"
    ).split(",")
    if o.strip()
]

app = FastAPI(title="Roboflow inference proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    """Simple health check so you can verify the service is up."""
    return {
        "status": "ok",
        "model_configured": bool(ROBOFLOW_MODEL_ID),
        "key_configured": bool(ROBOFLOW_API_KEY),
    }


@app.post("/infer")
async def infer(
    image: UploadFile = File(...),
    confidence: float = 40,
    overlap: float = 30,
):
    """Forward an uploaded image to Roboflow and return the predictions."""
    if not ROBOFLOW_API_KEY or not ROBOFLOW_MODEL_ID:
        raise HTTPException(
            500, "Server missing ROBOFLOW_API_KEY or ROBOFLOW_MODEL_ID env vars"
        )

    raw = await image.read()
    if not raw:
        raise HTTPException(400, "Empty image upload")

    b64 = base64.b64encode(raw).decode("utf-8")

    async with httpx.AsyncClient(timeout=30) as client:
        rf = await client.post(
            f"https://detect.roboflow.com/{ROBOFLOW_MODEL_ID}",
            params={
                "api_key": ROBOFLOW_API_KEY,
                "confidence": confidence,
                "overlap": overlap,
                "format": "json",
            },
            content=b64,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if rf.status_code != 200:
        raise HTTPException(rf.status_code, f"Roboflow error: {rf.text[:300]}")

    return JSONResponse(rf.json())
