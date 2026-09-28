import type { FaceitTeam, LeagueOverview, TeamAnalysis } from "../types/faceit";

// En desarrollo Vite redirige /api al backend (ver vite.config.ts).
const API_URL = import.meta.env.VITE_API_URL ?? "/api";

async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { signal });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      res.status === 404
        ? "Not found on FACEIT."
        : (body?.error ?? `Error ${res.status} while fetching data`);
    throw new Error(message);
  }

  return res.json();
}

export function searchTeams(name: string, signal?: AbortSignal) {
  return apiGet<FaceitTeam[]>(
    `/teams/search?q=${encodeURIComponent(name)}`,
    signal,
  );
}

export function fetchTeamAnalysis(teamId: string, signal?: AbortSignal) {
  return apiGet<TeamAnalysis>(
    `/teams/${encodeURIComponent(teamId)}/analysis`,
    signal,
  );
}

export function fetchLeagueOverview(teamId: string, signal?: AbortSignal) {
  return apiGet<LeagueOverview>(
    `/teams/${encodeURIComponent(teamId)}/league-overview`,
    signal,
  );
}

export function fetchTeam(teamId: string, signal?: AbortSignal) {
  return apiGet<FaceitTeam>(`/teams/${encodeURIComponent(teamId)}`, signal);
}
