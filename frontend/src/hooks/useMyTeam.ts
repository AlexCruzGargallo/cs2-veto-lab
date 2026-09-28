import { useSyncExternalStore } from "react";
import { getMyTeamId, onMyTeamChange, setMyTeamId } from "../utils/myTeam";

export function useMyTeam() {
  const myTeamId = useSyncExternalStore(onMyTeamChange, getMyTeamId, () => null);
  return { myTeamId, setMyTeamId };
}
