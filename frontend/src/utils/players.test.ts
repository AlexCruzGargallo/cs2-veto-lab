import { describe, expect, it } from "vitest";
import type { PlayerMapStats } from "../types/faceit";
import { summarizePlayers } from "./players";
import { makeMatch } from "./testing";

const line = (id: string, s: Partial<PlayerMapStats>): PlayerMapStats => ({
  id,
  nickname: id,
  kills: 0,
  deaths: 0,
  assists: 0,
  adr: 0,
  hsPct: 0,
  kr: 0,
  firstKills: 0,
  clutches: 0,
  mvps: 0,
  ...s,
});

describe("summarizePlayers", () => {
  it("agrega por jugador y por mapa", () => {
    const m = makeMatch({
      bestOf: 3,
      maps: [
        {
          map: "de_nuke",
          us: 13,
          them: 9,
          result: "win",
          players: [line("a", { kills: 20, deaths: 10, adr: 90, hsPct: 50, firstKills: 4 })],
        },
        {
          map: "de_mirage",
          us: 9,
          them: 13,
          result: "loss",
          players: [line("a", { kills: 10, deaths: 20, adr: 60, hsPct: 30, firstKills: 2 })],
        },
      ],
    });
    const [a] = summarizePlayers([m]);
    expect(a.overall).toMatchObject({
      maps: 2,
      kills: 30,
      deaths: 30,
      kd: 1,
      adr: 75,
      hsPct: 40,
      firstKills: 6,
      firstKillsPerMap: 3,
    });
    expect(a.byMap.de_nuke).toMatchObject({ maps: 1, kd: 2, adr: 90 });
    expect(a.byMap.de_mirage).toMatchObject({ kd: 0.5 });
  });
});
