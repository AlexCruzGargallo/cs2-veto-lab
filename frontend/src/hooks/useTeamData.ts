import { fetchLeagueOverview, fetchTeam, fetchTeamAnalysis } from "../services/faceit";
import { useAsync } from "./useAsync";

export function useTeamData(teamId: string | undefined) {
  return useAsync(teamId, fetchTeamAnalysis);
}

export function useLeagueOverview(teamId: string | undefined) {
  return useAsync(teamId, fetchLeagueOverview);
}

export function useTeam(teamId: string | undefined) {
  return useAsync(teamId, fetchTeam);
}
