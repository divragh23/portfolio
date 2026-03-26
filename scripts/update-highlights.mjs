import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  throw new Error("Missing YOUTUBE_API_KEY. Add it as a GitHub Actions secret before running.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const outputFile = path.join(dataDir, "highlights.json");

const TEAM_CONFIGS = [
  {
    key: "lakers",
    team: "Lakers",
    searchName: "Los Angeles Lakers",
    sportPath: "basketball/nba",
    lookbackDays: 14,
    aliases: ["los angeles lakers", "lakers", "lal"],
    preferredChannels: ["nba", "espn", "house of highlights", "bleacher report", "tnt sports"],
    fallbackQueries: ["Los Angeles Lakers game highlights", "Lakers highlights"],
    scoreboardParams: {},
  },
  {
    key: "dodgers",
    team: "Dodgers",
    searchName: "Los Angeles Dodgers",
    sportPath: "baseball/mlb",
    lookbackDays: 30,
    aliases: ["los angeles dodgers", "dodgers", "lad"],
    preferredChannels: ["mlb", "los angeles dodgers", "espn", "fox sports"],
    fallbackQueries: [
      "Los Angeles Dodgers game highlights",
      "Dodgers highlights",
      "Dodgers spring training highlights",
    ],
    scoreboardParams: {},
  },
  {
    key: "uconn",
    team: "UConn Men’s Basketball",
    searchName: "UConn Huskies",
    sportPath: "basketball/mens-college-basketball",
    lookbackDays: 21,
    aliases: ["uconn huskies", "uconn", "connecticut huskies", "conn"],
    preferredChannels: [
      "march madness",
      "ncaa march madness",
      "uconn huskies",
      "big east conference",
      "espn",
      "fox sports",
      "cbs sports",
    ],
    fallbackQueries: [
      "UConn men's basketball highlights",
      "UConn Huskies basketball highlights",
      "UConn game highlights",
    ],
    scoreboardParams: { groups: "50" },
  },
];

const existing = await readExistingHighlights();
const existingByKey = new Map(existing.items.map((item) => [item.key, item]));
const items = [];

for (const team of TEAM_CONFIGS) {
  const latestGame = await fetchLatestGame(team);
  const candidates = await fetchCandidates(team, latestGame);
  const best = rankCandidates(team, latestGame, candidates)[0] || null;
  const previous = existingByKey.get(team.key);

  items.push(buildHighlightItem(team, latestGame, best, previous));
}

await mkdir(dataDir, { recursive: true });
await writeFile(
  outputFile,
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      items,
    },
    null,
    2
  ) + "\n"
);

async function fetchLatestGame(team) {
  let latestFallback = null;

  for (const date of getRecentDateStrings(team.lookbackDays)) {
    const events = await fetchScoreboardEvents(team, date);
    const matches = events
      .map((event) => mapGameFromEvent(team, event))
      .filter(Boolean)
      .sort((left, right) => new Date(right.date) - new Date(left.date));

    if (!matches.length) {
      continue;
    }

    if (!latestFallback) {
      latestFallback = matches[0];
    }

    const completed = matches.find((game) => game.completed && hasNumericScore(game));

    if (completed) {
      return completed;
    }
  }

  return latestFallback;
}

