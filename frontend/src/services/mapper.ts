import type { FaceitMatch } from "../types/faceit";
import { fetchMatchData, fetchMatchVetos } from "./faceit";

export async function enrichMatch(match: FaceitMatch) {
  const [vetos, matchDetails] = await Promise.all([
    fetchMatchVetos(match.matchId),
    fetchMatchData(match.matchId),
  ]);

  const mapVetoTicket = vetos.payload.tickets.find(
    (ticket: { entity_type: string }) => ticket.entity_type === "map",
  );

  return {
    matchId: match.matchId,
    faceit_url: matchDetails.faceit_url,
    bestOf: match.bestOf,
    date: match.date,
    competition_name: matchDetails.competition_name,
    faction1: matchDetails.teams.faction1.name,
    faction2: matchDetails.teams.faction2.name,
    score: {
      [matchDetails.teams.faction1.name]: matchDetails.results.score.faction1,
      [matchDetails.teams.faction2.name]: matchDetails.results.score.faction2,
    },
    winner: matchDetails.results.winner,
    vetos: mapVetoTicket,
  };
}
