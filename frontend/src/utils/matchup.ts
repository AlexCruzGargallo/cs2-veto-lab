import type { AnalyzedMatch, MapStats, Side, TeamStats } from "../types/faceit";

// Heurísticas del modo "Nosotros vs Rival". Todo es orientativo: con los pocos
// partidos que tiene un equipo de ESEA, una racha cambia mucho los números,
// por eso los win rates se suavizan hacia el 50%.

export type Advice = "pick" | "ban" | "neutral";

export interface MapMatchup {
  map: string;
  us: MapStats | null;
  them: MapStats | null;
  usScore: number;
  themScore: number;
  // > 0: el mapa nos favorece a nosotros.
  edge: number;
  advice: Advice;
  lowSample: boolean;
}

export type VetoFormat = "bo1" | "bo3";
// "A" es quien vota primero, "B" el otro; "D" el decider.
export type PatternStep = "Ad" | "Ap" | "Bd" | "Bp" | "D";

export interface SimulatedStep {
  round: number;
  actor: Side | null;
  action: "pick" | "drop";
  map: string;
  decider: boolean;
  reason: string;
}

export interface SimulationOptions {
  // Anticipa los bans del rival: no gasta un ban en un mapa que el rival muy
  // probablemente va a quitar él. Arriesgado si el rival no hace lo esperado.
  highRisk?: boolean;
}

const EDGE_THRESHOLD = 0.25;

function statsFor(team: TeamStats, map: string) {
  return team.mapStats.find((s) => s.map === map) ?? null;
}

// Win rate bayesiano: con 0 partidos es 50%, con 1 victoria 67%, no 100%.
function smoothedWinRate(s: MapStats | null) {
  return ((s?.wins ?? 0) + 1) / ((s?.wins ?? 0) + (s?.losses ?? 0) + 2);
}

// Frecuencia de ban sobre todos los vetos; de pick sólo sobre los vetos en
// que el equipo eligió mapa (en BO1 nadie pickea, contarlos la diluiría).
function banFrequency(count: number | undefined, team: TeamStats) {
  return team.vetoedMatches > 0 ? (count ?? 0) / team.vetoedMatches : 0;
}

function pickFrequency(count: number | undefined, team: TeamStats) {
  return team.pickableMatches > 0 ? (count ?? 0) / team.pickableMatches : 0;
}

// Fuerza del equipo en un mapa, en [-1, 1]: mezcla resultados (lo bien que lo
// juegan) y preferencia en el veto (si lo eligen o lo quitan).
export function mapScore(team: TeamStats, map: string) {
  const s = statsFor(team, map);
  const results = 2 * smoothedWinRate(s) - 1;
  const preference = pickFrequency(s?.picks, team) - banFrequency(s?.bans, team);
  return 0.6 * results + 0.4 * preference;
}

export function compareMapPools(
  us: TeamStats,
  them: TeamStats,
  pool: string[],
): MapMatchup[] {
  return pool
    .map((map) => {
      const usScore = mapScore(us, map);
      const themScore = mapScore(them, map);
      const edge = usScore - themScore;
      const usMap = statsFor(us, map);
      const themMap = statsFor(them, map);
      return {
        map,
        us: usMap,
        them: themMap,
        usScore,
        themScore,
        edge,
        advice: (edge >= EDGE_THRESHOLD
          ? "pick"
          : edge <= -EDGE_THRESHOLD
            ? "ban"
            : "neutral") as Advice,
        lowSample: (usMap?.played ?? 0) < 2 || (themMap?.played ?? 0) < 2,
      };
    })
    .sort((a, b) => b.edge - a.edge);
}

const DEFAULT_PATTERNS: Record<VetoFormat, PatternStep[]> = {
  // Observado en Faceit: A B B A A B y el que queda.
  bo1: ["Ad", "Bd", "Bd", "Ad", "Ad", "Bd", "D"],
  bo3: ["Ad", "Bd", "Ap", "Bp", "Ad", "Bd", "D"],
};

