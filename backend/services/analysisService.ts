import { rememberTeamMatches, knownTeamMatches } from "../lib/db.js";
import { mapLimit } from "../lib/http.js";
import type {
  AnalyzedMatch,
  League,
  MapResult,
  PlayerMapStats,
  Result,
  RosterPlayer,
  TeamAnalysis,
  VetoStep,
} from "../types.js";
import {
  getCurrentLeague,
  getMatchData,
  getMatchDetailsV2,
  getMatchHistory,
  getMatchStats,
  getMatchVetos,
  getTeamById,
} from "./faceitService.js";

type Faction = "faction1" | "faction2";

const MAX_CONCURRENT_REQUESTS = 4;

// Organizador "ESEA" en Faceit. Los nombres de competición de la liga no
// siempre incluyen "ESEA" (p. ej. "S58 OCE Intermediate Central - Playoffs").
export const ESEA_ORGANIZER_ID = "08b06cfc-74d0-454b-9a51-feda4b6b18da";

export async function getTeamAnalysis(teamId: string, limit = 60): Promise<TeamAnalysis> {
  // El equipo es obligatorio (si no existe, 404). La liga y el historial no:
  // un equipo sin liga ESEA o sin partidos sigue siendo analizable.
  const [team, league, history] = await Promise.all([
    getTeamById(teamId),
    getCurrentLeague(teamId).catch((error) => {
      console.warn(`[league] ${teamId}: ${error.message}`);
      return null;
    }),
    getMatchHistory(teamId),
  ]);

  // El historial de Faceit sólo trae los últimos partidos: se guardan en la
  // base de datos y se lee de ahí, así el histórico se va acumulando.
  rememberTeamMatches(
    teamId,
    history.map((row) => ({ matchId: row.matchId as string, date: Number(row.date) || 0 })),
  );
  const matchIds = knownTeamMatches(teamId, limit);

  const results = await mapLimit(matchIds, MAX_CONCURRENT_REQUESTS, (matchId) =>
    analyzeMatch(matchId, teamId, league),
  );

  const matches: AnalyzedMatch[] = [];
  const failedMatches: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      matches.push(result.value);
    } else {
      failedMatches.push(matchIds[i]);
      console.warn(`[match] ${matchIds[i]}: ${result.reason?.message ?? result.reason}`);
    }
  });

  matches.sort((a, b) => b.date - a.date);

  return { team, league, matches, failedMatches };
}

async function analyzeMatch(
  matchId: string,
  teamId: string,
  league: League | null,
): Promise<AnalyzedMatch> {
  // Sólo el detalle del partido es imprescindible. Vetos, estadísticas y ELO
  // pueden faltar (forfeits, partidos antiguos...) sin que sea un error.
  const [match, vetos, stats, details] = await Promise.all([
    getMatchData(matchId),
    getMatchVetos(matchId).catch(() => null),
    getMatchStats(matchId).catch(() => null),
    getMatchDetailsV2(matchId).catch(() => null),
  ]);

  return buildAnalyzedMatch({ teamId, league, match, vetos, stats, details });
}

type RawMatch = {
  teamId: string;
  league: League | null;
  // Respuestas de Faceit tal cual.
  match: any;
  vetos: any;
  stats: any;
  details: any;
};

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Convierte las respuestas crudas de Faceit en un partido visto desde el lado
// del equipo. Es una función pura para poder testearla con respuestas reales.
export function buildAnalyzedMatch({ teamId, league, match, vetos, stats, details }: RawMatch): AnalyzedMatch {
  const us = factionOf(match, teamId);
  const them: Faction = us === "faction1" ? "faction2" : "faction1";
  const finished = match.status === "FINISHED";

  const resultFor = (winner: string | undefined): Result => {
    if (!finished) return "unknown";
    if (winner === us) return "win";
    if (winner === them) return "loss";
    return "draw";
  };

  const playersByMap = playerStatsByMap(stats, teamId);
  const playedMaps: string[] = match.voting?.map?.pick ?? [];
  const detailed: any[] = match.detailed_results ?? [];
  const maps: MapResult[] = detailed
    .map((d, i) => ({
      map: playedMaps[i],
      us: num(d.factions?.[us]?.score),
      them: num(d.factions?.[them]?.score),
      result: resultFor(d.winner),
      players: playersByMap.get(playedMaps[i]) ?? playersByMap.get(`#${i + 1}`) ?? [],
    }))
    .filter((m) => m.map);

  const mapTicket = vetos?.payload?.tickets?.find((t: any) => t.entity_type === "map");
  const vetoSteps: VetoStep[] = (mapTicket?.entities ?? [])
    .filter((e: any) => e.status === "pick" || e.status === "drop")
    .sort((a: any, b: any) => a.round - b.round)
    .map((e: any) => ({
      round: e.round,
      map: e.guid,
      action: e.status,
      by: e.selected_by === us ? "us" : e.selected_by === them ? "them" : null,
      random: Boolean(e.random),
      decider: false,
    }));

  // El último paso de un veto completo es el mapa que sobra, no una elección
  // real del equipo al que Faceit se lo atribuye.
  const last = vetoSteps.at(-1);
  if (last?.action === "pick" && vetoSteps.length === mapTicket?.entities?.length) {
    last.decider = true;
  }

  const roster = rosterOf(match, details, stats, us);
  const opponentRoster = rosterOf(match, details, stats, them);

  const startedAt = match.started_at ?? match.configured_at ?? match.finished_at;
  const competitionName: string = match.competition_name ?? "";

  return {
    matchId: match.match_id,
    faceitUrl: String(match.faceit_url ?? "").replace("{lang}", "en"),
    date: startedAt ? startedAt * 1000 : 0,
    bestOf: num(match.best_of) || maps.length || 1,
    status: match.status,
    competitionId: match.competition_id,
    competitionName,
    isLeague:
      match.organizer_id === ESEA_ORGANIZER_ID ||
      (league?.championship_id != null && match.competition_id === league.championship_id) ||
      /\bESEA\b/i.test(competitionName),
    opponent: {
      id: match.teams[them].faction_id,
      name: match.teams[them].name,
      avatar: match.teams[them].avatar ?? "",
    },
    result: resultFor(match.results?.winner),
    score: {
      us: num(match.results?.score?.[us]),
      them: num(match.results?.score?.[them]),
    },
    maps,
    vetos: vetoSteps,
    roster,
    teamElo: averageElo(roster),
    opponentElo: averageElo(opponentRoster),
  };
}

