import { describe, expect, it } from "vitest";
import type { VetoStep } from "../types/faceit";
import { makeMapStats as mapStats, makeMatch, makeTeam as team, step } from "./testing";
import {
  compareMapPools,
  detectVetoPattern,
  mapProbabilities,
  mapScore,
  simulateVeto,
} from "./matchup";

const POOL = ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_cache"];

// Nosotros: muy fuertes en Anubis, siempre quitamos Ancient.
const us = team(4, [
  mapStats("de_anubis", { played: 4, wins: 4, picks: 3 }),
  mapStats("de_ancient", { bans: 4, firstBans: 4 }),
  mapStats("de_mirage", { played: 2, wins: 0, losses: 2 }),
]);

// Rival: fuerte en Mirage, siempre quita Nuke de primeras.
const them = team(4, [
  mapStats("de_mirage", { played: 4, wins: 4, picks: 3 }),
  mapStats("de_nuke", { bans: 4, firstBans: 4 }),
  mapStats("de_anubis", { played: 2, losses: 2 }),
]);

const veto = step;

function match(bestOf: number, date: number, vetos: VetoStep[]) {
  return makeMatch({ matchId: String(date), date, bestOf, vetos });
}

describe("mapScore", () => {
  it("suaviza: un mapa sin datos puntúa 0 y ganar mucho puntúa más que ganar poco", () => {
    expect(mapScore(team(0, []), "de_dust2")).toBe(0);
    const once = team(1, [mapStats("de_dust2", { played: 1, wins: 1 })]);
    const often = team(1, [mapStats("de_dust2", { played: 5, wins: 5 })]);
    expect(mapScore(once, "de_dust2")).toBeGreaterThan(0);
    expect(mapScore(often, "de_dust2")).toBeGreaterThan(mapScore(once, "de_dust2"));
  });
});

describe("compareMapPools", () => {
  it("ordena por ventaja y aconseja pickear/banear", () => {
    const rows = compareMapPools(us, them, POOL);
    expect(rows[0].map).toBe("de_anubis");
    expect(rows[0].advice).toBe("pick");
    expect(rows.at(-1)!.map).toBe("de_mirage");
    expect(rows.at(-1)!.advice).toBe("ban");
  });
});

describe("detectVetoPattern", () => {
  it("deduce el patrón de los partidos reales, relativo a quién vota primero", () => {
    const m = match(3, 1, [
      veto(1, "a", "drop", "them"),
      veto(2, "b", "drop", "us"),
      veto(3, "c", "pick", "them"),
      veto(4, "d", "pick", "us"),
      veto(5, "e", "drop", "them"),
      veto(6, "f", "drop", "us"),
      veto(7, "g", "pick", "them", true),
    ]);
    expect(detectVetoPattern([m], "bo3", 7)).toEqual(["Ad", "Bd", "Ap", "Bp", "Ad", "Bd", "D"]);
  });

  it("un BO2 no cuenta como BO3 aunque haya más BO2 que BO3", () => {
    // BO2 (p. ej. IPL): 5 bans, 1 pick y decider → sólo 2 mapas.
    const bo2 = (d: number) =>
      match(2, d, [
        veto(1, "a", "drop", "us"),
        veto(2, "b", "drop", "them"),
        veto(3, "c", "drop", "us"),
        veto(4, "d", "drop", "them"),
        veto(5, "e", "drop", "us"),
        veto(6, "f", "pick", "them"),
        veto(7, "g", "pick", "us", true),
      ]);
    const bo3 = match(3, 9, [
      veto(1, "a", "drop", "us"),
      veto(2, "b", "drop", "them"),
      veto(3, "c", "pick", "us"),
      veto(4, "d", "pick", "them"),
      veto(5, "e", "drop", "us"),
      veto(6, "f", "drop", "them"),
      veto(7, "g", "pick", "us", true),
    ]);

    const pattern = detectVetoPattern([bo2(1), bo2(2), bo2(3), bo3], "bo3", 7);
    expect(pattern).toEqual(["Ad", "Bd", "Ap", "Bp", "Ad", "Bd", "D"]);
    // Sin ningún BO3 real, usa el por defecto (que también da 3 mapas).
    const fallback = detectVetoPattern([bo2(1), bo2(2)], "bo3", 7);
    expect(fallback.filter((s) => s !== "Ad" && s !== "Bd")).toHaveLength(3);
  });

  it("prioriza el orden de ESEA sobre el de otros torneos", () => {
    const abab = (d: number) =>
      match(1, d, ["a", "b", "c", "d", "e", "f"].map((m, i) => veto(i + 1, m, "drop", i % 2 ? "them" : "us")).concat(veto(7, "g", "pick", "us", true)));
    const esea = { ...match(1, 10, [
      veto(1, "a", "drop", "us"),
      veto(2, "b", "drop", "them"),
      veto(3, "c", "drop", "them"),
      veto(4, "d", "drop", "us"),
      veto(5, "e", "drop", "us"),
      veto(6, "f", "drop", "them"),
      veto(7, "g", "pick", "us", true),
    ]), isLeague: true };

    expect(detectVetoPattern([abab(1), abab(2), abab(3), esea], "bo1", 7)).toEqual([
      "Ad", "Bd", "Bd", "Ad", "Ad", "Bd", "D",
    ]);
  });

  it("sin datos usa el patrón por defecto de Faceit", () => {
    expect(detectVetoPattern([], "bo1", 7)).toEqual(["Ad", "Bd", "Bd", "Ad", "Ad", "Bd", "D"]);
  });
});

