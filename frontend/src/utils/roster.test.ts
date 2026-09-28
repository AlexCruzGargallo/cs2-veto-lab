import { describe, expect, it } from "vitest";
import { analyzeRoster } from "./roster";
import { makeMatch, player } from "./testing";

const lineup = (date: number, ids: string[]) => makeMatch({ date, roster: ids.map((id) => player(id, 2000)) });

describe("analyzeRoster", () => {
  it("porcentaje de partidos y alineación actual", () => {
    const matches = [
      lineup(4, ["a", "b", "c", "d", "e"]),
      lineup(3, ["a", "b", "c", "d", "e"]),
      lineup(2, ["a", "b", "c", "d", "f"]),
      lineup(1, ["a", "b", "c", "d", "f"]),
    ];
    const r = analyzeRoster(matches);
    expect(r.currentLineup).toEqual(["a", "b", "c", "d", "e"]);
    expect(r.players.find((p) => p.id === "a")!.share).toBe(1);
    expect(r.players.find((p) => p.id === "f")).toMatchObject({ share: 0.5, inCurrentLineup: false });
    // Pocos partidos: no se habla de cambios.
    expect(r.changes).toEqual([]);
  });

  it("detecta un fichaje reciente y un habitual que ya no juega", () => {
    const old = ["a", "b", "c", "d", "x"];
    const now = ["a", "b", "c", "d", "new"];
    const matches = [
      lineup(10, now),
      lineup(9, now),
      lineup(8, now),
      ...[7, 6, 5, 4, 3, 2].map((d) => lineup(d, old)),
    ];
    const { changes } = analyzeRoster(matches);
    expect(changes.map((c) => `${c.kind}:${c.player.id}`).sort()).toEqual(["joined:new", "left:x"]);
  });
});
