import { cached, TTL } from "../lib/cache.js";
import { fetchJson, HttpError, internalJson, mapLimit } from "../lib/http.js";
import type { League } from "../types.js";

const OPEN_API = "https://open.faceit.com/data/v4";
// Endpoints internos de Faceit (liga, clasificación, calendario). Se usan bajo
// api.faceit.com: www.faceit.com está detrás de Cloudflare, que bloquea las
// peticiones desde servidores (p. ej. Render).
const WEB_API = "https://api.faceit.com";
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

// Historial de un jugador (API oficial): una página de hasta 100 partidos
// desde `fromSec` (segundos unix), del más reciente al más antiguo.
function getPlayerHistoryPage(playerId: string, fromSec: number, offset: number) {
  return cached(`player-history:${playerId}:${fromSec}:${offset}`, 10 * TTL.minute, async () => {
    const data = await fetchJson(
      `${OPEN_API}/players/${enc(playerId)}/history?game=cs2&from=${fromSec}&offset=${offset}&limit=100`,
      { auth: true },
    );
    return (data?.items ?? []) as any[];
  });
}

const HISTORY_DAYS = 180;
const HISTORY_MAX_PAGES = 10;

// Partidos recientes del equipo (API oficial). La Data API no tiene historial
// por equipo, así que se recorre el historial de cada miembro y se quedan los
// partidos en los que uno de los bandos es este equipo. El endpoint interno
// que lo daba directamente está bloqueado por Cloudflare desde servidores.
export function getMatchHistory(teamId: string, memberIds: string[]) {
  // Redondeado al día: así la clave de caché no cambia en cada petición.
  const fromSec = Math.floor((Date.now() - HISTORY_DAYS * TTL.day) / TTL.day) * 86_400;

  return cached(`team-history:${teamId}:${fromSec}`, 10 * TTL.minute, async () => {
    const found = new Map<string, number>();

    const scan = async (playerId: string) => {
      for (let page = 0; page < HISTORY_MAX_PAGES; page++) {
        const items = await getPlayerHistoryPage(playerId, fromSec, page * 100);
        for (const m of items) {
          // Sin started_at = nunca se jugó (walkover / forfeit): no aporta nada.
          if (!m.started_at) continue;
          if (m.teams?.faction1?.team_id === teamId || m.teams?.faction2?.team_id === teamId) {
            found.set(m.match_id, m.started_at * 1000);
          }
        }
        if (items.length < 100) break;
      }
    };

    // Los jugadores que fallen (perfil privado, borrado...) no tumban el resto.
    await mapLimit(memberIds, 4, scan);

    return [...found.entries()]
      .map(([matchId, date]) => ({ matchId, date }))
      .sort((a, b) => b.date - a.date);
  });
}

// ELO actual de un jugador en CS2 (API oficial). null si no tiene.
export function getPlayerElo(playerId: string) {
  return cached(`player-elo:${playerId}`, TTL.hour, async () => {
    const data = await orNull(fetchJson(`${OPEN_API}/players/${enc(playerId)}`, { auth: true }));
    const elo = Number(data?.games?.cs2?.faceit_elo);
    return elo > 0 ? elo : null;
  });
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
//
// Cloudflare la bloquea desde servidores (Render): tras el primer fallo se deja
// de intentar durante una hora. Si no, cada partido esperaría al reintento con
// curl y el análisis tardaría minutos.
let matchV2BlockedUntil = 0;

export async function getMatchDetailsV2(matchId: string) {
  if (Date.now() < matchV2BlockedUntil) return null;
  try {
    return await cached(
      `matchv2:${matchId}`,
      (data: any) => (data?.status === "FINISHED" ? TTL.month : TTL.minute),
      async () => (await internalJson(`https://api.faceit.com/match/v2/match/${enc(matchId)}`))?.payload ?? null,
    );
  } catch (error) {
    // Cualquier fallo (403 de Cloudflare, curl colgado hasta su timeout...):
    // el ELO por partido es opcional, no merece la pena seguir esperando.
    matchV2BlockedUntil = Date.now() + TTL.hour;
    console.warn(`[matchv2] no disponible (${(error as Error).message.slice(0, 80)}): se omite el ELO por partido durante 1 h`);
    return null;
  }
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
