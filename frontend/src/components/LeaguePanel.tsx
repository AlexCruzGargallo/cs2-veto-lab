import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { Link as RouterLink } from "react-router-dom";
import { format } from "date-fns/format";
import type { LeagueMatch, LeagueOverview } from "../types/faceit";
import { useLeagueOverview } from "../hooks/useTeamData";
import { colors, tint } from "../themes/tokens";
import Panel from "./ui/Panel";

const signedDiff = (a: number, b: number) => (a - b > 0 ? `+${a - b}` : String(a - b));

function MatchRow({ match, teamId }: { match: LeagueMatch; teamId: string }) {
  const upcoming = match.won === null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.25,
        borderRadius: 2,
        bgcolor: colors.hover,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ minWidth: 110 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {match.scheduledAt ? format(new Date(match.scheduledAt), "EEE dd MMM") : "TBD"}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {match.scheduledAt ? format(new Date(match.scheduledAt), "HH:mm") : ""}
          {match.round ? ` · Round ${match.round}` : ""}
        </Typography>
      </Box>
      <Avatar src={match.opponent.avatar || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
        {match.opponent.name[0]}
      </Avatar>
      <Link
        component={RouterLink}
        to={`/team/${match.opponent.id}`}
        color="inherit"
        underline="hover"
        sx={{ fontWeight: 600, flex: 1, minWidth: 120 }}
      >
        {match.opponent.name}
      </Link>
      {upcoming ? (
        <Button
          component={RouterLink}
          to={`/matchup?us=${teamId}&them=${match.opponent.id}`}
          size="small"
          variant="contained"
          startIcon={<CompareArrowsIcon />}
          disabled={!match.opponent.id}
        >
          Scout
        </Button>
      ) : (
        <Chip
          size="small"
          label={match.won ? "W" : "L"}
          sx={{
            fontWeight: 800,
            color: match.won ? colors.win : colors.loss,
            bgcolor: tint(match.won ? colors.win : colors.loss, 0.16),
          }}
        />
      )}
    </Box>
  );
}

function Standings({ overview, teamId }: { overview: LeagueOverview; teamId: string }) {
  if (overview.standings.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", px: 2.5, pb: 2.5 }}>
        No standings available yet.
      </Typography>
    );
  }
  return (
    <TableContainer sx={{ maxHeight: 560 }}>
      <Table size="small" stickyHeader sx={{ minWidth: 560, "& td, & th": { px: 2 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: "background.paper" }}>#</TableCell>
            <TableCell sx={{ bgcolor: "background.paper" }}>Team</TableCell>
            <TableCell align="right" sx={{ bgcolor: "background.paper" }}>W-L</TableCell>
            <TableCell align="right" sx={{ bgcolor: "background.paper" }}>Maps</TableCell>
            <TableCell align="right" sx={{ bgcolor: "background.paper" }}>Rounds</TableCell>
            <TableCell sx={{ bgcolor: "background.paper" }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {overview.standings.map((row) => {
            const isTeam = row.teamId === teamId;
            return (
              <TableRow
                key={row.teamId}
                hover
                sx={isTeam ? { bgcolor: colors.accentSoft, "& td": { borderColor: colors.accentBorder } } : undefined}
              >
                <TableCell sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>{row.rank}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar src={row.avatar || undefined} variant="rounded" sx={{ width: 22, height: 22 }}>
                      {row.name[0]}
                    </Avatar>
                    <Link
                      component={RouterLink}
                      to={`/team/${row.teamId}`}
                      color="inherit"
                      underline="hover"
                      sx={{ fontWeight: isTeam ? 700 : 500 }}
                    >
                      {row.name}
                    </Link>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {row.won}-{row.lost}
                  {row.tied ? `-${row.tied}` : ""}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
                  {signedDiff(row.mapsWon, row.mapsLost)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
                  {signedDiff(row.roundsWon, row.roundsLost)}
                </TableCell>
                <TableCell align="right">
                  {!isTeam && (
                    <Button
                      component={RouterLink}
                      to={`/matchup?us=${teamId}&them=${row.teamId}`}
                      size="small"
                      sx={{ color: "text.secondary", minWidth: 0 }}
                    >
                      Compare
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function LeaguePanel({ teamId }: { teamId: string }) {
  const { data, loading, error, retry } = useLeagueOverview(teamId);

  if (loading) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }
  if (error || !data) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={retry}>Retry</Button>}>
        {error ?? "Couldn't load the league."}
      </Alert>
    );
  }
  if (!data.league && data.standings.length === 0) {
    return (
      <Panel>
        <Typography sx={{ color: "text.secondary" }}>This team isn't registered in an ESEA league.</Typography>
      </Panel>
    );
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 5fr) minmax(0, 7fr)" }, gap: 2, alignItems: "start" }}>
      <Box sx={{ display: "grid", gap: 2 }}>
        <Panel title="Upcoming ESEA matches">
          {data.upcoming.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No upcoming matches scheduled yet. They'll show up here as soon as FACEIT publishes the
              schedule.
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1 }}>
              {data.upcoming.map((m) => (
                <MatchRow key={m.matchId || `${m.opponent.id}-${m.round}`} match={m} teamId={teamId} />
              ))}
            </Box>
          )}
        </Panel>
        {data.recent.length > 0 && (
          <Panel title="Recent league results">
            <Box sx={{ display: "grid", gap: 1 }}>
              {data.recent.slice(0, 6).map((m) => (
                <MatchRow key={m.matchId} match={m} teamId={teamId} />
              ))}
            </Box>
          </Panel>
        )}
      </Box>

      <Panel
        title="Standings"
        subtitle={data.standingsLabel ?? undefined}
        action={
          data.standingsFromPreviousSeason ? (
            <Chip size="small" variant="outlined" label="Previous season · current one hasn't started" />
          ) : undefined
        }
        padded={false}
      >
        <Standings overview={data} teamId={teamId} />
      </Panel>
    </Box>
  );
}
