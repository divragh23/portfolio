import React, { useEffect, useId, useRef, useState, useTransition } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";

const panelEase = [0.22, 1, 0.36, 1];
const cardTransition = { duration: 0.52, ease: panelEase };
const maxHostedApiBytes = 4.7 * 1024 * 1024;

const projects = [
  {
    id: "traffic-sign-detection",
    label: "Traffic Sign Detection Model",
    eyebrow: "Featured Project",
    title: "Traffic Sign Detection Model",
    subtitle: "Live object detection workspace",
    teaser: "Upload an image or capture a frame to detect traffic signs through a secure server-side model proxy.",
    description:
      "A custom computer vision project that detects real-world traffic signs from uploaded images or live camera input using a Roboflow-trained object detection model.",
    stack: ["Python", "Roboflow", "Computer Vision", "Object Detection", "Webcam Inference"],
    type: "traffic",
  },
  {
    id: "project-2",
    label: "Project 2",
    eyebrow: "Placeholder",
    title: "Project 2",
    subtitle: "Reserved showcase slot",
    teaser: "A future portfolio module for another interactive build.",
    description:
      "Coming soon. This card is reserved for the next polished project showcase in the portfolio.",
    type: "placeholder",
  },
  {
    id: "project-3",
    label: "Project 3",
    eyebrow: "Placeholder",
    title: "Project 3",
    subtitle: "Reserved showcase slot",
    teaser: "A future portfolio module for another interactive build.",
    description:
      "Coming soon. This card is reserved for the next polished project showcase in the portfolio.",
    type: "placeholder",
  },
  {
    id: "project-4",
    label: "Project 4",
    eyebrow: "Placeholder",
    title: "Project 4",
    subtitle: "Reserved showcase slot",
    teaser: "A future portfolio module for another interactive build.",
    description:
      "Coming soon. This card is reserved for the next polished project showcase in the portfolio.",
    type: "placeholder",
  },
];

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load preview image."));
    image.src = source;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function estimateBase64Bytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  const base64Length = commaIndex === -1 ? dataUrl.length : dataUrl.length - commaIndex - 1;

  return Math.ceil((base64Length * 3) / 4);
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function waitForVideoMetadata(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera feed took too long to initialize."));
    }, 6000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
    }

    function handleLoadedMetadata() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error("Live camera is unavailable on this device/browser."));
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);
  });
}

async function prepareImageForInference(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas image processing is unavailable.");
  }

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  const scale = Math.min(1, 1280 / Math.max(width, height));

  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const qualitySteps = [0.82, 0.74, 0.66];
  let bestCandidate = originalDataUrl;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#0b101b";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const candidate = canvas.toDataURL("image/jpeg", quality);
      bestCandidate = candidate;

      if (estimateBase64Bytes(candidate) <= maxHostedApiBytes) {
        return {
          dataUrl: candidate,
          width,
          height,
        };
      }
    }

    width = Math.max(1, Math.round(width * 0.82));
    height = Math.max(1, Math.round(height * 0.82));
  }

  return {
    dataUrl: bestCandidate,
    width,
    height,
  };
}

async function parsePredictionResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.ok === false) {
    const error = new Error(
      payload?.details || "Inference could not be completed. Please try another image."
    );

    error.title = payload?.error || "Inference failed.";
    error.details = payload?.details || "";
    throw error;
  }

  return payload;
}

function normalizePredictions(items = []) {
  return [...items].sort((first, second) => second.confidence - first.confidence);
}