async function fetchScoreboardEvents(team, date) {
  const params = new URLSearchParams({
    dates: date,
    limit: "100",
    ...team.scoreboardParams,
  });
  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${team.sportPath}/scoreboard?${params}`
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ESPN scoreboard request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return Array.isArray(data.events) ? data.events : [];
}

function mapGameFromEvent(team, event) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors;

  if (!competition || !Array.isArray(competitors)) {
    return null;
  }

  const favorite = competitors.find((competitor) => matchesConfiguredTeam(team, competitor.team));

  if (!favorite) {
    return null;
  }

  const opponent = competitors.find((competitor) => competitor !== favorite);

  if (!opponent?.team) {
    return null;
  }

  return {
    team: team.team,
    opponent: opponent.team.shortDisplayName || opponent.team.displayName || opponent.team.name,
    opponentSearchName: opponent.team.displayName || opponent.team.shortDisplayName || opponent.team.name,
    teamScore: parseNumericScore(favorite.score),
    opponentScore: parseNumericScore(opponent.score),
    score: formatScore(parseNumericScore(favorite.score), parseNumericScore(opponent.score)),
    date: event.date || competition.date || null,
    completed: Boolean(competition.status?.type?.completed),
  };
}

function matchesConfiguredTeam(team, competitorTeam) {
  const haystack = [
    competitorTeam?.displayName,
    competitorTeam?.shortDisplayName,
    competitorTeam?.name,
    competitorTeam?.abbreviation,
    competitorTeam?.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return team.aliases.some((alias) => haystack.includes(alias));
}

async function fetchCandidates(team, latestGame) {
  const queries = buildSearchQueries(team, latestGame);
  const publishedAfter = buildPublishedAfter(latestGame?.date);
  const batches = await Promise.all(queries.map((query) => searchYouTube(query, publishedAfter)));
  return batches.flat();
}

function buildSearchQueries(team, latestGame) {
  const queries = [];

  if (latestGame?.opponentSearchName) {
    queries.push(`${team.searchName} vs ${latestGame.opponentSearchName} highlights`);
    queries.push(`${team.searchName} ${latestGame.opponentSearchName} game highlights`);
    queries.push(`${team.searchName} ${latestGame.opponentSearchName} full game highlights`);
  }

  queries.push(...team.fallbackQueries);

  return Array.from(new Set(queries));
}

function buildPublishedAfter(dateString) {
  const now = Date.now();
  const fallback = new Date(now - 1000 * 60 * 60 * 24 * 30);

  if (!dateString) {
    return fallback.toISOString();
  }

  const gameDate = new Date(dateString);

  if (Number.isNaN(gameDate.getTime())) {
    return fallback.toISOString();
  }

  return new Date(gameDate.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString();
}

async function searchYouTube(query, publishedAfter) {
  const params = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    type: "video",
    order: "date",
    maxResults: "12",
    q: query,
    publishedAfter,
    videoEmbeddable: "true",
    regionCode: "US",
    relevanceLanguage: "en",
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

function rankCandidates(team, latestGame, candidates) {
  const uniqueCandidates = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const videoId = candidate?.id?.videoId;

    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    uniqueCandidates.push(candidate);
  }

  return uniqueCandidates
    .map((item) => ({
      item,
      score: scoreCandidate(team, latestGame, item),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
}

function scoreCandidate(team, latestGame, item) {
  const title = normalizeText(item.snippet?.title);
  const description = normalizeText(item.snippet?.description);
  const channel = normalizeText(item.snippet?.channelTitle);
  const haystack = `${title} ${description}`;
  let score = 0;

  if (haystack.includes("game highlights")) score += 24;
  if (haystack.includes("full game highlights")) score += 18;
  if (haystack.includes("highlights")) score += 14;
  if (haystack.includes("highlight")) score += 8;
  if (haystack.includes("condensed game")) score += 12;
  if (haystack.includes("recap")) score += 8;
  if (haystack.includes("vs")) score += 6;
  if (haystack.includes(" at ")) score += 4;

  for (const alias of team.aliases) {
    if (title.includes(alias)) {
      score += 14;
    }
  }

  if (latestGame?.opponentSearchName) {
    for (const term of buildNameTerms(latestGame.opponentSearchName)) {
      if (term.length > 2 && haystack.includes(term)) {
        score += 6;
      }
    }
  }

  for (const channelName of team.preferredChannels) {
    if (channel.includes(channelName)) {
      score += 26;
    }
  }

  for (const phrase of [
    "reaction",
    "analysis",
    "rumor",
    "podcast",
    "interview",
    "press conference",
    "media availability",
    "live",
    "stream",
    "shorts",
    "2k",
    "mlb the show",
    "news",
  ]) {
    if (haystack.includes(phrase) || channel.includes(phrase)) {
      score -= 28;
    }
  }

  if (latestGame?.date) {
    const publishedAt = new Date(item.snippet?.publishedAt || "");
    const gameDate = new Date(latestGame.date);

    if (!Number.isNaN(publishedAt.getTime()) && !Number.isNaN(gameDate.getTime())) {
      const deltaDays = Math.abs(publishedAt.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24);

      if (deltaDays <= 3) score += 12;
      else if (deltaDays <= 7) score += 6;
    }
  }

  return score;
}

function buildHighlightItem(team, latestGame, best, previous) {
  const fallback = normalizeExistingItem(previous);
  const thumbnail = getBestThumbnail(best) || fallback.thumbnail || null;
  const url =
    (best?.id?.videoId ? `https://www.youtube.com/watch?v=${best.id.videoId}` : null) ||
    fallback.url ||
    null;

  return {
    key: team.key,
    team: team.team,
    opponent: latestGame?.opponent || fallback.opponent || "",
    score:
      latestGame?.score ||
      formatScore(latestGame?.teamScore, latestGame?.opponentScore) ||
      fallback.score ||
      "",
    teamScore: latestGame?.teamScore ?? fallback.teamScore ?? null,
    opponentScore: latestGame?.opponentScore ?? fallback.opponentScore ?? null,
    date: latestGame?.date || fallback.date || null,
    title: best?.snippet?.title || fallback.title || `${team.team} highlights`,
    url,
    videoId: best?.id?.videoId || fallback.videoId || null,
    thumbnail,
    channelTitle: best?.snippet?.channelTitle || fallback.channelTitle || "YouTube",
    fallbackMessage: url ? null : "Latest highlight unavailable right now.",
  };
}

function normalizeExistingItem(item) {
  if (!item) {
    return {};
  }

  const teamScore = parseNumericScore(item.teamScore ?? item.boxScore?.favoriteScore);
  const opponentScore = parseNumericScore(item.opponentScore ?? item.boxScore?.opponentScore);

  return {
    team: item.team || "",
    opponent: item.opponent || item.boxScore?.opponent || "",
    score: item.score || formatScore(teamScore, opponentScore),
    teamScore,
    opponentScore,
    date: item.date || item.boxScore?.date || item.publishedAt || null,
    title: item.title || "",
    url: item.url || item.watchUrl || (item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : null),
    videoId: item.videoId || null,
    thumbnail: item.thumbnail || getYouTubeThumbnail(item.videoId) || null,
    channelTitle: item.channelTitle || "YouTube",
  };
}

function getBestThumbnail(item) {
  const thumbnails = item?.snippet?.thumbnails;

  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    getYouTubeThumbnail(item?.id?.videoId)
  );
}

function getYouTubeThumbnail(videoId) {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

function getRecentDateStrings(days) {
  const dates = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    dates.push(date.toISOString().slice(0, 10).replaceAll("-", ""));
  }

  return dates;
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function buildNameTerms(name) {
  return normalizeText(name)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasNumericScore(game) {
  return Number.isFinite(game?.teamScore) && Number.isFinite(game?.opponentScore);
}

function parseNumericScore(score) {
  const value = Number(score);
  return Number.isFinite(value) ? value : null;
}

function formatScore(teamScore, opponentScore) {
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) {
    return "";
  }

  return `${teamScore}-${opponentScore}`;
}

async function readExistingHighlights() {
  try {
    const raw = await readFile(outputFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { items: [] };
  }
}
