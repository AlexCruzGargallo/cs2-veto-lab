// Contrato de la API entre backend y frontend. Es un .d.ts para que el backend
// pueda importarlo (sólo tipos) sin que cambie su estructura de compilación.

export type Side = "us" | "them";
export type Result = "win" | "loss" | "draw" | "unknown";

export interface FaceitMember {
  user_id: string;
  nickname: string;
  avatar: string;
  country: string;
  memberships: string[];
  faceit_url: string;
}

export interface FaceitTeam {
  team_id: string;
  name: string;
  avatar: string;
  faceit_url: string;
  game: string;
  nickname: string;
  members?: FaceitMember[];
  leader?: string;
}

export interface FaceitLeague {
  league_name: string;
  league_avatar: string | null;
  championship_id: string | null;
  season_number: number;
  stage_name: string | null;
  division_name: string;
  conference_name: string;
  region: string;
  wins: number;
  losses: number;
  ties: number;
  placement: number | null;
}

export interface PlayerMapStats {
  id: string;
  nickname: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  hsPct: number;
  // Kills por ronda.
  kr: number;
  firstKills: number;
  clutches: number;
  mvps: number;
}

export interface MapResult {
  map: string;
  us: number;
  them: number;
  result: Result;
  // Estadísticas de NUESTROS jugadores en ese mapa (vacío si Faceit no las da).
  players: PlayerMapStats[];
}

export interface VetoStep {
  round: number;
  map: string;
  action: "pick" | "drop";
  // null cuando Faceit no atribuye el paso a ningún equipo (p. ej. aleatorio).
  by: Side | null;
  random: boolean;
  // Mapa que queda al final del veto (no lo elige ningún equipo).
  decider: boolean;
}

export interface RosterPlayer {
  id: string;
  nickname: string;
  avatar: string;
  // ELO en el momento del partido (null si Faceit no lo da).
  elo: number | null;
}

export interface AnalyzedMatch {
  matchId: string;
  faceitUrl: string;
  date: number;
  bestOf: number;
  status: string;
  competitionId: string;
  competitionName: string;
  isLeague: boolean;
  opponent: { id: string; name: string; avatar: string };
  result: Result;
  score: { us: number; them: number };
  maps: MapResult[];
  vetos: VetoStep[];
  // Los 5 jugadores nuestros que jugaron el partido.
  roster: RosterPlayer[];
  // ELO medio de cada equipo en ese partido (null si no hay datos).
  teamElo: number | null;
  opponentElo: number | null;
}

export interface TeamAnalysis {
  team: FaceitTeam;
  league: FaceitLeague | null;
  matches: AnalyzedMatch[];
  failedMatches: string[];
  // ELO actual de nuestros jugadores (API oficial). Sirve de respaldo cuando
  // no se puede obtener el ELO del momento de cada partido.
  currentElo: Record<string, number>;
}

export interface StandingRow {
  teamId: string;
  name: string;
  avatar: string;
  rank: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  mapsWon: number;
  mapsLost: number;
  roundsWon: number;
  roundsLost: number;
}

export interface LeagueMatch {
  matchId: string;
  opponent: { id: string; name: string; avatar: string };
  scheduledAt: number | null;
  status: string;
  round: number | null;
  // Para partidos ya jugados.
  won: boolean | null;
}

export interface LeagueOverview {
  league: FaceitLeague | null;
  // Temporada y fase de la que sale la clasificación (puede ser la anterior
  // si la actual aún no ha empezado).
  standingsLabel: string | null;
  standingsFromPreviousSeason: boolean;
  standings: StandingRow[];
  upcoming: LeagueMatch[];
  recent: LeagueMatch[];
}
