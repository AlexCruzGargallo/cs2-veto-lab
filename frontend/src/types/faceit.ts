// El contrato con el backend vive en el paquete compartido (shared/index.d.ts).
export type * from "@faceit-team-stats/shared";

// Tipos propios del frontend (estadísticas calculadas en el navegador).

export interface Record3 {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number | null;
}

export interface MapStats {
  map: string;
  played: number;
  wins: number;
  losses: number;
  winRate: number | null;
  roundDiff: number;
  picks: number;
  bans: number;
  firstBans: number;
  deciders: number;
  opponentPicks: number;
  opponentBans: number;
  // % de pick: sobre los partidos en que el equipo eligió mapa (en BO1 nadie
  // pickea; en BO2 sólo uno). % de ban: sobre todos los partidos con veto.
  pickRate: number | null;
  banRate: number | null;
}

export interface TeamStats {
  matches: Record3;
  maps: Record3;
  vetoedMatches: number;
  // Partidos en los que el equipo eligió mapa.
  pickableMatches: number;
  favMap: string | null;
  mostBanned: string | null;
  firstBan: string | null;
  mapStats: MapStats[];
}
