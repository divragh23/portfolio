document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const els = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
els.forEach((el) => io.observe(el));

document.querySelectorAll(".hero .reveal").forEach((el, i) => {
  el.style.transitionDelay = `${i * 90}ms`;
});

const bar = document.querySelector(".scroll-progress");
function updateProgress() {
  const h = document.documentElement;
  const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
  bar.style.transform = `scaleX(${scrolled})`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const glow = document.querySelector(".glow");
if (glow && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  let raf = null;
  window.addEventListener("mousemove", (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
      glow.style.opacity = "1";
      raf = null;
    });
  });
  document.addEventListener("mouseleave", () => (glow.style.opacity = "0"));
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*<>/\\{}[]";
function scramble(el, done) {
  const original = el.dataset.text;
  let frame = 0;
  const total = original.length;
  const interval = setInterval(() => {
    let out = "";
    for (let i = 0; i < total; i++) {
      const ch = original[i];
      if (ch === " " || ch === "\n") {
        out += ch;
      } else if (i < frame / 2) {
        out += ch;
      } else {
        out += CHARS[(Math.random() * CHARS.length) | 0];
      }
    }
    el.textContent = out;
    frame++;
    if (frame / 2 >= total) {
      clearInterval(interval);
      el.textContent = original;
      done && done();
    }
  }, 40);
}

const nameEl = document.querySelector(".hero h1");
if (nameEl) {
  const cursor = nameEl.querySelector(".cursor");
  const textNodes = "Divyansh\nRaghuvanshi";
  if (!reduceMotion) {
    const span = document.createElement("span");
    span.dataset.text = textNodes;
    span.style.whiteSpace = "pre-line";
    nameEl.innerHTML = "";
    nameEl.appendChild(span);
    if (cursor) nameEl.appendChild(cursor);
    setTimeout(() => scramble(span), 250);
  }
}
