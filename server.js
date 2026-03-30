const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const cors = require("cors");

const rootDir = __dirname;
const envPath = path.join(rootDir, ".env");
const maxHostedApiBytes = 5 * 1024 * 1024;
const maxRequestBodyBytes = 10 * 1024 * 1024;
const allowedFrontendOrigin = "https://div23.app";
const apiCors = cors({
  origin: allowedFrontendOrigin,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
});

function loadEnvFile(filePath) {
  return fs
    .readFile(filePath, "utf8")
    .then((contents) => {
      contents.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
          return;
        }

        const separatorIndex = trimmed.indexOf("=");

        if (separatorIndex === -1) {
          return;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const rawValue = trimmed.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, "");

        if (!(key in process.env)) {
          process.env[key] = value;
        }
      });
    })
    .catch(() => {
      // .env is optional in production environments.
    });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function runMiddleware(request, response, middleware) {
  return new Promise((resolve, reject) => {
    middleware(request, response, (result) => {
      if (result instanceof Error) {
        reject(result);
        return;
      }

      resolve();
    });
  });
}

function logPredict(level, message, details = {}) {
  const logger = console[level] || console.log;
  logger(`[api/predict] ${message}`, details);
}

function createRequestError(statusCode, error, details) {
  const issue = new Error(details || error);

  issue.statusCode = statusCode;
  issue.publicError = error;
  issue.publicDetails = details || error;
  return issue;
}

async function readRequestBody(request, maxBytes = maxRequestBodyBytes) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      throw createRequestError(
        413,
        "Image payload invalid.",
        "The uploaded image is too large. Try a smaller JPG, PNG, or WEBP image."
      );
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function stripDataUrlPrefix(value = "") {
  return value.replace(/^data:image\/[\w.+-]+;base64,/, "").trim();
}

function sanitizeFileName(value = "") {
  const fileName = String(value || "portfolio-upload.jpg")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return fileName || "portfolio-upload.jpg";
}

function normalizeBase64Image(value = "") {
  const normalized = stripDataUrlPrefix(value).replace(/\s/g, "");

  if (!normalized) {
    throw createRequestError(400, "Image payload invalid.", "Image payload is missing.");
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized)) {
    throw createRequestError(
      400,
      "Image payload invalid.",
      "Image payload is malformed. Please upload a valid JPG, PNG, or WEBP image."
    );
  }

  return normalized;
}

function estimateDecodedBase64Bytes(base64Value) {
  const normalizedLength = base64Value.replace(/=+$/, "").length;
  return Math.floor((normalizedLength * 3) / 4);
}

async function parseMultipartImage(bodyBuffer, contentType) {
  const request = new Request("http://localhost/api/predict", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: bodyBuffer,
  });
  const formData = await request.formData();
  const imageFile = formData.get("image") || formData.get("file");

  if (!imageFile || typeof imageFile.arrayBuffer !== "function") {
    throw createRequestError(400, "Image payload invalid.", "No image file was provided.");
  }

  const buffer = Buffer.from(await imageFile.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    name: sanitizeFileName(imageFile.name || "portfolio-upload.jpg"),
  };
}

function buildPredictErrorResponse(statusCode, error, details) {
  return {
    ok: false,
    error,
    details,
    statusCode,
  };
}

async function parsePredictRequest(request) {
  const bodyBuffer = await readRequestBody(request);
  const contentType = request.headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    let payload = null;

    try {
      payload = JSON.parse(bodyBuffer.toString("utf8"));
    } catch {
      throw createRequestError(400, "Image payload invalid.", "Request JSON could not be parsed.");
    }

    return {
      base64: normalizeBase64Image(payload?.image || ""),
      name: sanitizeFileName(payload?.name || "portfolio-upload.jpg"),
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const parsed = await parseMultipartImage(bodyBuffer, contentType);

    return {
      base64: normalizeBase64Image(parsed.base64),
      name: parsed.name,
    };
  }

  if (
    contentType.includes("text/plain") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    return {
      base64: normalizeBase64Image(bodyBuffer.toString("utf8")),
      name: "portfolio-upload.jpg",
    };
  }

  throw createRequestError(
    415,
    "Image payload invalid.",
    "Unsupported content type. Use JSON with a base64 image or multipart form upload."
  );
}

function getRoboflowFailureDetails(responseText) {
  const normalized = String(responseText || "").trim();

  if (!normalized) {
    return "Roboflow rejected the image payload.";
  }

  try {
    const parsed = JSON.parse(normalized);
    const detailText =
      parsed?.error ||
      parsed?.message ||
      parsed?.details ||
      parsed?.detail;

    if (detailText) {
      return String(detailText);
    }
  } catch {
    // Keep plain text fallback below.
  }

  if (/too large|payload|size/i.test(normalized)) {
    return "Roboflow rejected the image payload because it is too large.";
  }

  return normalized.slice(0, 240);
}

