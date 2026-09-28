const API_URL = "http://localhost:3001/api";

//return the team id for a given team name
export async function fetchTeamId(teamName: string) {
  const res = await fetch(`${API_URL}/team/${teamName}`);

  if (!res.ok) {
    throw new Error("Error al obtener datos");
  }

  return await res.json();
}

//return the team data for a given team id
export async function fetchTeamData(teamId: string) {
  const res = await fetch(`${API_URL}/teamById/${teamId}`);

  if (!res.ok) {
    throw new Error("Error al obtener datos");
  }

  return await res.json();
}

//return an array of matches for a given team id
export async function fetchMatches(teamId: string) {
  const res = await fetch(`${API_URL}/matches/${teamId}`);

  if (!res.ok) {
    throw new Error("Error al obtener datos");
  }

  return await res.json();
}

//return the vetos for a given match id
export async function fetchMatchVetos(matchId: string) {
  const res = await fetch(`${API_URL}/vetos/${matchId}`);

  if (!res.ok) {
    throw new Error("Error al obtener datos");
  }

  return await res.json();
}

//return the match data for a given match id
export async function fetchMatchData(matchId: string) {
  const res = await fetch(`${API_URL}/match/${matchId}`);

  if (!res.ok) {
    throw new Error("Error al obtener datos");
  }

  return await res.json();
}

//return league details for a given team id
export async function fetchLeagueData(teamId: string) {
  const res = await fetch(`${API_URL}/team/${teamId}/league`);

  if (!res.ok) {
    throw new Error("Error al obtener datos");
  }

  return await res.json();
}
