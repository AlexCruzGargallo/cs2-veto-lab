import { useState, useEffect, useMemo } from "react";
import {
  fetchTeamData,
  fetchMatches,
  fetchLeagueData,
} from "../services/faceit";
import { enrichMatch } from "../services/mapper";
import type {
  FaceitMatchEnriched,
  FaceitTeam,
  FaceitTeamStats,
  FaceitLeague,
} from "../types/faceit";

export function useTeamData(teamId: string) {
  const [team, setTeam] = useState<FaceitTeam | null>(null);
  const [matches, setMatches] = useState<FaceitMatchEnriched[]>([]);
  const [league, setLeague] = useState<FaceitLeague>();
  const [loading, setLoading] = useState(false);

  function computeStats(
    team: FaceitTeam,
    matches: FaceitMatchEnriched[],
  ): FaceitTeamStats {
    let wins = 0;
    let losses = 0;

    const mapPicks: Record<string, number> = {};
    const mapDropsByUs: Record<string, number> = {};

    for (const match of matches) {
      const ourFaction = match.faction1 === team.name ? "faction1" : "faction2";

      if (match.winner === ourFaction) {
        wins++;
      } else {
        losses++;
      }

      match.vetos?.entities.forEach((veto) => {
        const byUs = veto.selected_by === ourFaction;

        if (veto.status === "pick" && byUs) {
          mapPicks[veto.guid] = (mapPicks[veto.guid] ?? 0) + 1;
        }

        if (veto.status === "drop" && byUs) {
          mapDropsByUs[veto.guid] = (mapDropsByUs[veto.guid] ?? 0) + 1;
        }
      });
    }

    const total = wins + losses;

    return {
      wins,
      losses,
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      favMap:
        Object.entries(mapPicks).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      mostBanned:
        Object.entries(mapDropsByUs).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        null,
    };
  }

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      setLoading(true);

      try {
        const [teamData, history, leagueData] = await Promise.all([
          fetchTeamData(teamId),
          fetchMatches(teamId),
          fetchLeagueData(teamId),
        ]);

        const enrichedMatches = await Promise.all(history.map(enrichMatch));

        setTeam(teamData);
        setMatches(enrichedMatches);
        setLeague(leagueData);
      } catch (error) {
        console.error("Error loading team data:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teamId]);

  const stats = useMemo(() => {
    if (!team) return null;
    return computeStats(team, matches);
  }, [team, matches]);

  return {
    team,
    matches,
    stats,
    league,
    loading,
  };
}
