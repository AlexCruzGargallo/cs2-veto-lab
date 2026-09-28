import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAnalyzedMatch } from "../services/analysisService.js";

// Respuestas reales de Faceit grabadas con scripts/record-fixture.ts. Cada una
// cubre un caso que la app llegó a interpretar mal.
function fixture(name: string) {
  const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, "fixtures", `${name}.json`), "utf8"));
  return buildAnalyzedMatch({ ...raw, league: null });
}

describe("buildAnalyzedMatch con partidos reales", () => {
  it("BO3: resultado por mapa y el último paso del veto es el decider, no un pick", () => {
    const m = fixture("bo3-decider");
    expect(m.bestOf).toBe(3);
    expect(m.result).toBe("loss");
    expect(m.score).toEqual({ us: 1, them: 2 });
    expect(m.maps.map((p) => `${p.map} ${p.us}-${p.them} ${p.result}`)).toEqual([
      "de_nuke 9-13 loss",
      "de_anubis 13-6 win",
      "de_mirage 8-13 loss",
    ]);
    expect(m.vetos).toHaveLength(7);
    expect(m.vetos.at(-1)).toMatchObject({ map: "de_mirage", decider: true });
    expect(m.vetos.filter((v) => v.action === "pick" && !v.decider)).toHaveLength(2);
  });

  it("identifica al equipo por ID aunque sea faction2", () => {
    const m = fixture("bo1-faction2");
    expect(m.result).toBe("loss");
    expect(m.score).toEqual({ us: 11, them: 13 });
    expect(m.opponent.name).toBe("NIRUN");
    // Nuestro primer ban de ese veto fue Ancient.
    expect(m.vetos[0]).toMatchObject({ by: "us", action: "drop", map: "de_ancient" });
  });

  it("detecta ESEA por el organizador aunque el nombre no diga ESEA", () => {
    const m = fixture("esea-league");
    expect(m.competitionName).not.toMatch(/ESEA/);
    expect(m.isLeague).toBe(true);
    expect(fixture("bo2-ipl").isLeague).toBe(false);
  });

  it("un BO2 se queda como BO2 (no se confunde con un BO3)", () => {
    const m = fixture("bo2-ipl");
    expect(m.bestOf).toBe(2);
    expect(m.maps).toHaveLength(2);
  });

  it("alineación con ELO del partido; el ELO 0 (sin dato) no cuenta en la media", () => {
    const m = fixture("bo3-decider");
    expect(m.roster).toHaveLength(5);
    expect(m.roster.every((p) => p.elo! > 0)).toBe(true);
    expect(m.teamElo).toBe(Math.round((2702 + 2499 + 2374 + 2593 + 2470) / 5));
    expect(m.opponentElo).toBeGreaterThan(0);

    // En el BO2 hay un jugador con ELO 0 en faction1: su media sale sólo de
    // los jugadores con dato.
    const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, "fixtures", "bo2-ipl.json"), "utf8"));
    const f1 = raw.details.teams.faction1.roster.map((p: any) => p.elo).filter((e: number) => e > 0);
    const f1Avg = Math.round(f1.reduce((a: number, b: number) => a + b, 0) / f1.length);
    const ipl = fixture("bo2-ipl");
    const weAreFaction1 = raw.match.teams.faction1.faction_id === raw.teamId;
    expect(weAreFaction1 ? ipl.teamElo : ipl.opponentElo).toBe(f1Avg);
  });

  it("ESEA: la alineación sale de quién jugó (estadísticas), no del roster", () => {
    const raw = JSON.parse(readFileSync(resolve(import.meta.dirname, "fixtures", "esea-league.json"), "utf8"));
    const m = fixture("esea-league");
    const played = new Set(
      raw.stats.rounds.flatMap((r: any) => r.teams.find((t: any) => t.team_id === raw.teamId).players.map((p: any) => p.player_id)),
    );
    expect(m.roster.map((p) => p.id).sort()).toEqual([...played].sort());
    expect(m.roster).toHaveLength(5);
  });

  it("estadísticas de nuestros jugadores en cada mapa", () => {
    const m = fixture("bo3-decider");
    for (const map of m.maps) expect(map.players).toHaveLength(5);
    const nuke = m.maps[0].players.find((p) => p.nickname === "raINbro1944")!;
    expect(nuke).toMatchObject({ kills: 12, deaths: 14, adr: 57.7, hsPct: 50, firstKills: 3 });
  });
});
