const HIGHLIGHTS_URL = "/data/highlights.json";
const HIGHLIGHT_TEAMS = [
  { key: "lakers", team: "Lakers" },
  { key: "dodgers", team: "Dodgers" },
  { key: "uconn", team: "UConn Men’s Basketball" },
];

async function loadHighlights() {
  const root = document.querySelector("#highlights-grid");

  if (!root) {
    return;
  }

  try {
    const response = await fetch(HIGHLIGHTS_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load ${HIGHLIGHTS_URL}: ${response.status}`);
    }

    const data = await response.json();
    const items = buildHighlightItems(data);

    root.innerHTML = items.map((item) => renderHighlightCard(item)).join("");
  } catch (error) {
    console.error("Unable to load hobbies highlights data.", error);
    root.innerHTML = HIGHLIGHT_TEAMS.map((team) =>
      renderFallbackCard({
        key: team.key,
        team: team.team,
        fallbackMessage: "Highlights are unavailable right now. Please check back soon.",
      })
    ).join("");
  }

  window.refreshInteractiveCards?.();
}

function buildHighlightItems(data) {
  const sourceItems = Array.isArray(data?.items) ? data.items : [];
  const normalizedItems = sourceItems
    .map((item) => normalizeHighlightItem(item))
    .filter(Boolean);
  const byKey = new Map(normalizedItems.map((item) => [item.key, item]));

  return HIGHLIGHT_TEAMS.map((team) => {
    const item = byKey.get(team.key);

    if (item) {
      return item;
    }

    return normalizeHighlightItem({
      key: team.key,
      team: team.team,
      fallbackMessage: "Highlights are unavailable right now. Please check back soon.",
    });
  });
}

function normalizeHighlightItem(raw) {
  if (!raw) {
    return null;
  }

  const key = raw.key || resolveTeamKey(raw.team);
  const team = raw.team || resolveTeamName(key);

  if (!key || !team) {
    return null;
  }

  const url = raw.url || raw.watchUrl || (raw.videoId ? `https://www.youtube.com/watch?v=${raw.videoId}` : "");
  const videoId = raw.videoId || getVideoIdFromUrl(url);
  const thumbnail =
    raw.thumbnail ||
    raw.thumbUrl ||
    raw.image ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
  const parsedScore = parseScore(raw.score);
  const teamScore = pickNumber(raw.teamScore, raw.boxScore?.favoriteScore, parsedScore.teamScore);
  const opponentScore = pickNumber(
    raw.opponentScore,
    raw.boxScore?.opponentScore,
    parsedScore.opponentScore
  );

  return {
    key,
    team,
    opponent: raw.opponent || raw.boxScore?.opponent || "",
    score: raw.score || formatScore(teamScore, opponentScore),
    teamScore,
    opponentScore,
    date: raw.date || raw.boxScore?.date || raw.publishedAt || "",
    title: raw.title || `${team} highlights`,
    url,
    videoId,
    thumbnail,
    channelTitle: raw.channelTitle || "YouTube",
    fallbackMessage: raw.fallbackMessage || "No recent highlights available.",
  };
}

function renderHighlightCard(item) {
  if (!item.url || !item.thumbnail) {
    return renderFallbackCard(item);
  }

  return `
    <article class="panel highlight-card" data-tilt>
      <a class="highlight-card__media highlight-card__media-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
        <img
          class="highlight-card__thumbnail"
          src="${escapeHtml(item.thumbnail)}"
          alt="${escapeHtml(item.title || `${item.team} highlight thumbnail`)}"
          loading="lazy"
        />
        <span class="highlight-card__play">Watch Highlight</span>
      </a>
      <div class="highlight-card__body">
        <div class="highlight-card__top">
          <span class="highlight-card__label">Latest Highlights</span>
          <span class="highlight-card__date">${formatDate(item.date)}</span>
        </div>
        <p class="highlight-card__team">${escapeHtml(formatMatchup(item.team, item.opponent))}</p>
        <h3 class="highlight-card__title">${escapeHtml(item.title)}</h3>
        ${renderLatestScore(item)}
        <p class="highlight-card__channel">${escapeHtml(item.channelTitle)}</p>
        <a class="highlight-card__link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          Open on YouTube
        </a>
      </div>
    </article>
  `;
}

function renderFallbackCard(item) {
  return `
    <article class="panel highlight-card" data-tilt>
      <div class="highlight-card__empty">
        <p class="eyebrow">Latest Highlights</p>
        <h3>${escapeHtml(item.team || "Highlights")}</h3>
        ${renderFallbackScore(item)}
        <p class="highlight-card__fallback">${escapeHtml(item.fallbackMessage || "No recent highlights available.")}</p>
      </div>
    </article>
  `;
}

function renderLatestScore(item) {
  if (!hasScore(item)) {
    return `
      <div class="highlight-card__scorebox">
        <div class="highlight-card__scorehead">
          <span class="highlight-card__scorelabel">Latest Score</span>
          <span class="highlight-card__scoredate">${formatDate(item.date)}</span>
        </div>
        <p class="highlight-card__fallback">Latest score unavailable.</p>
      </div>
    `;
  }

  return `
    <div class="highlight-card__scorebox">
      <div class="highlight-card__scorehead">
        <span class="highlight-card__scorelabel">Latest Score</span>
        <span class="highlight-card__scoredate">${formatDate(item.date)}</span>
      </div>
      <div class="highlight-card__scorerows">
        <div class="highlight-card__scorerow highlight-card__scorerow--favorite">
          <span>${escapeHtml(item.team)}</span>
          <strong>${escapeHtml(String(item.teamScore))}</strong>
        </div>
        <div class="highlight-card__scorerow">
          <span>${escapeHtml(item.opponent || "Opponent")}</span>
          <strong>${escapeHtml(String(item.opponentScore))}</strong>
        </div>
      </div>
    </div>
  `;
}

function renderFallbackScore(item) {
  if (!hasScore(item)) {
    return "";
  }

  return `
    <div class="highlight-card__scorebox">
      <div class="highlight-card__scorehead">
        <span class="highlight-card__scorelabel">Latest Score</span>
        <span class="highlight-card__scoredate">${formatDate(item.date)}</span>
      </div>
      <div class="highlight-card__scorerows">
        <div class="highlight-card__scorerow highlight-card__scorerow--favorite">
          <span>${escapeHtml(item.team)}</span>
          <strong>${escapeHtml(String(item.teamScore))}</strong>
        </div>
        <div class="highlight-card__scorerow">
          <span>${escapeHtml(item.opponent || "Opponent")}</span>
          <strong>${escapeHtml(String(item.opponentScore))}</strong>
        </div>
      </div>
    </div>
  `;
}

function resolveTeamKey(team) {
  const name = String(team || "").toLowerCase();

  return HIGHLIGHT_TEAMS.find((entry) => entry.team.toLowerCase() === name)?.key || "";
}

function resolveTeamName(key) {
  return HIGHLIGHT_TEAMS.find((entry) => entry.key === key)?.team || "";
}

function formatMatchup(team, opponent) {
  if (!opponent) {
    return team;
  }

  return `${team} vs ${opponent}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "Unavailable";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return String(dateString);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseScore(score) {
  const numbers = String(score || "").match(/\d+/g) || [];

  if (numbers.length < 2) {
    return {};
  }

  return {
    teamScore: Number(numbers[0]),
    opponentScore: Number(numbers[1]),
  };
}

function formatScore(teamScore, opponentScore) {
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) {
    return "";
  }

  return `${teamScore}-${opponentScore}`;
}

function pickNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function hasScore(item) {
  return Number.isFinite(item.teamScore) && Number.isFinite(item.opponentScore);
}

function getVideoIdFromUrl(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }

    return parsed.searchParams.get("v") || "";
  } catch {
    return "";
  }
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
