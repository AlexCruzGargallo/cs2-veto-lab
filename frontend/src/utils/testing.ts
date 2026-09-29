// Constructores de datos para los tests.
import type { AnalyzedMatch, MapResult, MapStats, RosterPlayer, TeamStats, VetoStep } from "../types/faceit";

type MatchInput = Partial<Omit<AnalyzedMatch, "maps">> & {
  maps?: (Omit<MapResult, "players"> & Partial<Pick<MapResult, "players">>)[];
};

export function makeMatch(overrides: MatchInput = {}): AnalyzedMatch {
  const { maps = [], ...rest } = overrides;
  return {
    matchId: Math.random().toString(),
    faceitUrl: "",
    date: 0,
    bestOf: 1,
    status: "FINISHED",
    competitionId: "c",
    competitionName: "Cup",
    isLeague: false,
    opponent: { id: "o", name: "Opp", avatar: "" },
    result: "win",
    score: { us: 13, them: 5 },
    vetos: [],
    forfeit: false,
    roster: [],
    teamElo: null,
    opponentElo: null,
    ...rest,
    maps: maps.map((m) => ({ players: [], ...m })),
  };
}

export function step(
  round: number,
  map: string,
  action: "pick" | "drop",
  by: "us" | "them" | null,
  decider = false,
): VetoStep {
  return { round, map, action, by, random: false, decider };
}

export function player(id: string, elo: number | null = null): RosterPlayer {
  return { id, nickname: id, avatar: "", elo };
}

export function makeMapStats(map: string, s: Partial<MapStats> = {}): MapStats {
  const base = {
    played: 0,
    wins: 0,
    losses: 0,
    picks: 0,
    bans: 0,
    firstBans: 0,
    ...s,
  };
  return {
    map,
    winRate: null,
    roundDiff: 0,
    deciders: 0,
    opponentPicks: 0,
    opponentBans: 0,
    pickRate: null,
    banRate: null,
    ...base,
  };
}

export function makeTeam(vetoedMatches: number, maps: MapStats[], pickableMatches = vetoedMatches): TeamStats {
  const empty = { wins: 0, losses: 0, draws: 0, total: 0, winRate: null };
  return {
    matches: empty,
    maps: empty,
    vetoedMatches,
    pickableMatches,
    favMap: null,
    mostBanned: null,
    firstBan: null,
    mapStats: maps,
  };
}
