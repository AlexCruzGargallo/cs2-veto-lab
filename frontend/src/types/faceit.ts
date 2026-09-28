import type { FaceitMap } from "./cs2";

export interface FaceitTeam {
  team_id: string;
  name: string;
  avatar: string;
  faceit_url: string;
  game: string;
  nickname: string;
  members: FaceitMember[];
  leader: string;
}

export interface FaceitMember {
  user_id: string;
  nickname: string;
  avatar: string;
  country: string;
  memberships: string[];
  faceit_url: string;
}

export interface FaceitMatch {
  matchId: string;
  bestOf: 1 | 3 | 5;
  date: string;
  vetos?: VetoTicket;
}

export interface FaceitMatchDetails {
  match_id: string;
  faceit_url: string;
  teams: {
    faction1: FaceitFaction;
    faction2: FaceitFaction;
  };
  competition_name: string;
  results: {
    score: {
      faction1: number;
      faction2: number;
    };
    winner: "faction1" | "faction2" | "draw";
  };
  voting: {
    map: {
      pick: FaceitMap;
    };
  };
}

export interface FaceitFaction {
  faction_id: string;
  name: string;
  avatar: string;
}

export interface VetoTicket {
  entities: VetoEntity[];
  vote_type: "drop_pick";
  entity_type: "map" | "location" | "first_voter";
}

export interface VetoEntity {
  round: number;
  guid: FaceitMap;
  random: boolean;
  selected_by: "faction1" | "faction2";
  status: "pick" | "drop";
}

export type MatchScoreByTeam = Record<string, number>;

export interface FaceitMatchEnriched {
  matchId: string;
  faceit_url: string;
  bestOf: 1 | 3 | 5;
  date: string;
  competition_name: string;
  faction1: string;
  faction2: string;
  score: MatchScoreByTeam;
  winner: "faction1" | "faction2" | "draw";
  map: FaceitMap;
  vetos?: VetoTicket;
}

export interface FaceitTeamStats {
  favMap: string;
  losses: number;
  mostBanned: string;
  total: number;
  winRate: number;
  wins: number;
}

export interface FaceitLeague {
  league_name: string;
  division_name: string;
  season_number: number;
  conference_name: string;
  region: string;
  wins: number;
  losses: number;
  placement: number;
}
