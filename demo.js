const API_BASE = "https://octopus-app-xnkn7.ondigitalocean.app";

const fileInput = document.getElementById("demo-file");
const camBtn = document.getElementById("demo-cam");
const snapBtn = document.getElementById("demo-snap");
const stopBtn = document.getElementById("demo-stop");
const video = document.getElementById("demo-video");
const canvas = document.getElementById("demo-canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("demo-status");
const resultsEl = document.getElementById("demo-results");

let stream = null;
let liveTimer = null;
let busy = false;

const setStatus = (msg) => (statusEl.textContent = msg);

function drawBoxes(predictions) {
  ctx.lineWidth = Math.max(2, canvas.width / 320);
  ctx.font = `${Math.max(13, canvas.width / 42)}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";
  resultsEl.innerHTML = "";

  predictions.forEach((p) => {
    const x = p.x - p.width / 2;
    const y = p.y - p.height / 2;
    ctx.strokeStyle = "#4ade80";
    ctx.strokeRect(x, y, p.width, p.height);

    const label = `${p.class} ${(p.confidence * 100).toFixed(0)}%`;
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(x, Math.max(0, y - 22), tw, 22);
    ctx.fillStyle = "#0a0a0b";
    ctx.fillText(label, x + 5, Math.max(2, y - 20));

    const li = document.createElement("li");
    li.textContent = label;
    resultsEl.appendChild(li);
  });

  if (!predictions.length) {
    resultsEl.innerHTML = "<li>No signs detected</li>";
  }
}

async function infer(blob) {
  if (busy) return;
  busy = true;
  setStatus("running inference…");
  try {
    const form = new FormData();
    form.append("image", blob, "frame.jpg");
    const res = await fetch(`${API_BASE}/infer`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = await res.json();
    drawBoxes(data.predictions || []);
    setStatus(`detected ${(data.predictions || []).length} sign(s)`);
  } catch (err) {
    setStatus(`error: ${err.message}`);
  } finally {
    busy = false;
  }
}

// --- image upload ---
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((b) => infer(b), "image/jpeg", 0.9);
  };
  img.src = URL.createObjectURL(file);
});

// --- webcam ---
function captureFrame() {
  if (!stream) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((b) => infer(b), "image/jpeg", 0.7);
}

camBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;
    await video.play();
    camBtn.hidden = true;
    snapBtn.hidden = false;
    stopBtn.hidden = false;
    setStatus("camera on — auto-capturing every ~1.5s");
    liveTimer = setInterval(captureFrame, 1500);
  } catch (err) {
    setStatus(`camera error: ${err.message}`);
  }
});

snapBtn.addEventListener("click", captureFrame);

stopBtn.addEventListener("click", () => {
  if (liveTimer) clearInterval(liveTimer);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  liveTimer = null;
  camBtn.hidden = false;
  snapBtn.hidden = true;
  stopBtn.hidden = true;
  setStatus("camera stopped");
});
// --- reveal the demo only when the project button is clicked ---
const demoLaunch = document.getElementById("demo-launch");
const demoSection = document.getElementById("demo");
if (demoLaunch && demoSection) {
  demoLaunch.addEventListener("click", () => {
    demoSection.hidden = false;
    // make sure the reveal-animated children become visible
    demoSection.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