async function handlePredict(request, response) {
  if (request.method !== "POST") {
    sendJson(
      response,
      405,
      buildPredictErrorResponse(405, "Method not allowed.", "Use POST when sending images for inference.")
    );
    return;
  }

  const apiKey = process.env.ROBOFLOW_API_KEY;

  if (!apiKey) {
    sendJson(
      response,
      500,
      buildPredictErrorResponse(
        500,
        "Inference unavailable.",
        "The inference service is not configured."
      )
    );
    return;
  }

  try {
    const parsedRequest = await parsePredictRequest(request);
    const imageBytes = estimateDecodedBase64Bytes(parsedRequest.base64);

    if (!Number.isFinite(imageBytes) || imageBytes <= 0) {
      throw createRequestError(
        400,
        "Image payload invalid.",
        "Image payload is malformed. Please upload a valid image."
      );
    }

    if (imageBytes > maxHostedApiBytes) {
      throw createRequestError(
        413,
        "Image payload invalid.",
        "Image is too large for hosted inference. Try a smaller image."
      );
    }

    logPredict("info", "Forwarding image to Roboflow", {
      file: parsedRequest.name,
      kib: Math.round(imageBytes / 1024),
    });

    const inferenceUrl =
      "https://detect.roboflow.com/traffic-sign-object-detection-tl5qq/5" +
      `?api_key=${apiKey}&format=json&name=${encodeURIComponent(parsedRequest.name)}`;
    const inferenceResponse = await fetch(inferenceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        Accept: "application/json",
      },
      body: parsedRequest.base64,
    });
    const responseText = await inferenceResponse.text();

    if (!inferenceResponse.ok) {
      const roboflowDetails = getRoboflowFailureDetails(responseText);

      logPredict("error", "Roboflow returned a non-200 response", {
        file: parsedRequest.name,
        status: inferenceResponse.status,
        details: roboflowDetails,
      });

      sendJson(
        response,
        502,
        buildPredictErrorResponse(
          502,
          "Inference failed.",
          "The server could not complete inference for this image."
        )
      );
      return;
    }

    let payload = null;

    try {
      payload = JSON.parse(responseText);
    } catch {
      logPredict("error", "Roboflow returned an unexpected response body", {
        file: parsedRequest.name,
        bodyPreview: responseText.slice(0, 200),
      });

      sendJson(
        response,
        502,
        buildPredictErrorResponse(
          502,
          "Inference failed.",
          "Roboflow returned an unexpected response."
        )
      );
      return;
    }

    const predictions = Array.isArray(payload?.predictions) ? payload.predictions : [];

    logPredict("info", "Inference completed", {
      file: parsedRequest.name,
      predictions: predictions.length,
    });

    sendJson(response, 200, {
      ok: true,
      predictions,
      image: payload?.image || null,
      time: payload?.time ?? null,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const publicError = error.publicError || "Inference failed.";
    const publicDetails =
      error.publicDetails || "The server could not complete inference for this image.";

    logPredict("error", "Proxy request failed", {
      statusCode,
      error: error.message,
    });

    sendJson(response, statusCode, buildPredictErrorResponse(statusCode, publicError, publicDetails));
  }
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function resolveStaticPath(urlPathname) {
  const pathname = decodeURIComponent(urlPathname);
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const candidate = path.normalize(path.join(rootDir, normalized));

  if (!candidate.startsWith(rootDir)) {
    return null;
  }

  try {
    const stats = await fs.stat(candidate);

    if (stats.isDirectory()) {
      return path.join(candidate, "index.html");
    }

    return candidate;
  } catch {
    if (!path.extname(candidate)) {
      const directoryIndex = path.join(candidate, "index.html");

      try {
        await fs.access(directoryIndex);
        return directoryIndex;
      } catch {
        return null;
      }
    }

    return null;
  }
}

async function handleStaticRequest(request, response, pathname) {
  if (pathname === "/") {
    const fileContents = await fs.readFile(path.join(rootDir, "index.html"));
    response.writeHead(200, {
      "Content-Type": contentTypes[".html"],
      "Content-Length": fileContents.length,
    });
    response.end(fileContents);
    return;
  }

  const filePath = await resolveStaticPath(pathname);

  if (!filePath) {
    sendText(response, 404, "Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const fileContents = await fs.readFile(filePath);

  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream",
    "Content-Length": fileContents.length,
  });
  response.end(fileContents);
}

async function startServer() {
  await loadEnvFile(envPath);

  const port = Number(process.env.PORT || 3000);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/predict") {
      try {
        await runMiddleware(request, response, apiCors);
      } catch (error) {
        sendJson(response, 500, {
          ok: false,
          error: "CORS configuration failed.",
          details: error.message || "Unable to initialize API CORS.",
        });
        return;
      }

      if (response.writableEnded) {
        return;
      }

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      await handlePredict(request, response);
      return;
    }

    try {
      await handleStaticRequest(request, response, url.pathname);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: "Unable to serve the requested file.",
        details: error.message || "Static file handling failed.",
      });
    }
  });

  server.listen(port, () => {
    console.log(`Portfolio server running at http://localhost:${port}`);
  });
}

startServer();
