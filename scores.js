// Seeded scorebox data for the hobbies page.
// Replace this object with live API responses later if you want automatic updates.
// Suggested future integrations:
// - NBA: ESPN, NBA API, or The Sports DB
// - MLB: ESPN, MLB Stats API
// - NCAA MBB: ESPN or official school/team endpoints
// Keep the shape of each object the same so the rendering code in script.js does not need to change.

window.SCOREBOARD_DATA = [
  {
    team: "Lakers",
    league: "NBA",
    date: "March 10, 2026",
    opponent: "Timberwolves",
    teamScore: 120,
    opponentScore: 106,
    linescore: {
      columns: ["1", "2", "3", "4"],
      rows: [
        { label: "LAL", scores: [16, 29, 39, 36], total: 120 },
        { label: "MIN", scores: [21, 24, 23, 38], total: 106 },
      ],
    },
    notes: [
      "Luka Doncic finished with 31 points, 11 rebounds, and 11 assists.",
      "Austin Reaves added 31 points and 8 assists.",
      "This was the latest verified completed Lakers box score used during the March 21, 2026 build.",
    ],
    sourceLabel: "Source: FOX Sports box score",
    sourceUrl:
      "https://www.foxsports.com/nba/minnesota-timberwolves-vs-los-angeles-lakers-mar-10-2026-game-boxscore-44424",
  },
  {
    team: "Dodgers",
    league: "MLB Spring Training",
    date: "March 10, 2026",
    opponent: "Diamondbacks",
    teamScore: 4,
    opponentScore: 1,
    linescore: {
      columns: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      rows: [
        { label: "ARI", scores: [1, 0, 0, 0, 0, 0, 0, 0, 0], total: 1 },
        { label: "LAD", scores: [1, 0, 0, 2, 0, 1, 0, 0, "-"], total: 4 },
      ],
    },
    notes: [
      "Freddie Freeman went 2-for-3 with 1 RBI.",
      "Tyler Glasnow earned the win with 5 strikeouts in 4.1 innings.",
      "This is seeded with the latest verified completed Dodgers box score captured during the build.",
    ],
    sourceLabel: "Source: ESPN box score",
    sourceUrl: "https://www.espn.com/mlb/boxscore/_/gameId/401833139",
  },
  {
    team: "UConn Men’s Basketball",
    league: "NCAA Men’s Basketball",
    date: "March 7, 2026",
    opponent: "Marquette",
    teamScore: 62,
    opponentScore: 68,
    linescore: {
      columns: ["1", "2"],
      rows: [
        { label: "UConn", scores: [35, 27], total: 62 },
        { label: "MARQ", scores: [33, 35], total: 68 },
      ],
    },
    notes: [
      "Silas Demary Jr. scored 17 points and had 8 assists.",
      "Tarris Reed Jr. finished with 16 points and 10 rebounds.",
      "This uses the latest verified official UConn result available during the March 21, 2026 build.",
    ],
    sourceLabel: "Source: ESPN recap",
    sourceUrl: "https://www.espn.com/mens-college-basketball/recap/_/gameId/401822973",
  },
];
