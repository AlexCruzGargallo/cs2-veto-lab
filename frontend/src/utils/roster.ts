import type { AnalyzedMatch } from "../types/faceit";

export interface RosterEntry {
  id: string;
  nickname: string;
  avatar: string;
  matches: number;
  // % de los partidos analizados en los que jugó.
  share: number;
  firstPlayed: number;
  lastPlayed: number;
  inCurrentLineup: boolean;
  elo: number | null;
}

export interface RosterChange {
  kind: "joined" | "left";
  player: RosterEntry;
}

export interface RosterAnalysis {
  players: RosterEntry[];
  // Los 5 del partido más reciente.
  currentLineup: string[];
  changes: RosterChange[];
}

// Un jugador "nuevo" es el que está en la alineación actual pero apareció por
// primera vez en los últimos partidos; uno "que se fue" es un habitual que ya
// no juega en los últimos partidos.
const RECENT_MATCHES = 3;
const REGULAR_SHARE = 0.4;

// `lineup`: alineación actual si ya se conoce (p. ej. calculada con todos los
// partidos aunque aquí lleguen sólo los filtrados).
// `currentElo`: ELO actual por jugador, para quien no tenga ELO de partido.
export function analyzeRoster(
  matches: AnalyzedMatch[],
  lineup?: string[],
  currentElo: Record<string, number> = {},
): RosterAnalysis {
  const sorted = [...matches].filter((m) => m.roster.length > 0).sort((a, b) => b.date - a.date);
  const byId = new Map<string, RosterEntry>();

  for (const m of sorted) {
    for (const p of m.roster) {
      const entry = byId.get(p.id) ?? {
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        matches: 0,
        share: 0,
        firstPlayed: m.date,
        lastPlayed: m.date,
        inCurrentLineup: false,
        // El ELO más reciente que tengamos (los partidos van del más nuevo al más viejo).
        elo: p.elo,
      };
      entry.matches++;
      entry.firstPlayed = Math.min(entry.firstPlayed, m.date);
      entry.lastPlayed = Math.max(entry.lastPlayed, m.date);
      entry.elo ??= p.elo;
      byId.set(p.id, entry);
    }
  }

  const currentLineup = lineup ?? sorted[0]?.roster.map((p) => p.id) ?? [];
  const current = new Set(currentLineup);
  const total = sorted.length;
  const players = [...byId.values()]
    .map((p) => ({
      ...p,
      elo: p.elo ?? currentElo[p.id] ?? null,
      share: total ? p.matches / total : 0,
      inCurrentLineup: current.has(p.id),
    }))
    .sort((a, b) => Number(b.inCurrentLineup) - Number(a.inCurrentLineup) || b.matches - a.matches);

  const changes: RosterChange[] = [];
  // Con muy pocos partidos no se puede hablar de "cambios".
  if (total > RECENT_MATCHES + 2) {
    const recentIds = new Set(sorted.slice(0, RECENT_MATCHES).flatMap((m) => m.roster.map((p) => p.id)));
    const recentStart = sorted[RECENT_MATCHES - 1].date;
    for (const p of players) {
      if (p.inCurrentLineup && p.firstPlayed >= recentStart) changes.push({ kind: "joined", player: p });
      if (!recentIds.has(p.id) && p.share >= REGULAR_SHARE) changes.push({ kind: "left", player: p });
    }
  }

  return { players, currentLineup, changes };
}