function signature(match: AnalyzedMatch): PatternStep[] | null {
  const first = match.vetos[0]?.by;
  if (!first) return null;
  const steps: PatternStep[] = [];
  for (const v of match.vetos) {
    if (v.decider) steps.push("D");
    else if (!v.by) return null;
    else steps.push(`${v.by === first ? "A" : "B"}${v.action === "pick" ? "p" : "d"}`);
  }
  return steps;
}

const MAPS_PLAYED: Record<VetoFormat, number> = { bo1: 1, bo3: 3 };

// Mapas que salen de un patrón: los picks más el decider.
function mapsPlayed(pattern: PatternStep[]) {
  return pattern.filter((s) => s === "Ap" || s === "Bp" || s === "D").length;
}

function mostFrequent(signatures: PatternStep[][]) {
  const counts = new Map<string, number>();
  for (const sig of signatures) {
    const key = sig.join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? (best[0].split(",") as PatternStep[]) : null;
}

// Deduce el orden de veto de los partidos reales (el más frecuente) en vez de
// suponerlo; si no hay datos del formato, usa el patrón habitual de Faceit.
//
// - Sólo cuentan partidos del formato EXACTO: un BO2 (p. ej. IPL) no es un BO3.
// - El patrón tiene que dar tantos mapas como el formato (BO3 → 3).
// - Se priorizan los partidos de ESEA: otros torneos usan otro orden de BO1
//   (A-B-A-B-A-B en vez del A-B-B-A-A-B de la liga).
export function detectVetoPattern(
  matches: AnalyzedMatch[],
  format: VetoFormat,
  poolSize: number,
): PatternStep[] {
  const bestOf = MAPS_PLAYED[format];
  const valid = matches
    .filter((m) => m.bestOf === bestOf)
    .map((m) => ({ league: m.isLeague, sig: signature(m) }))
    .filter(
      (x): x is { league: boolean; sig: PatternStep[] } =>
        x.sig !== null && x.sig.length === poolSize && mapsPlayed(x.sig) === bestOf,
    );

  const fromLeague = mostFrequent(valid.filter((x) => x.league).map((x) => x.sig));
  const fromAll = mostFrequent(valid.map((x) => x.sig));
  if (fromLeague ?? fromAll) return (fromLeague ?? fromAll)!;

  const fallback = DEFAULT_PATTERNS[format];
  if (fallback.length === poolSize) return fallback;
  // Pool de tamaño inusual: bans alternos, los picks del BO3 en 3.º y 4.º
  // lugar (como en Faceit) y el decider al final.
  return Array.from({ length: poolSize }, (_, i): PatternStep => {
    if (i === poolSize - 1) return "D";
    const side = i % 2 === 0 ? "A" : "B";
    const pick = format === "bo3" && (i === 2 || i === 3) && poolSize >= 5;
    return `${side}${pick ? "p" : "d"}`;
  });
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function signed(x: number) {
  const n = Math.round(x * 100);
  return n > 0 ? `+${n}` : String(n);
}

// ---------------------------------------------------------------------------
// Modelo de decisión
// ---------------------------------------------------------------------------

type Actor = { side: Side; action: "pick" | "drop" };

function actorOf(code: PatternStep, first: Side): Actor | null {
  if (code === "D") return null;
  const side: Side = code[0] === "A" ? first : first === "us" ? "them" : "us";
  return { side, action: code[1] === "p" ? "pick" : "drop" };
}

// Tendencia del rival a banear / pickear cada mapa, según su historial. Su
// primer ban suele ser el "permaban": ese dato pesa más en su primer ban.
function rivalPropensity(them: TeamStats, map: string, action: "pick" | "drop", firstBan: boolean) {
  const s = statsFor(them, map);
  if (action === "drop") {
    return (
      banFrequency(s?.bans, them) +
      (firstBan ? banFrequency(s?.firstBans, them) : 0) -
      0.25 * mapScore(them, map)
    );
  }
  return pickFrequency(s?.picks, them) + 0.25 * mapScore(them, map);
}

// Softmax: convierte tendencias en probabilidades. Temperatura baja = el
// rival casi siempre hace lo que suele hacer.
const TEMPERATURE = 0.12;

function rivalChoiceProbabilities(
  them: TeamStats,
  remaining: string[],
  action: "pick" | "drop",
  firstBan: boolean,
) {
  const scores = remaining.map((m) => rivalPropensity(them, m, action, firstBan) / TEMPERATURE);
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return new Map(remaining.map((m, i) => [m, exps[i] / total]));
}

// Probabilidad de que el rival quite ese mapa en alguno de sus bans que
// quedan (aproximación: cada ban futuro independiente sobre los que quedan).
function chanceRivalBansLater(
  them: TeamStats,
  remaining: string[],
  futureRivalBans: number,
  rivalHasBanned: boolean,
  map: string,
) {
  if (futureRivalBans === 0) return 0;
  let survive = 1;
  for (let i = 0; i < futureRivalBans; i++) {
    const probs = rivalChoiceProbabilities(them, remaining, "drop", !rivalHasBanned && i === 0);
    survive *= 1 - (probs.get(map) ?? 0);
  }
  return 1 - survive;
}

type State = {
  remaining: string[];
  rivalHasBanned: boolean;
};

// Decisión de NUESTRO equipo en un paso.
function ourChoice(
  state: State,
  action: "pick" | "drop",
  futureRivalBans: number,
  edge: (m: string) => number,
  them: TeamStats,
  highRisk: boolean,
): { map: string; reason: string } {
  const byValue = (value: (m: string) => number) =>
    [...state.remaining].sort((a, b) => value(b) - value(a))[0];

  if (action === "pick") {
    const map = byValue(edge);
    return { map, reason: `Suggested: our biggest edge (${signed(edge(map))})` };
  }

  const safe = byValue((m) => -edge(m));
  if (!highRisk) {
    return { map: safe, reason: `Suggested: their biggest edge over us (${signed(edge(safe))})` };
  }

  // High risk: el valor de banear un mapa malo para nosotros se descuenta por
  // la probabilidad de que el rival lo quite igualmente.
  const later = (m: string) =>
    chanceRivalBansLater(them, state.remaining, futureRivalBans, state.rivalHasBanned, m);
  const map = byValue((m) => (edge(m) < 0 ? -edge(m) * (1 - later(m)) : -edge(m)));

  if (map !== safe) {
    return {
      map,
      reason: `High risk: skip ${safe.replace(/^de_/, "")} (they ban it ${pct(later(safe))} of the time), ban this instead (${signed(edge(map))})`,
    };
  }
  return { map, reason: `Suggested: their biggest edge over us (${signed(edge(map))})` };
}

function remainingRivalBans(pattern: PatternStep[], from: number, first: Side) {
  return pattern
    .slice(from)
    .filter((code) => {
      const a = actorOf(code, first);
      return a?.side === "them" && a.action === "drop";
    }).length;
}

// Simula el veto más probable: los pasos del rival se PREDICEN (lo que más
// suele hacer) y los nuestros se RECOMIENDAN según la ventaja por mapa.
export function simulateVeto(
  pattern: PatternStep[],
  pool: string[],
  first: Side,
  us: TeamStats,
  them: TeamStats,
  { highRisk = false }: SimulationOptions = {},
): SimulatedStep[] {
  const state: State = { remaining: [...pool], rivalHasBanned: false };
  const steps: SimulatedStep[] = [];
  const edge = (map: string) => mapScore(us, map) - mapScore(them, map);

  pattern.forEach((code, i) => {
    if (state.remaining.length === 0) return;
    const round = i + 1;
    const actor = actorOf(code, first);

    if (!actor) {
      const map = state.remaining[0];
      state.remaining = state.remaining.filter((m) => m !== map);
      steps.push({
        round,
        actor: null,
        action: "pick",
        map,
        decider: true,
        reason: `Leftover map · edge ${signed(edge(map))}`,
      });
      return;
    }

    let map: string;
    let reason: string;

    if (actor.side === "us") {
      const futureRivalBans = remainingRivalBans(pattern, i + 1, first);
      ({ map, reason } = ourChoice(state, actor.action, futureRivalBans, edge, them, highRisk));
    } else {
      const probs = rivalChoiceProbabilities(them, state.remaining, actor.action, !state.rivalHasBanned && actor.action === "drop");
      map = [...probs.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const s = statsFor(them, map);
      if (actor.action === "drop") {
        reason = them.vetoedMatches
          ? `Predicted: they ban it in ${pct(banFrequency(s?.bans, them))} of their vetoes`
          : "Predicted: their weakest map (no veto history)";
      } else {
        reason = s?.picks
          ? `Predicted: they pick it in ${pct(pickFrequency(s.picks, them))} of the matches where they pick`
          : "Predicted: their strongest map";
      }
      if (actor.action === "drop") state.rivalHasBanned = true;
    }

    state.remaining = state.remaining.filter((m) => m !== map);
    steps.push({ round, actor: actor.side, action: actor.action, map, decider: false, reason });
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Probabilidades (Monte Carlo)
// ---------------------------------------------------------------------------

export interface MapProbability {
  map: string;
  // Probabilidad de que se juegue el mapa.
  played: number;
  // BO1: probabilidad de que sea EL mapa. BO3: probabilidad de que sea el decider.
  decider: number;
  edge: number;
}

// PRNG con semilla: mismos datos → mismas probabilidades en cada render.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(probs: Map<string, number>, random: () => number) {
  let r = random();
  for (const [map, p] of probs) {
    r -= p;
    if (r <= 0) return map;
  }
  return [...probs.keys()].at(-1)!;
}

// Repite el veto muchas veces con el rival eligiendo según sus probabilidades
// (no siempre lo más habitual) y nosotros siguiendo la recomendación.
export function mapProbabilities(
  pattern: PatternStep[],
  pool: string[],
  first: Side,
  us: TeamStats,
  them: TeamStats,
  { highRisk = false, runs = 2000 }: SimulationOptions & { runs?: number } = {},
): MapProbability[] {
  const edge = (map: string) => mapScore(us, map) - mapScore(them, map);
  const played = new Map(pool.map((m) => [m, 0]));
  const decider = new Map(pool.map((m) => [m, 0]));
  const random = mulberry32(42);

  for (let run = 0; run < runs; run++) {
    const state: State = { remaining: [...pool], rivalHasBanned: false };

    pattern.forEach((code, i) => {
      if (state.remaining.length === 0) return;
      const actor = actorOf(code, first);
      let map: string;

      if (!actor) {
        map = state.remaining[0];
        played.set(map, played.get(map)! + 1);
        decider.set(map, decider.get(map)! + 1);
      } else if (actor.side === "us") {
        const futureRivalBans = remainingRivalBans(pattern, i + 1, first);
        map = ourChoice(state, actor.action, futureRivalBans, edge, them, highRisk).map;
      } else {
        const firstBan = !state.rivalHasBanned && actor.action === "drop";
        map = sample(rivalChoiceProbabilities(them, state.remaining, actor.action, firstBan), random);
        if (actor.action === "drop") state.rivalHasBanned = true;
      }

      if (actor?.action === "pick") played.set(map, played.get(map)! + 1);
      state.remaining = state.remaining.filter((m) => m !== map);
    });
  }

  return pool
    .map((map) => ({
      map,
      played: played.get(map)! / runs,
      decider: decider.get(map)! / runs,
      edge: edge(map),
    }))
    .sort((a, b) => b.played - a.played);
}