describe("simulateVeto", () => {
  it("BO3: el rival banea su permaban, nosotros pickeamos nuestro mejor mapa y quitamos el suyo", () => {
    const steps = simulateVeto(detectVetoPattern([], "bo3", 7), POOL, "them", us, them);

    expect(steps).toHaveLength(7);
    expect(steps[0]).toMatchObject({ actor: "them", action: "drop", map: "de_nuke" });
    expect(steps[1]).toMatchObject({ actor: "us", action: "drop", map: "de_mirage" });
    expect(steps[3]).toMatchObject({ actor: "us", action: "pick", map: "de_anubis" });
    expect(steps[6].decider).toBe(true);
    // Cada mapa aparece una sola vez.
    expect(new Set(steps.map((s) => s.map)).size).toBe(7);
  });

  it("respeta quién empieza", () => {
    const steps = simulateVeto(detectVetoPattern([], "bo1", 7), POOL, "us", us, them);
    expect(steps.map((s) => s.actor)).toEqual(["us", "them", "them", "us", "us", "them", null]);
  });
});

describe("modo high risk", () => {
  // Nuke es nuestro peor mapa (0-5) y el rival SIEMPRE lo quita de primeras
  // (aunque lo gana cuando le toca jugarlo). Mirage es nuestro segundo peor.
  const weakOnNuke = team(5, [
    mapStats("de_nuke", { played: 5, losses: 5 }),
    mapStats("de_mirage", { played: 5, wins: 1, losses: 4 }),
    mapStats("de_anubis", { played: 5, wins: 5, picks: 3 }),
  ]);
  const bansNuke = team(5, [mapStats("de_nuke", { played: 4, wins: 4, bans: 5, firstBans: 5 })]);
  const bo1 = detectVetoPattern([], "bo1", 7);

  it("normal: banea nuestro peor mapa aunque el rival lo vaya a quitar", () => {
    const steps = simulateVeto(bo1, POOL, "us", weakOnNuke, bansNuke);
    expect(steps[0]).toMatchObject({ actor: "us", map: "de_nuke" });
  });

  it("high risk: deja Nuke para el rival y gasta el ban en otro mapa malo", () => {
    const steps = simulateVeto(bo1, POOL, "us", weakOnNuke, bansNuke, { highRisk: true });
    expect(steps[0]).toMatchObject({ actor: "us", map: "de_mirage" });
    expect(steps[0].reason).toMatch(/High risk/);
    // Y el rival efectivamente quita Nuke en su turno.
    expect(steps[1]).toMatchObject({ actor: "them", map: "de_nuke" });
  });
});

describe("mapProbabilities", () => {
  const bo1 = detectVetoPattern([], "bo1", 7);

  it("BO1: las probabilidades de cada mapa suman 1 y son deterministas", () => {
    const a = mapProbabilities(bo1, POOL, "them", us, them, { runs: 500 });
    const b = mapProbabilities(bo1, POOL, "them", us, them, { runs: 500 });
    expect(a.reduce((sum, m) => sum + m.played, 0)).toBeCloseTo(1);
    expect(a).toEqual(b);
  });

  it("BO3: se juegan 3 mapas por simulación", () => {
    const probs = mapProbabilities(detectVetoPattern([], "bo3", 7), POOL, "us", us, them, { runs: 300 });
    expect(probs.reduce((sum, m) => sum + m.played, 0)).toBeCloseTo(3);
    expect(probs.reduce((sum, m) => sum + m.decider, 0)).toBeCloseTo(1);
  });

  it("el mapa que el rival siempre banea casi nunca se juega", () => {
    const probs = mapProbabilities(bo1, POOL, "them", us, them, { runs: 500 });
    expect(probs.find((p) => p.map === "de_nuke")!.played).toBeLessThan(0.05);
  });
});
