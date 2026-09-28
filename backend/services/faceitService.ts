import { cached, TTL } from "../lib/cache.js";
import { curlJson, fetchJson, HttpError, internalJson } from "../lib/http.js";
import type { League } from "../types.js";

const OPEN_API = "https://open.faceit.com/data/v4";
const WEB_API = "https://www.faceit.com/api";
const enc = encodeURIComponent;

// null en vez de excepción cuando Faceit responde 404 (no existe / no aplica).
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

export function searchTeams(name: string) {
  return cached(`search:${name.toLowerCase()}`, 5 * TTL.minute, () =>
    fetchJson(`${OPEN_API}/search/teams?nickname=${enc(name)}&game=cs2&limit=20`, {
      auth: true,
    }),
  );
}

export function getTeamById(teamId: string) {
  return cached(`team:${teamId}`, TTL.hour, () =>
    fetchJson(`${OPEN_API}/teams/${enc(teamId)}`, { auth: true }),
  );
}

// Devuelve una fila por MAPA jugado (un BO3 aparece 2-3 veces), ordenadas por
// fecha descendente.
export function getMatchHistory(teamId: string, size = 150) {
  return cached(`history:${teamId}:${size}`, 5 * TTL.minute, () =>
    curlJson<any[]>(
      `${WEB_API}/stats/v1/stats/time/teams/${enc(teamId)}/games/cs2?page=0&size=${size}`,
    ),
  );
}

export function getMatchVetos(matchId: string) {
  return cached(
    `vetos:${matchId}`,
    (data: any) => (data?.payload?.tickets?.length ? TTL.month : TTL.minute),
    () => fetchJson(`https://api.faceit.com/democracy/v1/match/${enc(matchId)}/history`),
  );
}

export function getMatchData(matchId: string) {
  return cached(
    `match:${matchId}`,
    // Un partido terminado ya no cambia: se puede cachear mucho tiempo.
    (data: any) => (data?.status === "FINISHED" ? TTL.month : TTL.minute),
    () => fetchJson(`${OPEN_API}/matches/${enc(matchId)}`, { auth: true }),
  );
}

// Estadísticas por mapa y jugador. null si el partido no tiene (forfeit...).
export function getMatchStats(matchId: string) {
  return cached(
    `stats:${matchId}`,
    (data: any) => (data?.rounds?.length ? TTL.month : TTL.hour),
    () => orNull(fetchJson(`${OPEN_API}/matches/${enc(matchId)}/stats`, { auth: true })),
  );
}

// API interna del partido: trae el ELO de cada jugador en ese partido, que la
// Data API oficial no da. Sirve para medir la diferencia de nivel.
export function getMatchDetailsV2(matchId: string) {
  return cached(
    `matchv2:${matchId}`,
    (data: any) => (data?.status === "FINISHED" ? TTL.month : TTL.minute),
    async () => (await internalJson(`https://api.faceit.com/match/v2/match/${enc(matchId)}`))?.payload ?? null,
  );
}

// null si el equipo no está en ninguna liga ESEA (Faceit responde 404).
export function getCurrentLeague(teamId: string): Promise<League | null> {
  return cached(`league:${teamId}`, 10 * TTL.minute, async () => {
    const data = await orNull(
      fetchJson(`${WEB_API}/team-leagues/v1/teams/${enc(teamId)}/profile/leagues/current`),
    );

    const payload = data?.payload;
    const standing = payload?.season_standing;
    if (!payload || !standing) return null;

    const placement = Number(standing.placement?.left);

    return {
      league_name: payload.league_name,
      league_avatar: payload.league_avatar_img ?? null,
      championship_id: payload.championship_id || null,
      season_number: Number(payload.season_number),
      stage_name: standing.stage_name ?? null,
      division_name: standing.division_name,
      conference_name: standing.conference_name,
      region: standing.region_name,
      wins: Number(standing.wins) || 0,
      losses: Number(standing.losses) || 0,
      ties: Number(standing.ties) || 0,
      placement: placement > 0 ? placement : null,
    };
  });
}

// Todas las temporadas ESEA del equipo, con sus conferencias (una por fase).
export function getLeagueSummary(teamId: string) {
  return cached(`league-summary:${teamId}`, 10 * TTL.minute, async () => {
    const data = await orNull(
      internalJson(`${WEB_API}/team-leagues/v1/teams/${enc(teamId)}/profile/leagues/summary`),
    );
    return (data?.payload ?? []) as any[];
  });
}

// Una conferencia de ESEA es un "championship" de Faceit: aquí sale su id.
export function getConference(conferenceId: string) {
  return cached(`conference:${conferenceId}`, TTL.hour, async () => {
    const data = await orNull(internalJson(`${WEB_API}/team-leagues/v2/conferences/${enc(conferenceId)}`));
    return data?.payload ?? null;
  });
}

export function getStandings(conferenceId: string) {
  return cached(`standings:${conferenceId}`, 10 * TTL.minute, async () => {
    const data = await internalJson(
      `${WEB_API}/team-leagues/v2/standings?entityId=${enc(conferenceId)}&entityType=conference&offset=0&limit=100`,
    );
    return (data?.payload?.standings ?? []) as any[];
  });
}

// Partidos del equipo en un championship (conferencia de ESEA): jugados y por jugar.
export function getTeamChampionshipMatches(teamId: string, championshipId: string) {
  return cached(`champ-matches:${championshipId}:${teamId}`, 5 * TTL.minute, async () => {
    const data = await internalJson(
      `${WEB_API}/championships/v1/matches?participantId=${enc(teamId)}&participantType=TEAM&championshipId=${enc(championshipId)}&limit=50&offset=0`,
    );
    return (data?.payload?.items ?? []) as any[];
  });
}