async function drawDetections(canvas, source, predictions) {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }

  const image = await loadImage(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const strokeWidth = Math.max(2, Math.round(Math.min(width, height) / 220));
  const fontSize = Math.max(14, Math.round(width / 34));
  const labelPaddingX = Math.max(8, Math.round(fontSize * 0.42));
  const labelHeight = Math.round(fontSize * 1.5);

  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  context.lineWidth = strokeWidth;
  context.font = `600 ${fontSize}px "Space Grotesk", sans-serif`;
  context.textBaseline = "top";
  context.shadowColor = "rgba(10, 12, 20, 0.45)";
  context.shadowBlur = 14;

  predictions.forEach((prediction) => {
    const x = prediction.x - prediction.width / 2;
    const y = prediction.y - prediction.height / 2;
    const label = `${prediction.class} ${Math.round(prediction.confidence * 100)}%`;
    const labelWidth = context.measureText(label).width + labelPaddingX * 2;
    const labelX = Math.max(0, Math.min(width - labelWidth, x));
    const labelY = Math.max(0, y - labelHeight - 8);

    context.strokeStyle = "rgba(255, 214, 241, 0.96)";
    context.fillStyle = "rgba(255, 214, 241, 0.2)";
    context.beginPath();
    context.rect(x, y, prediction.width, prediction.height);
    context.stroke();
    context.fill();

    context.fillStyle = "rgba(14, 10, 22, 0.92)";
    context.fillRect(labelX, labelY, labelWidth, labelHeight);
    context.fillStyle = "#fff5fc";
    context.fillText(label, labelX + labelPaddingX, labelY + Math.round(fontSize * 0.18));
  });
}

function CollapsedProjectCard({ project, isFeatured, onOpen }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      layout
      layoutId={`project-card-${project.id}`}
      className={`panel projects-gallery-card ${isFeatured ? "projects-gallery-card--featured" : ""}`.trim()}
      initial={reducedMotion ? false : { opacity: 0, y: 18, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }
      }
      transition={cardTransition}
    >
      <div className="projects-gallery-card__body">
        <div className="projects-gallery-card__copy">
          <p className="projects-gallery-card__eyebrow">{project.eyebrow}</p>
          <h2>{project.title}</h2>
          <p className="projects-gallery-card__subtitle">{project.subtitle}</p>
          <p className="projects-gallery-card__teaser">{project.teaser}</p>
        </div>

        <div className="projects-gallery-card__footer">
          <span className="projects-gallery-card__state">
            {project.type === "traffic" ? "Interactive demo" : "Coming soon"}
          </span>
          <button
            type="button"
            className="button button-secondary projects-gallery-card__button"
            onClick={() => onOpen(project.id)}
            aria-label={`Open ${project.title}`}
          >
            Open Project
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function ExpandedProjectShell({ project, onClose, children }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      layout
      layoutId={`project-card-${project.id}`}
      className={`panel projects-gallery-card projects-gallery-card--expanded ${
        project.type === "traffic" ? "projects-gallery-card--featured" : ""
      }`.trim()}
      transition={cardTransition}
    >
      <motion.div
        className="projects-expanded-frame"
        initial={reducedMotion ? false : { opacity: 0, y: 18, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -14, filter: "blur(8px)" }}
        transition={{
          duration: reducedMotion ? 0.2 : 0.34,
          ease: panelEase,
          delay: reducedMotion ? 0 : 0.08,
        }}
      >
        <div className="projects-expanded-frame__top">
          <div className="projects-expanded-frame__header">
            <p className="eyebrow">{project.eyebrow}</p>
            <h2>{project.title}</h2>
            <p className="projects-expanded-frame__summary">{project.description}</p>
          </div>

          <button
            type="button"
            className="button button-secondary projects-expanded-frame__close"
            onClick={onClose}
            aria-label={`Close ${project.title}`}
          >
            Back
          </button>
        </div>

        {children}
      </motion.div>
    </motion.article>
  );
}

function PlaceholderProjectContent({ project }) {
  return (
    <div className="projects-placeholder-expanded">
      <div className="projects-placeholder-expanded__copy">
        <p className="projects-placeholder-copy">Coming soon</p>
        <p>{project.description}</p>
      </div>
    </div>
  );
}

