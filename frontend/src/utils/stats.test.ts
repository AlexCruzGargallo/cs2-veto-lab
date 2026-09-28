import { describe, expect, it } from "vitest";
import { computeTeamStats, filterMatches } from "./stats";
import { makeMatch as match, player, step } from "./testing";

// BO3 perdido 1-2: nosotros quitamos Ancient e Inferno y pickeamos Anubis.
const bo3 = match({
  bestOf: 3,
  result: "loss",
  isLeague: true,
  score: { us: 1, them: 2 },
  maps: [
    { map: "de_nuke", us: 9, them: 13, result: "loss" },
    { map: "de_anubis", us: 13, them: 6, result: "win" },
    { map: "de_mirage", us: 8, them: 13, result: "loss" },
  ],
  vetos: [
    step(1, "de_cache", "drop", "them"),
    step(2, "de_ancient", "drop", "us"),
    step(3, "de_nuke", "pick", "them"),
    step(4, "de_anubis", "pick", "us"),
    step(5, "de_dust2", "drop", "them"),
    step(6, "de_inferno", "drop", "us"),
    step(7, "de_mirage", "pick", "them", true),
  ],
});

// BO1 ganado en Dust2, que es el decider (nadie lo pickea de verdad).
const bo1 = match({
  maps: [{ map: "de_dust2", us: 13, them: 10, result: "win" }],
  vetos: [
    step(1, "de_anubis", "drop", "them"),
    step(2, "de_ancient", "drop", "us"),
    step(3, "de_nuke", "drop", "us"),
    step(4, "de_cache", "drop", "them"),
    step(5, "de_inferno", "drop", "them"),
    step(6, "de_mirage", "drop", "us"),
    step(7, "de_dust2", "pick", "them", true),
  ],
});

describe("computeTeamStats", () => {
  it("cuenta partidos y mapas por separado", () => {
    const stats = computeTeamStats([bo3, bo1]);
    expect(stats.matches).toMatchObject({ wins: 1, losses: 1, total: 2, winRate: 50 });
    expect(stats.maps).toMatchObject({ wins: 2, losses: 2, total: 4, winRate: 50 });
  });

  it("no cuenta partidos sin terminar como derrotas", () => {
    const unfinished = match({ result: "unknown", status: "ONGOING" });
    const stats = computeTeamStats([bo1, unfinished]);
    expect(stats.matches).toMatchObject({ wins: 1, losses: 0, total: 1, winRate: 100 });
  });

  it("no cuenta el decider como pick de ningún equipo", () => {
    const stats = computeTeamStats([bo1]);
    const dust2 = stats.mapStats.find((s) => s.map === "de_dust2")!;
    expect(dust2).toMatchObject({ picks: 0, opponentPicks: 0, deciders: 1, played: 1 });
    // Sin picks propios, el favorito es el más jugado.
    expect(stats.favMap).toBe("de_dust2");
  });

  it("calcula picks, bans, primer ban y porcentajes sobre partidos con veto", () => {
    const stats = computeTeamStats([bo3, bo1]);
    const ancient = stats.mapStats.find((s) => s.map === "de_ancient")!;
    expect(ancient).toMatchObject({ bans: 2, firstBans: 2, banRate: 100 });

    const anubis = stats.mapStats.find((s) => s.map === "de_anubis")!;
    // El pick de Anubis fue en el único BO3: 1 de 1 partidos con picks = 100%.
    expect(anubis).toMatchObject({ picks: 1, pickRate: 100, opponentBans: 1, played: 1, wins: 1 });

    expect(stats.favMap).toBe("de_anubis");
    expect(stats.mostBanned).toBe("de_ancient");
    expect(stats.firstBan).toBe("de_ancient");
  });

  it("acumula la diferencia de rondas por mapa", () => {
    const stats = computeTeamStats([bo3]);
    expect(stats.mapStats.find((s) => s.map === "de_nuke")!.roundDiff).toBe(-4);
    expect(stats.mapStats.find((s) => s.map === "de_anubis")!.roundDiff).toBe(7);
  });

  it("devuelve nulls y no NaN cuando no hay datos", () => {
    const stats = computeTeamStats([]);
    expect(stats.matches.winRate).toBeNull();
    expect(stats.favMap).toBeNull();
    expect(stats.mostBanned).toBeNull();
    expect(stats.mapStats).toEqual([]);
  });
});

