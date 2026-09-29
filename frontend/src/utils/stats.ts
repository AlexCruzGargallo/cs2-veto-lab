import type {
  AnalyzedMatch,
  MapStats,
  Record3,
  Result,
  TeamStats,
} from "../types/faceit";
import { isActiveMap } from "./maps";

export type CompetitionFilter = "all" | "league";
// "bo1", "bo2", "bo3"... siempre el formato exacto: un BO2 no cuenta como BO3.
export type FormatFilter = "all" | `bo${number}`;
export type PeriodFilter = "all" | "3m" | "1m";

export interface MatchFilters {
  competition: CompetitionFilter;
  format: FormatFilter;
  period?: PeriodFilter;
  // Sólo partidos jugados con la alineación actual (4+ de sus 5 jugadores).
  currentLineup?: string[] | null;
}

const DAY = 86_400_000;
const PERIOD_DAYS: Record<PeriodFilter, number | null> = { all: null, "3m": 90, "1m": 30 };

export function filterMatches(
  matches: AnalyzedMatch[],
  { competition, format, period = "all", currentLineup = null }: MatchFilters,
  now = Date.now(),
) {
  const days = PERIOD_DAYS[period];
  const since = days === null ? -Infinity : now - days * DAY;
  const lineup = currentLineup ? new Set(currentLineup) : null;

  return matches.filter(
    (m) =>
      (competition === "all" || m.isLeague) &&
      (format === "all" || format === `bo${m.bestOf}`) &&
      m.date >= since &&
      (!lineup || m.roster.filter((p) => lineup.has(p.id)).length >= 4),
  );
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

function record(results: Result[]): Record3 {
  // "unknown" (partido sin terminar o cancelado) no cuenta ni como victoria
  // ni como derrota.
  const wins = results.filter((r) => r === "win").length;
  const losses = results.filter((r) => r === "loss").length;
  const draws = results.filter((r) => r === "draw").length;
  const total = wins + losses + draws;
  return { wins, losses, draws, total, winRate: percent(wins, total) };
}

function emptyMapStats(map: string): MapStats {
  return {
    map,
    played: 0,
    wins: 0,
    losses: 0,
    winRate: null,
    roundDiff: 0,
    picks: 0,
    bans: 0,
    firstBans: 0,
    deciders: 0,
    opponentPicks: 0,
    opponentBans: 0,
    pickRate: null,
    banRate: null,
  };
}

function topBy(stats: MapStats[], key: keyof MapStats) {
  const best = [...stats]
    .filter((s) => (s[key] as number) > 0)
    .sort((a, b) => (b[key] as number) - (a[key] as number) || b.played - a.played)[0];
  return best?.map ?? null;
}

export function computeTeamStats(allMatches: AnalyzedMatch[]): TeamStats {
  // Los forfeits (un equipo no se presentó) no dicen nada de cómo juega el
  // equipo: no cuentan ni en el récord, ni en los mapas, ni en el veto.
  const matches = allMatches.filter((m) => !m.forfeit);
  const byMap = new Map<string, MapStats>();
  const statsFor = (map: string) => {
    if (!byMap.has(map)) byMap.set(map, emptyMapStats(map));
    return byMap.get(map)!;
  };

  let vetoedMatches = 0;
  // Partidos en los que el equipo eligió mapa. En BO1 nadie pickea y en BO2
  // sólo pickea uno de los dos: contar todos los vetos hundiría el % de pick.
  let pickableMatches = 0;

  for (const match of matches) {
    for (const played of match.maps) {
      if (!isActiveMap(played.map)) continue;
      const s = statsFor(played.map);
      if (played.result === "unknown") continue;
      s.played++;
      if (played.result === "win") s.wins++;
      if (played.result === "loss") s.losses++;
      s.roundDiff += played.us - played.them;
    }

    // Sólo cuenta como veto del equipo si decidió al menos un paso él mismo
    // (los pasos automáticos de Faceit no son decisiones suyas).
    if (match.vetos.some((v) => v.by === "us" && !v.decider && !v.random)) vetoedMatches++;
    // Sólo picks de mapas del pool activo: un pick de Overpass en un veto
    // antiguo no es una oportunidad de pick dentro del pool actual.
    if (
      match.vetos.some(
        (v) => v.by === "us" && v.action === "pick" && !v.decider && !v.random && isActiveMap(v.map),
      )
    ) {
      pickableMatches++;
    }

    let firstBanSeen = false;
    for (const step of match.vetos) {
      if (!isActiveMap(step.map)) continue;
      const s = statsFor(step.map);
      if (step.decider) {
        s.deciders++;
        continue;
      }
      // Paso automático (no votaron a tiempo): no es una decisión del equipo.
      // Si fue su primer ban, el siguiente no pasa a contar como primer ban.
      if (step.random) {
        if (step.by === "us" && step.action === "drop") firstBanSeen = true;
        continue;
      }
      if (step.by === "us") {
        if (step.action === "pick") s.picks++;
        else {
          s.bans++;
          if (!firstBanSeen) s.firstBans++;
          firstBanSeen = true;
        }
      } else if (step.by === "them") {
        if (step.action === "pick") s.opponentPicks++;
        else s.opponentBans++;
      }
    }
  }

  const mapStats = [...byMap.values()]
    .map((s) => ({
      ...s,
      winRate: percent(s.wins, s.wins + s.losses),
      pickRate: percent(s.picks, pickableMatches),
      banRate: percent(s.bans, vetoedMatches),
    }))
    .sort((a, b) => b.played - a.played || b.picks - a.picks || a.bans - b.bans);

  return {
    matches: record(matches.map((m) => m.result)),
    maps: record(matches.flatMap((m) => m.maps.map((p) => p.result))),
    vetoedMatches,
    pickableMatches,
    // En BO1 nadie pickea: si no hay picks, el favorito es el más jugado.
    favMap: topBy(mapStats, "picks") ?? topBy(mapStats, "played"),
    mostBanned: topBy(mapStats, "bans"),
    firstBan: topBy(mapStats, "firstBans"),
    mapStats,
  };
}
