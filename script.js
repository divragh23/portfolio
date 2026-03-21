const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initReveal() {
  const revealItems = document.querySelectorAll(".reveal");

  if (!revealItems.length) {
    return;
  }

  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function initTyping() {
  const target = document.querySelector(".typing-target");

  if (!target) {
    return;
  }

  const sequence = JSON.parse(target.dataset.typing || "[]");

  if (!sequence.length || prefersReducedMotion) {
    target.textContent = sequence.at(-1) || "";
    return;
  }

  for (let i = 0; i < sequence.length; i += 1) {
    const phrase = sequence[i];

    target.textContent = "";

    for (const letter of phrase) {
      target.textContent += letter;
      await sleep(80);
    }

    if (i < sequence.length - 1) {
      await sleep(850);

      while (target.textContent.length > 0) {
        target.textContent = target.textContent.slice(0, -1);
        await sleep(45);
      }
    }
  }
}

function initTilt() {
  const tiltItems = document.querySelectorAll("[data-tilt]");

  if (!tiltItems.length || prefersReducedMotion || window.innerWidth < 768) {
    return;
  }

  tiltItems.forEach((item) => {
    if (item.dataset.tiltReady === "true") {
      return;
    }

    item.dataset.tiltReady = "true";
    let frame = null;

    item.addEventListener("mousemove", (event) => {
      const rect = item.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width;
      const offsetY = (event.clientY - rect.top) / rect.height;
      const rotateY = (offsetX - 0.5) * 8;
      const rotateX = (0.5 - offsetY) * 8;
      item.style.setProperty("--pointer-x", `${offsetX * 100}%`);
      item.style.setProperty("--pointer-y", `${offsetY * 100}%`);

      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        item.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });
    });

    item.addEventListener("mouseleave", () => {
      item.style.transform = "";
      item.style.setProperty("--pointer-x", "50%");
      item.style.setProperty("--pointer-y", "50%");
    });
  });
}

window.refreshInteractiveCards = initTilt;

function initParticles() {
  const canvas = document.querySelector(".particles");

  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let animationFrame = null;
  let stars = [];
  let shootingStars = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    const density = Math.min(240, Math.max(120, Math.floor((width * height) / 9000)));

    stars = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.25,
      alpha: Math.random() * 0.48 + 0.12,
      drift: Math.random() * 0.16 + 0.02,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.006,
    }));
  }

  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * width * 0.9,
      y: Math.random() * height * 0.45,
      vx: Math.random() * 8 + 10,
      vy: Math.random() * 2.4 + 2.2,
      length: Math.random() * 120 + 90,
      life: 1,
      decay: Math.random() * 0.012 + 0.008,
    });
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      star.y -= star.drift;
      star.twinkle += star.twinkleSpeed;

      if (star.y < -4) {
        star.y = height + 4;
        star.x = Math.random() * width;
      }

      context.beginPath();
      context.fillStyle = `rgba(245, 238, 255, ${star.alpha + Math.sin(star.twinkle) * 0.08})`;
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });

    if (Math.random() < 0.018 && shootingStars.length < 3) {
      spawnShootingStar();
    }

    shootingStars = shootingStars.filter((star) => star.life > 0);

    shootingStars.forEach((star) => {
      const gradient = context.createLinearGradient(
        star.x,
        star.y,
        star.x - star.length,
        star.y - star.length * 0.24
      );

      gradient.addColorStop(0, `rgba(255, 244, 250, ${star.life})`);
      gradient.addColorStop(1, "rgba(255, 244, 250, 0)");

      context.beginPath();
      context.strokeStyle = gradient;
      context.lineWidth = 1.8;
      context.moveTo(star.x, star.y);
      context.lineTo(star.x - star.length, star.y - star.length * 0.24);
      context.stroke();

      star.x += star.vx;
      star.y += star.vy;
      star.life -= star.decay;
    });

    animationFrame = requestAnimationFrame(draw);
  }

  resize();

  if (!prefersReducedMotion) {
    draw();
    window.addEventListener("resize", resize);
  } else {
    stars.forEach((star) => {
      context.beginPath();
      context.fillStyle = `rgba(232, 240, 255, ${star.alpha})`;
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  window.addEventListener("beforeunload", () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });
}

function buildLinescoreTable(score) {
  const columns = score.columns
    .map((column) => `<th scope="col">${column}</th>`)
    .join("");

  const rows = score.rows
    .map((row) => {
      const cells = row.scores.map((value) => `<td>${value}</td>`).join("");
      return `<tr><th scope="row">${row.label}</th>${cells}<td><strong>${row.total}</strong></td></tr>`;
    })
    .join("");

  return `
    <table class="linescore">
      <thead>
        <tr>
          <th scope="col">Team</th>
          ${columns}
          <th scope="col">T</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function initScoreboard() {
  const root = document.querySelector("#scoreboard");

  if (!root || !window.SCOREBOARD_DATA) {
    return;
  }

  root.innerHTML = window.SCOREBOARD_DATA.map((entry) => {
    const notes = entry.notes.map((note) => `<li>${note}</li>`).join("");

    return `
      <article class="panel score-card" data-tilt>
        <div class="score-top">
          <div>
            <p class="eyebrow">${entry.league}</p>
            <h3>${entry.team}</h3>
          </div>
          <span class="score-date">${entry.date}</span>
        </div>

        <div class="score-line">
          <div class="score-row is-favorite">
            <span>${entry.team}</span>
            <strong>${entry.teamScore}</strong>
          </div>
          <div class="score-row">
            <span>${entry.opponent}</span>
            <strong>${entry.opponentScore}</strong>
          </div>
        </div>

        ${buildLinescoreTable(entry.linescore)}

        <ul class="score-notes">${notes}</ul>

        <a class="score-source" href="${entry.sourceUrl}" target="_blank" rel="noreferrer">
          ${entry.sourceLabel}
        </a>
      </article>
    `;
  }).join("");
}

initReveal();
initTyping();
initScoreboard();
initTilt();
initParticles();