function TrafficSignProjectContent({ project }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [previewSource, setPreviewSource] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [resultMessage, setResultMessage] = useState("Upload an image or start the camera to begin.");
  const [statusText, setStatusText] = useState("Secure inference ready.");
  const [statusTone, setStatusTone] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [hasRunInference, setHasRunInference] = useState(false);
  const liveRegionId = useId();

  function updateStatus(text, tone = "idle") {
    setStatusText(text);
    setStatusTone(tone);
  }

  function releaseCameraStream() {
    const currentStream = streamRef.current;

    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  function stopCamera(options = {}) {
    const { preserveStatus = false } = options;

    releaseCameraStream();
    setIsCameraVisible(false);
    setIsCameraReady(false);

    if (!preserveStatus) {
      updateStatus("Camera stopped.", "idle");
      setResultMessage("Live feed ended. Upload an image or restart the camera.");
    }
  }

  useEffect(() => {
    return () => {
      releaseCameraStream();
    };
  }, []);

  async function renderPreviewFrame(source, nextPredictions = []) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    await drawDetections(canvas, source, nextPredictions);
  }

  useEffect(() => {
    if (!previewSource || isCameraVisible) {
      return;
    }

    let cancelled = false;

    renderPreviewFrame(previewSource, predictions).catch((error) => {
      if (!cancelled) {
        console.error("[TrafficSignProject] Preview render failed", error);
        setErrorMessage((current) => current || "Preview rendering failed. Please try another image.");
        updateStatus("Preview unavailable.", "error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isCameraVisible, predictions, previewSource]);

  async function requestPrediction({ image, name, statusMessage }) {
    updateStatus(statusMessage, "working");
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image, name }),
    });

    updateStatus("Analyzing detections...", "working");
    await waitForNextPaint();

    return parsePredictionResponse(response);
  }

  async function runInference({ source, request, sourceLabel }) {
    setIsBusy(true);
    setErrorMessage("");
    setPreviewSource(source);
    setPreviewLabel(sourceLabel);
    setPredictions([]);
    setHasRunInference(false);
    setResultMessage("Waiting for detector response.");

    try {
      const payload = await request();
      const nextPredictions = normalizePredictions(payload?.predictions || []);

      setPredictions(nextPredictions);
      setHasRunInference(true);
      setResultMessage(
        nextPredictions.length
          ? `Detected ${nextPredictions.length} traffic sign${nextPredictions.length === 1 ? "" : "s"}.`
          : "No objects detected."
      );
      updateStatus("Detection complete.", nextPredictions.length ? "success" : "idle");
    } catch (error) {
      console.error("[TrafficSignProject] Inference request failed", error);
      updateStatus(error.title || "Inference failed.", "error");
      setErrorMessage(
        error.message || "Inference could not be completed. Please try another image."
      );
      setResultMessage("");
      setPredictions([]);
      setHasRunInference(false);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUploadChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    stopCamera({ preserveStatus: true });
    setErrorMessage("");
    setPredictions([]);
    setHasRunInference(false);
    updateStatus("Preparing image...", "working");
    setResultMessage("Optimizing the upload for secure inference.");

    try {
      const preparedImage = await prepareImageForInference(file);

      setPreviewSource(preparedImage.dataUrl);
      setPreviewLabel(`${file.name} · ${preparedImage.width}x${preparedImage.height}`);
      await waitForNextPaint();

      await runInference({
        source: preparedImage.dataUrl,
        sourceLabel: file.name,
        request: () =>
          requestPrediction({
            image: preparedImage.dataUrl,
            name: file.name,
            statusMessage: "Sending to secure inference...",
          }),
      });
    } catch (error) {
      console.error("[TrafficSignProject] Upload preparation failed", error);
      updateStatus("Image payload invalid.", "error");
      setErrorMessage(error.message || "Please choose a valid JPG, PNG, or WEBP image.");
      setResultMessage("");
      setPredictions([]);
      setHasRunInference(false);
    }
  }

  async function handleStartCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      updateStatus("Camera unavailable.", "error");
      setErrorMessage("Live camera is unavailable on this device/browser.");
      setResultMessage("");
      return;
    }

    stopCamera({ preserveStatus: true });
    setIsStartingCamera(true);
    setIsCameraVisible(true);
    setIsCameraReady(false);
    setPreviewSource("");
    setPreviewLabel("Live camera preview");
    setPredictions([]);
    setHasRunInference(false);
    setErrorMessage("");
    setResultMessage("Waiting for the live feed to come online.");
    updateStatus("Requesting camera access...", "working");

    try {
      await waitForNextPaint();

      const videoElement = videoRef.current;

      if (!videoElement) {
        throw new Error("Camera preview could not be mounted.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      videoElement.srcObject = stream;
      updateStatus("Initializing live feed...", "working");

      await waitForVideoMetadata(videoElement);
      await videoElement.play();

      setIsCameraReady(true);
      updateStatus("Camera ready.", "success");
      setResultMessage("Capture a frame to analyze detections.");
    } catch (error) {
      console.error("[TrafficSignProject] Camera initialization failed", error);
      releaseCameraStream();
      setIsCameraVisible(false);
      setIsCameraReady(false);

      if (error.name === "NotAllowedError") {
        updateStatus("Camera access denied.", "error");
        setErrorMessage("Camera permission was denied.");
      } else if (error.name === "NotFoundError") {
        updateStatus("Camera unavailable.", "error");
        setErrorMessage("No camera was found on this device.");
      } else {
        updateStatus("Camera unavailable.", "error");
        setErrorMessage(error.message || "Live camera is unavailable on this device/browser.");
      }

      setResultMessage("");
    } finally {
      setIsStartingCamera(false);
    }
  }

  async function handleCaptureFrame() {
    const video = videoRef.current;

    if (!video || !isCameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      updateStatus("Camera not ready.", "error");
      setErrorMessage("Camera preview is not ready yet. Please try again in a moment.");
      setResultMessage("");
      return;
    }

    updateStatus("Capturing frame...", "working");
    setErrorMessage("");

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;
    frameCanvas.getContext("2d")?.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    const dataUrl = frameCanvas.toDataURL("image/jpeg", 0.82);

    stopCamera({ preserveStatus: true });
    setPreviewSource(dataUrl);
    setPreviewLabel("Captured frame");
    await waitForNextPaint();

    await runInference({
      source: dataUrl,
      sourceLabel: "Captured frame",
      request: () =>
        requestPrediction({
          image: dataUrl,
          name: "captured-frame.jpg",
          statusMessage: "Sending frame to secure inference...",
        }),
    });
  }

  return (
    <div className="projects-expanded-content">
      <ul className="chip-list projects-tech-stack" aria-label="Technology stack">
        {project.stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <div className="projects-action-row">
        <button
          type="button"
          className="button button-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy || isStartingCamera}
        >
          Upload Image
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={handleStartCamera}
          disabled={isBusy || isStartingCamera || isCameraVisible}
        >
          {isStartingCamera ? "Starting Camera..." : "Use Camera"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={handleCaptureFrame}
          disabled={isBusy || !isCameraReady}
        >
          Capture Frame
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => stopCamera()}
          disabled={!isCameraVisible}
        >
          Stop Camera
        </button>
      </div>

      <div
        className={`projects-status projects-status--${statusTone}`.trim()}
        role="status"
        aria-live="polite"
      >
        <span className="projects-status__dot" aria-hidden="true"></span>
        <span>{statusText}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="projects-hidden-input"
        onChange={handleUploadChange}
      />

      <div className="projects-workbench-grid">
        <section className="projects-preview" aria-label="Project preview">
          <div className="projects-preview__frame">
            {isCameraVisible ? (
              <video
                ref={videoRef}
                className="projects-preview__video"
                playsInline
                muted
                autoPlay
                aria-label="Live camera preview"
              />
            ) : previewSource ? (
              <canvas
                ref={canvasRef}
                className="projects-preview__canvas"
                aria-label={`Predicted traffic sign preview for ${previewLabel || "uploaded image"}`}
              />
            ) : (
              <div className="projects-preview__empty">
                <p>Upload an image or open the camera to begin.</p>
              </div>
            )}
          </div>
          <p className="projects-preview__caption">
            {previewLabel || "Secure inference happens through a server-side Roboflow proxy."}
          </p>
        </section>

        <aside className="projects-predictions" aria-labelledby={liveRegionId}>
          <div className="projects-predictions__header">
            <p className="eyebrow">Predictions</p>
            <h3 id={liveRegionId}>Detection results</h3>
          </div>

          {errorMessage ? (
            <p className="projects-feedback projects-feedback--error" role="alert">
              {errorMessage}
            </p>
          ) : (
            <p className="projects-feedback" aria-live="polite">
              {resultMessage}
            </p>
          )}

          {predictions.length ? (
            <ul className="projects-prediction-list">
              {predictions.map((prediction, index) => (
                <li key={`${prediction.class}-${prediction.confidence}-${index}`}>
                  <span>{prediction.class}</span>
                  <strong>{Math.round(prediction.confidence * 100)}%</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="projects-prediction-list projects-prediction-list--empty">
              <p>{hasRunInference ? "No objects detected." : "No predictions to display yet."}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ExpandedProjectCard({ project, onClose }) {
  return (
    <ExpandedProjectShell project={project} onClose={onClose}>
      {project.type === "traffic" ? (
        <TrafficSignProjectContent project={project} />
      ) : (
        <PlaceholderProjectContent project={project} />
      )}
    </ExpandedProjectShell>
  );
}

function ProjectsApp() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [isPending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();

  function openProject(projectId) {
    startTransition(() => {
      setSelectedProject(projectId);
    });
  }

  function closeProject() {
    startTransition(() => {
      setSelectedProject(null);
    });
  }

  return (
    <>
      <main className="projects-page-main">
        <section className="section projects-intro">
          <div className="panel page-hero-card projects-intro__card">
            <p className="eyebrow">Projects</p>
            <h1>Interactive builds, model work, and practical experiments.</h1>
            <p className="lede">
              Browse the project gallery below. Opening a card expands it into a focused showcase
              while the rest of the gallery steps away.
            </p>
          </div>
        </section>

        <section className="section projects-gallery-section" aria-label="Projects gallery">
          <LayoutGroup>
            <motion.div
              layout
              className={`projects-gallery ${selectedProject ? "is-expanded" : ""} ${
                isPending ? "is-pending" : ""
              }`.trim()}
              transition={cardTransition}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {projects.map((project, index) => {
                  const isSelected = selectedProject === project.id;

                  if (selectedProject && !isSelected) {
                    return null;
                  }

                  return isSelected ? (
                    <ExpandedProjectCard key={project.id} project={project} onClose={closeProject} />
                  ) : (
                    <CollapsedProjectCard
                      key={project.id}
                      project={project}
                      isFeatured={index === 0}
                      onOpen={openProject}
                    />
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </section>
      </main>

      <motion.footer
        className="footer"
        initial={reducedMotion ? false : { opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: reducedMotion ? 0.2 : 0.52, ease: panelEase, delay: reducedMotion ? 0 : 0.08 }}
      >
        <p>Divyansh Raghuvanshi · 2026</p>
        <p className="footer-tech">
          <span>Made with</span>
          <span className="footer-tech__item">
            <a
              className="footer-tech__link"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              <svg className="footer-tech__logo" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.95c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.18-1.52-1.18-1.52-.96-.66.07-.65.07-.65 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.46 1.15 3.06.88.1-.68.37-1.15.66-1.41-2.35-.27-4.82-1.18-4.82-5.24 0-1.16.41-2.12 1.09-2.86-.11-.27-.47-1.37.1-2.86 0 0 .89-.28 2.92 1.09a10.1 10.1 0 0 1 5.32 0c2.03-1.37 2.92-1.09 2.92-1.09.57 1.49.21 2.59.1 2.86.68.74 1.09 1.7 1.09 2.86 0 4.07-2.47 4.96-4.83 5.23.38.33.71.98.71 1.98v2.93c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
              </svg>
              <span className="footer-tech__label">Github</span>
            </a>
          </span>
          <span>and</span>
          <span className="footer-tech__item">
            <a
              className="footer-tech__link"
              href="https://code.visualstudio.com/"
              target="_blank"
              rel="noreferrer"
            >
              <svg className="footer-tech__logo" viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <path
                  d="M18.9 2.2 11.1 9.2 7.2 6.2 3.8 7.9v8.2l3.4 1.7 3.9-3 7.8 7 2.3-1.1V3.3l-2.3-1.1Z"
                  fill="#0065A9"
                />
                <path d="M21.2 3.3v17.4l-2.3 1.1-7.8-7V9.2l7.8-7 2.3 1.1Z" fill="#007ACC" />
                <path d="m7.2 6.2 5.6 5.3-5.6 5.3-3.4-1.7v-1.6L8.6 12 3.8 8.1v-.2l3.4-1.7Z" fill="#1F9CF0" />
              </svg>
              <span className="footer-tech__label">Visual Studio Code</span>
            </a>
          </span>
        </p>
      </motion.footer>
    </>
  );
}

const projectsRoot = document.querySelector("#projects-showcase-root");

if (document.body?.dataset.page === "projects" && projectsRoot) {
  createRoot(projectsRoot).render(<ProjectsApp />);
}
