# Inference proxy (DigitalOcean)

A small FastAPI service that proxies image inference to Roboflow so the API
key never reaches the browser. The frontend on https://div23.app POSTs an
image to `/infer`; this service calls Roboflow with the server-side key and
returns the predictions.

## Deploy on DigitalOcean App Platform

1. Push this repo (the proxy lives in `/backend`).
2. In your existing DigitalOcean App, edit the component:
   - **Source Directory:** `/backend`  ← this is the fix for the buildpack
     error. Without it, DO tries to build the static website at the repo root
     and finds no buildpack.
   - DO will auto-detect the Python buildpack from `requirements.txt`.
   - **Run command** (if not auto-detected from the Procfile):
     `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **HTTP port:** `8080` (DO sets `$PORT`; the Procfile uses it).
3. Add environment variables (Settings -> App-Level / Component Env):
   - `ROBOFLOW_API_KEY` = your private Roboflow API key  (mark as **encrypted**)
   - `ROBOFLOW_MODEL_ID` = e.g. `traffic-signs/2`  (model slug `/` version)
   - `ALLOWED_ORIGINS` = `https://div23.app`
4. Deploy. Visit `https://<your-app>.ondigitalocean.app/` — you should see
   `{"status":"ok","model_configured":true,"key_configured":true}`.

## Point the frontend at it

In `demo.js` (repo root), set:

```js
const API_BASE = "https://<your-app>.ondigitalocean.app";
```

## Run locally

```bash
cd backend
pip install -r requirements.txt
export ROBOFLOW_API_KEY=...        # your private key
export ROBOFLOW_MODEL_ID=traffic-signs/2
uvicorn app:app --reload --port 8000
```
