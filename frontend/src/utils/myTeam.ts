// "Mi equipo" se recuerda en el navegador para no tener que buscarlo cada vez
// que se compara con un rival. localStorage puede fallar (modo privado), así
// que cualquier error se ignora.

const KEY = "myTeamId";
const EVENT = "my-team-change";

export function getMyTeamId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setMyTeamId(teamId: string | null) {
  try {
    if (teamId) localStorage.setItem(KEY, teamId);
    else localStorage.removeItem(KEY);
  } catch {
    // sin persistencia: no pasa nada
  }
  // Avisa a los componentes montados (useMyTeam) del cambio.
  window.dispatchEvent(new Event(EVENT));
}

export function onMyTeamChange(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
