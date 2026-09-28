import { mapLimit } from "../lib/http.js";
import type { LeagueMatch, LeagueOverview, StandingRow } from "../types.js";
import {
  getConference,
  getCurrentLeague,
  getLeagueSummary,
  getStandings,
  getTeamById,
  getTeamChampionshipMatches,
} from "./faceitService.js";

const ESEA_LEAGUE_ID = "a14b8616-45b9-4581-8637-4dfd0b5f6af8";

type Stage = {
  stage_name: string;
  conference_id: string;
  division_name: string;
};

type Season = {
  season_number: string;
  season_standings: Stage[];
};

const isRegularSeason = (s: Stage) => /regular/i.test(s.stage_name);

// Calendario y clasificación de ESEA del equipo. En ESEA cada conferencia de
// cada fase es un "championship" de Faceit distinto.
export async function getLeagueOverview(teamId: string): Promise<LeagueOverview> {
  const [league, summary] = await Promise.all([getCurrentLeague(teamId), getLeagueSummary(teamId)]);

  const esea = summary.find((l: any) => l.league_id === ESEA_LEAGUE_ID) ?? summary[0];
  const seasons: Season[] = [...(esea?.league_seasons_info ?? [])].sort(
    (a, b) => Number(b.season_number) - Number(a.season_number),
  );

  const empty: LeagueOverview = {
    league,
    standingsLabel: null,
    standingsFromPreviousSeason: false,
    standings: [],
    upcoming: [],
    recent: [],
  };
  const current = seasons[0];
  if (!current) return empty;

  // Partidos: de todas las fases de la temporada actual (liga y playoffs).
  const matchLists = await Promise.all(
    current.season_standings.map(async (stage) => {
      const conference = await getConference(stage.conference_id);
      if (!conference?.championship_id) return [];
      return getTeamChampionshipMatches(teamId, conference.championship_id);
    }),
  );
  const { upcoming, recent } = await toLeagueMatches(teamId, matchLists.flat());

  // Clasificación: la de la liga regular de la temporada actual o, si aún no
  // hay datos (temporada sin empezar), la de la anterior.
  let standings: StandingRow[] = [];
  let label: string | null = null;
  let fromPrevious = false;
  for (const [i, season] of seasons.slice(0, 2).entries()) {
    const stage = season.season_standings.find(isRegularSeason) ?? season.season_standings[0];
    if (!stage) continue;
    standings = (await getStandings(stage.conference_id)).map(toStandingRow);
    if (standings.length) {
      label = `S${season.season_number} ${stage.division_name} · ${stage.stage_name}`;
      fromPrevious = i > 0;
      break;
    }
  }

  return {
    league,
    standingsLabel: label,
    standingsFromPreviousSeason: fromPrevious,
    standings,
    upcoming,
    recent,
  };
}

function toStandingRow(row: any): StandingRow {
  return {
    teamId: row.premade_team_id,
    name: row.name,
    avatar: row.avatar_url ?? "",
    rank: Number(row.rank_start) || 0,
    won: Number(row.won) || 0,
    lost: Number(row.lost) || 0,
    tied: Number(row.tied) || 0,
    points: Number(row.points) || 0,
    mapsWon: Number(row.tie_breakers?.maps_won) || 0,
    mapsLost: Number(row.tie_breakers?.maps_lost) || 0,
    roundsWon: Number(row.tie_breakers?.rounds_won) || 0,
    roundsLost: Number(row.tie_breakers?.rounds_lost) || 0,
  };
}

async function toLeagueMatches(teamId: string, items: any[]) {
  const opponentIds = [
    ...new Set(
      items.map((m) => m.factions?.find((f: any) => f.id !== teamId)?.id).filter(Boolean) as string[],
    ),
  ];
  // Nombres y avatares de los rivales (cacheados por equipo).
  const teams = new Map<string, any>();
  const results = await mapLimit(opponentIds, 4, getTeamById);
  results.forEach((r, i) => {
    if (r.status === "fulfilled") teams.set(opponentIds[i], r.value);
  });

  const matches: LeagueMatch[] = items
    .filter((m) => m.status !== "cancelled")
    .map((m) => {
      const opponentId = m.factions?.find((f: any) => f.id !== teamId)?.id ?? "";
      const team = teams.get(opponentId);
      const finished = m.status === "finished";
      return {
        matchId: m.origin?.id ?? "",
        opponent: {
          id: opponentId,
          name: team?.name ?? (opponentId ? "Unknown team" : "TBD"),
          avatar: team?.avatar ?? "",
        },
        scheduledAt: m.origin?.schedule ?? null,
        status: m.status,
        round: m.round ?? null,
        won: finished ? m.winner === teamId : null,
      };
    });

  const byDate = (a: LeagueMatch, b: LeagueMatch) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0);
  return {
    upcoming: matches.filter((m) => m.won === null).sort(byDate),
    recent: matches.filter((m) => m.won !== null).sort(byDate).reverse(),
  };
}
