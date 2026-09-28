import type { AnalyzedMatch, PlayerMapStats } from "../types/faceit";

export interface PlayerLine {
  maps: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number | null;
  adr: number | null;
  hsPct: number | null;
  kr: number | null;
  firstKills: number;
  clutches: number;
  // Media por mapa.
  firstKillsPerMap: number | null;
}

export interface PlayerSummary {
  id: string;
  nickname: string;
  overall: PlayerLine;
  byMap: Record<string, PlayerLine>;
}

type Acc = {
  maps: number;
  kills: number;
  deaths: number;
  assists: number;
  adrSum: number;
  hsSum: number;
  krSum: number;
  firstKills: number;
  clutches: number;
};

const emptyAcc = (): Acc => ({
  maps: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  adrSum: 0,
  hsSum: 0,
  krSum: 0,
  firstKills: 0,
  clutches: 0,
});

function add(acc: Acc, s: PlayerMapStats) {
  acc.maps++;
  acc.kills += s.kills;
  acc.deaths += s.deaths;
  acc.assists += s.assists;
  acc.adrSum += s.adr;
  acc.hsSum += s.hsPct;
  acc.krSum += s.kr;
  acc.firstKills += s.firstKills;
  acc.clutches += s.clutches;
}

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits;

function line(acc: Acc): PlayerLine {
  const per = (x: number, digits = 1) => (acc.maps ? round(x / acc.maps, digits) : null);
  return {
    maps: acc.maps,
    kills: acc.kills,
    deaths: acc.deaths,
    assists: acc.assists,
    kd: acc.deaths ? round(acc.kills / acc.deaths, 2) : acc.kills ? acc.kills : null,
    adr: per(acc.adrSum),
    hsPct: per(acc.hsSum, 0),
    kr: per(acc.krSum, 2),
    firstKills: acc.firstKills,
    clutches: acc.clutches,
    firstKillsPerMap: per(acc.firstKills),
  };
}

// Estadísticas de cada jugador del equipo: global y por mapa.
export function summarizePlayers(matches: AnalyzedMatch[]): PlayerSummary[] {
  const players = new Map<string, { nickname: string; overall: Acc; byMap: Map<string, Acc> }>();

  for (const match of matches) {
    for (const map of match.maps) {
      for (const s of map.players) {
        const p = players.get(s.id) ?? { nickname: s.nickname, overall: emptyAcc(), byMap: new Map() };
        add(p.overall, s);
        const perMap = p.byMap.get(map.map) ?? emptyAcc();
        add(perMap, s);
        p.byMap.set(map.map, perMap);
        players.set(s.id, p);
      }
    }
  }

  return [...players.entries()]
    .map(([id, p]) => ({
      id,
      nickname: p.nickname,
      overall: line(p.overall),
      byMap: Object.fromEntries([...p.byMap.entries()].map(([m, acc]) => [m, line(acc)])),
    }))
    .sort((a, b) => b.overall.maps - a.overall.maps);
}
