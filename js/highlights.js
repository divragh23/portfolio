async function loadHighlights() {
  const root = document.querySelector("#highlights-grid");

  if (!root) {
    return;
  }

  try {
    const response = await fetch("data/highlights.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load highlights.json: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];

    root.innerHTML = items.map(renderHighlightCard).join("");
    window.refreshInteractiveCards?.();
  } catch (error) {
    console.error(error);
    root.innerHTML = [
      renderFallbackCard("Lakers"),
      renderFallbackCard("Dodgers"),
      renderFallbackCard("UConn Men’s Basketball"),
    ].join("");
    window.refreshInteractiveCards?.();
  }
}

function renderHighlightCard(item) {
  if (!item.videoId) {
    return renderFallbackCard(item.team, item.fallbackMessage);
  }

  const previewSeconds = Number.isFinite(Number(item.previewSeconds))
    ? Number(item.previewSeconds)
    : 30;
  const embedParams = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    loop: "1",
    playlist: item.videoId,
    start: "0",
    end: String(previewSeconds),
  });

  return `
    <article class="panel highlight-card" data-tilt>
      <div class="highlight-card__media">
        <iframe
          class="highlight-card__frame"
          src="https://www.youtube-nocookie.com/embed/${item.videoId}?${embedParams}"
          title="${escapeHtml(item.title || `${item.team} highlights`)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      <div class="highlight-card__body">
        <div class="highlight-card__top">
          <span class="highlight-card__label">${escapeHtml(item.label || "Latest Highlights")}</span>
          <span class="highlight-card__date">${formatDate(item.publishedAt)}</span>
        </div>
        <p class="highlight-card__team">${escapeHtml(item.team)}</p>
        <h3 class="highlight-card__title">${escapeHtml(item.title)}</h3>
        <p class="highlight-card__channel">${escapeHtml(item.channelTitle || "YouTube")}</p>
        ${renderBoxScore(item.boxScore)}
        <a class="highlight-card__link" href="${item.watchUrl}" target="_blank" rel="noreferrer">
          Watch on YouTube
        </a>
      </div>
    </article>
  `;
}

function renderFallbackCard(team, message = "No recent highlights available.") {
  return `
    <article class="panel highlight-card" data-tilt>
      <div class="highlight-card__empty">
        <p class="eyebrow">Latest Highlights</p>
        <h3>${escapeHtml(team)}</h3>
        <p class="highlight-card__fallback">${escapeHtml(message)}</p>
      </div>
    </article>
  `;
}

function renderBoxScore(boxScore) {
  if (!boxScore) {
    return "";
  }

  return `
    <div class="highlight-card__scorebox">
      <div class="highlight-card__scorehead">
        <span class="highlight-card__scorelabel">Box Score</span>
        <span class="highlight-card__scoredate">${escapeHtml(boxScore.date || "Unavailable")}</span>
      </div>
      <div class="highlight-card__scorerows">
        <div class="highlight-card__scorerow highlight-card__scorerow--favorite">
          <span>${escapeHtml(boxScore.favorite)}</span>
          <strong>${escapeHtml(boxScore.favoriteScore)}</strong>
        </div>
        <div class="highlight-card__scorerow">
          <span>${escapeHtml(boxScore.opponent)}</span>
          <strong>${escapeHtml(boxScore.opponentScore)}</strong>
        </div>
      </div>
    </div>
  `;
}

function formatDate(dateString) {
  if (!dateString) {
    return "Unavailable";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

loadHighlights();
