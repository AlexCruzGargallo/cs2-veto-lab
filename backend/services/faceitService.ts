import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getTeam(teamName: string) {
  const response = await fetch(
    `https://open.faceit.com/data/v4/search/teams?nickname=${teamName}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
      },
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Faceit ${response.status}: ${raw}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON: ${raw}`);
  }
}

export async function getTeamById(teamId: string) {
  const response = await fetch(
    `https://open.faceit.com/data/v4/teams/${teamId}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
      },
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Faceit ${response.status}: ${raw}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON: ${raw}`);
  }
}

export async function getMatches(teamId: string) {
  // Cloudflare bloquea frecuentemente requests de Node fetch para este endpoint;
  // curl usa un fingerprint TLS/HTTP aceptado y evita el 403.
  const teamIdSafe = encodeURIComponent(teamId);
  const url = `https://www.faceit.com/api/stats/v1/stats/time/teams/${teamIdSafe}/games/cs2?page=0&size=30`;
  const curlCommand = process.platform === "win32" ? "curl.exe" : "curl";

  try {
    const { stdout } = await execFileAsync(curlCommand, [
      "--silent",
      "--show-error",
      "--fail-with-body",
      "-H",
      "User-Agent: PostmanRuntime/7.43.4",
      "-H",
      "Accept: */*",
      url,
    ]);
    return JSON.parse(stdout);
  } catch (error: any) {
    const details =
      error?.stderr || error?.stdout || error?.message || "Unknown error";
    throw new Error(`Faceit request failed: ${details}`);
  }
}

export async function getMatchVetos(matchId: string) {
  const response = await fetch(
    `https://api.faceit.com/democracy/v1/match/${matchId}/history`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Faceit ${response.status}: ${raw}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON: ${raw}`);
  }
}

export async function getMatchData(matchId: string) {
  const response = await fetch(
    `https://open.faceit.com/data/v4/matches/${matchId}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
      },
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Faceit ${response.status}: ${raw}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON: ${raw}`);
  }
}

export async function getESEALeague(teamId: string) {
  const response = await fetch(
    `https://www.faceit.com/api/team-leagues/v1/teams/${teamId}/profile/leagues/current`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    },
  );

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Faceit ${response.status}: ${raw}`);
  }

  try {
    const data = JSON.parse(raw)?.payload;

    return {
      league_name: data.league_name,
      division_name: data.season_standing.division_name,
      season_number: data.season_number,
      conference_name: data.season_standing.conference_name,
      region: data.season_standing.region_name,
      wins: data.season_standing.wins,
      losses: data.season_standing.losses,
      placement: data.season_standing.placement.left,
    };
  } catch {
    throw new Error(`Invalid JSON: ${raw}`);
  }
}
