import { Alert } from "@mui/material";
import { format } from "date-fns/format";
import type { RosterAnalysis } from "../utils/roster";

export default function RosterChangesAlert({ roster }: { roster: RosterAnalysis }) {
  if (roster.changes.length === 0) return null;
  const joined = roster.changes.filter((c) => c.kind === "joined");
  const left = roster.changes.filter((c) => c.kind === "left");
  return (
    <Alert severity="warning" sx={{ mb: 2, textAlign: "left" }}>
      <strong>Roster change detected.</strong>{" "}
      {joined.length > 0 && (
        <>
          New in the lineup: {joined.map((c) => `${c.player.nickname} (since ${format(new Date(c.player.firstPlayed), "dd MMM")})`).join(", ")}.{" "}
        </>
      )}
      {left.length > 0 && (
        <>
          Not playing lately: {left.map((c) => `${c.player.nickname} (last ${format(new Date(c.player.lastPlayed), "dd MMM")})`).join(", ")}.{" "}
        </>
      )}
      Older matches may not reflect the current team — try the "Current lineup" filter.
    </Alert>
  );
}