describe("% de pick", () => {
  it("sólo cuenta los partidos en los que el equipo pickeó: los BO1 no lo diluyen", () => {
    const bo1s = [1, 2, 3].map(() => bo1);
    const stats = computeTeamStats([bo3, ...bo1s]);
    expect(stats.vetoedMatches).toBe(4);
    expect(stats.pickableMatches).toBe(1);
    // Antes: 1 pick / 4 vetos = 25%. Ahora: 1 pick / 1 BO3 = 100%.
    expect(stats.mapStats.find((s) => s.map === "de_anubis")!.pickRate).toBe(100);
    // El % de ban sí se calcula sobre todos los vetos.
    expect(stats.mapStats.find((s) => s.map === "de_ancient")!.banRate).toBe(100);
  });
});

describe("pool activo", () => {
  it("ignora mapas fuera del pool (Workshop, retirados) en las estadísticas por mapa", () => {
    const workshop = match({
      maps: [{ map: "3437809122", us: 13, them: 5, result: "win" }],
      vetos: [step(1, "3437809122", "pick", "us"), step(2, "de_nuke", "drop", "them")],
    });
    const overpass = match({
      maps: [{ map: "de_overpass", us: 13, them: 7, result: "win" }],
      vetos: [step(1, "de_overpass", "pick", "us"), step(2, "de_mirage", "drop", "them")],
    });
    const stats = computeTeamStats([workshop, overpass]);
    expect(stats.mapStats.map((s) => s.map).sort()).toEqual(["de_mirage", "de_nuke"]);
    // Los partidos siguen contando en el récord...
    expect(stats.matches.wins).toBe(2);
    // ...pero un pick fuera del pool no es una oportunidad de pick.
    expect(stats.pickableMatches).toBe(0);
  });
});

describe("filterMatches", () => {
  it("filtra por competición y formato", () => {
    const all = [bo3, bo1];
    expect(filterMatches(all, { competition: "league", format: "all" })).toEqual([bo3]);
    expect(filterMatches(all, { competition: "all", format: "bo1" })).toEqual([bo1]);
    expect(filterMatches(all, { competition: "all", format: "bo3" })).toEqual([bo3]);
    expect(filterMatches(all, { competition: "all", format: "all" })).toHaveLength(2);
  });

  it("filtra por formato exacto: un BO2 no aparece como BO3", () => {
    const bo2 = match({ bestOf: 2 });
    expect(filterMatches([bo3, bo2], { competition: "all", format: "bo3" })).toEqual([bo3]);
    expect(filterMatches([bo3, bo2], { competition: "all", format: "bo2" })).toEqual([bo2]);
  });
});

describe("filtros de periodo y alineación", () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;

  it("último mes y últimos 3 meses", () => {
    const recent = match({ date: now - 10 * DAY });
    const twoMonths = match({ date: now - 60 * DAY });
    const old = match({ date: now - 120 * DAY });
    const all = [recent, twoMonths, old];
    expect(filterMatches(all, { competition: "all", format: "all", period: "1m" }, now)).toEqual([recent]);
    expect(filterMatches(all, { competition: "all", format: "all", period: "3m" }, now)).toEqual([
      recent,
      twoMonths,
    ]);
    expect(filterMatches(all, { competition: "all", format: "all", period: "all" }, now)).toHaveLength(3);
  });

  it("alineación actual: partidos con al menos 4 de los 5 jugadores actuales", () => {
    const lineup = ["a", "b", "c", "d", "e"];
    const same = match({ roster: lineup.map((id) => player(id)) });
    const oneSub = match({ roster: ["a", "b", "c", "d", "x"].map((id) => player(id)) });
    const twoSubs = match({ roster: ["a", "b", "c", "x", "y"].map((id) => player(id)) });
    expect(
      filterMatches([same, oneSub, twoSubs], { competition: "all", format: "all", currentLineup: lineup }),
    ).toEqual([same, oneSub]);
  });
});
