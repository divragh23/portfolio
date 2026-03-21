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

const teams = [
  {
    key: "lakers",
    team: "Lakers",
    label: "Latest Highlights",
    queries: [
      "Los Angeles Lakers game highlights",
      "Lakers highlights",
    ],
    preferredChannels: ["NBA", "ESPN", "House of Highlights", "Bleacher Report"],
    requiredTerms: ["lakers", "los angeles lakers"],
  },
  {
    key: "dodgers",
    team: "Dodgers",
    label: "Latest Highlights",
    queries: [
      "Los Angeles Dodgers game highlights",
      "Dodgers highlights",
    ],
    preferredChannels: ["MLB", "Los Angeles Dodgers", "ESPN"],
    requiredTerms: ["dodgers", "los angeles dodgers"],
  },
  {
    key: "uconn",
    team: "UConn Men’s Basketball",
    label: "Latest Highlights",
    queries: [
      "UConn men's basketball highlights",
      "UConn Huskies basketball highlights",
    ],
    preferredChannels: ["NCAA March Madness", "UConn Huskies", "BIG EAST Conference", "ESPN"],
    requiredTerms: ["uconn", "huskies"],
  },
];

const publishedAfter = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
const existing = await readExistingHighlights();
const existingByKey = new Map(existing.items.map((item) => [item.key, item]));

const items = [];

for (const team of teams) {
  const candidates = await fetchCandidates(team);
  const best = rankCandidates(team, candidates)[0];

  if (!best) {
    const previous = existingByKey.get(team.key);
    items.push({
      key: team.key,
      team: team.team,
      label: team.label,
      videoId: null,
      title: null,
      publishedAt: null,
      channelTitle: null,
      watchUrl: null,
      previewSeconds: previous?.previewSeconds ?? 30,
      boxScore: previous?.boxScore ?? null,
      fallbackMessage: "No recent highlights available from the configured search queries.",
    });
    continue;
  }

  const previous = existingByKey.get(team.key);

  items.push({
    key: team.key,
    team: team.team,
    label: team.label,
    videoId: best.id.videoId,
    title: best.snippet.title,
    publishedAt: best.snippet.publishedAt,
    channelTitle: best.snippet.channelTitle,
    watchUrl: `https://www.youtube.com/watch?v=${best.id.videoId}`,
    previewSeconds: previous?.previewSeconds ?? 30,
    boxScore: previous?.boxScore ?? null,
    fallbackMessage: null,
  });
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

async function fetchCandidates(team) {
  const batches = await Promise.all(team.queries.map((query) => searchYouTube(query)));
  return batches.flat();
}

async function searchYouTube(query) {
  const params = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    type: "video",
    order: "date",
    maxResults: "10",
    q: query,
    publishedAfter,
    videoEmbeddable: "true",
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

function rankCandidates(team, candidates) {
  return candidates
    .map((item) => ({
      item,
      score: scoreCandidate(team, item),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
}

function scoreCandidate(team, item) {
  const title = item.snippet.title.toLowerCase();
  const channel = item.snippet.channelTitle.toLowerCase();
  let score = 0;

  if (title.includes("highlight")) score += 12;
  if (title.includes("highlights")) score += 6;
  if (title.includes("recap")) score += 3;
  if (title.includes("shorts")) score -= 20;
  if (title.includes("press conference")) score -= 25;
  if (title.includes("postgame")) score -= 10;
  if (title.includes("live")) score -= 15;

  for (const term of team.requiredTerms) {
    if (title.includes(term)) score += 10;
  }

  for (const channelName of team.preferredChannels) {
    if (channel.includes(channelName.toLowerCase())) score += 18;
  }

  return score;
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