// Se identifica al equipo por ID, no por nombre: si el equipo se renombra, el
// nombre guardado en partidos antiguos ya no coincide.
function factionOf(match: any, teamId: string): Faction {
  if (match.teams?.faction1?.faction_id === teamId) return "faction1";
  if (match.teams?.faction2?.faction_id === teamId) return "faction2";
  throw new Error(`Team ${teamId} is not part of match ${match.match_id}`);
}

// Jugadores que jugaron el partido, con su ELO de ese momento (de la API
// interna; la Data API oficial no lo da).
//
// La fuente fiable de quién jugó son las estadísticas: en ESEA Faceit pone a
// veces al 5.º jugador en "substitutes" (no en "roster") y marca como
// "playing" a suplentes que no jugaron. Roster y suplentes sólo aportan
// avatar y nombre; si no hay estadísticas, se usa el roster.
function rosterOf(match: any, details: any, stats: any, faction: Faction): RosterPlayer[] {
  const eloById = new Map<string, number>();
  for (const p of details?.teams?.[faction]?.roster ?? []) {
    // ELO 0 = sin dato (cuenta sin calibrar): no debe hundir la media.
    if (p?.id && Number.isFinite(p.elo) && p.elo > 0) eloById.set(p.id, p.elo);
  }

  const team = match.teams?.[faction];
  const known = new Map<string, any>();
  for (const p of [...(team?.roster ?? []), ...(team?.substitutes ?? [])]) known.set(p.player_id, p);

  const teamId = team?.faction_id;
  const playedIds = new Map<string, string>();
  for (const round of stats?.rounds ?? []) {
    for (const p of round.teams?.find((t: any) => t.team_id === teamId)?.players ?? []) {
      playedIds.set(p.player_id, p.nickname);
    }
  }

  const players =
    playedIds.size > 0
      ? [...playedIds.entries()].map(([id, nickname]) => known.get(id) ?? { player_id: id, nickname })
      : (team?.roster ?? []);

  return players.map((p: any) => ({
    id: p.player_id,
    nickname: p.nickname,
    avatar: p.avatar ?? "",
    elo: eloById.get(p.player_id) ?? null,
  }));
}

function averageElo(roster: RosterPlayer[]) {
  const elos = roster.map((p) => p.elo).filter((e): e is number => e !== null);
  return elos.length ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : null;
}

// Estadísticas de nuestros jugadores por mapa. Se indexan por nombre de mapa
// y, por si acaso, por posición ("#1", "#2"...).
function playerStatsByMap(stats: any, teamId: string) {
  const byMap = new Map<string, PlayerMapStats[]>();
  (stats?.rounds ?? []).forEach((round: any, i: number) => {
    const team = round.teams?.find((t: any) => t.team_id === teamId);
    if (!team) return;
    const players: PlayerMapStats[] = (team.players ?? []).map((p: any) => {
      const s = p.player_stats ?? {};
      return {
        id: p.player_id,
        nickname: p.nickname,
        kills: num(s.Kills),
        deaths: num(s.Deaths),
        assists: num(s.Assists),
        adr: num(s.ADR),
        hsPct: num(s["Headshots %"]),
        kr: num(s["K/R Ratio"]),
        firstKills: num(s["First Kills"]),
        clutches: num(s["1v1Wins"]) + num(s["1v2Wins"]),
        mvps: num(s.MVPs),
      };
    });
    const map = round.round_stats?.Map;
    if (map) byMap.set(map, players);
    byMap.set(`#${i + 1}`, players);
  });
  return byMap;
}
