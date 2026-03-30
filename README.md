# Portfolio Website

This portfolio now includes a secure Projects demo for traffic sign detection. The Roboflow API key stays on the server and is never shipped to the browser.

## Local setup

1. Create a `.env` file in the project root.
2. Add your Roboflow key:

```env
ROBOFLOW_API_KEY=your_key_here
PORT=3000
```

3. Install dependencies:

```bash
npm install
```

4. Build the browser bundles:

```bash
npm run build
```

5. Start the local server:

```bash
npm run dev
```

The site will be served from `http://localhost:3000`.

## Projects demo

- The Projects page includes an expandable Traffic Sign Detection workspace.
- Frontend requests go to `/api/predict`.
- `server.js` forwards inference requests to Roboflow using `ROBOFLOW_API_KEY` from your local `.env`.
- The frontend never receives the private API key.
