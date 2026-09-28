import { Avatar, Box, Button, Skeleton, Typography } from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import BarChartIcon from "@mui/icons-material/BarChart";
import { Link as RouterLink } from "react-router-dom";
import { format } from "date-fns/format";
import { useLeagueOverview, useTeam } from "../../hooks/useTeamData";
import { useMyTeam } from "../../hooks/useMyTeam";
import { colors } from "../../themes/tokens";

// Tarjeta de "mi equipo" en la home: acceso directo a su análisis y a
// scoutear al próximo rival de ESEA.
export default function MyTeamCard() {
  const { myTeamId, setMyTeamId } = useMyTeam();
  const team = useTeam(myTeamId ?? undefined);
  const overview = useLeagueOverview(myTeamId ?? undefined);

  if (!myTeamId) return null;

  const next = overview.data?.upcoming[0];
  const league = overview.data?.league;

  return (
    <Box
      sx={{
        mt: 4,
        maxWidth: 760,
        p: 2.5,
        borderRadius: 3,
        border: `1px solid ${colors.accentBorder}`,
        backgroundImage: `linear-gradient(120deg, ${colors.accentSoft}, transparent 60%)`,
        bgcolor: "background.paper",
        textAlign: "left",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="overline" sx={{ color: colors.accentText }}>
          My team
        </Typography>
        <Button size="small" sx={{ color: "text.secondary" }} onClick={() => setMyTeamId(null)}>
          Unset
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {team.data ? (
          <>
            <Avatar src={team.data.avatar || undefined} variant="rounded" sx={{ width: 48, height: 48 }}>
              {team.data.name[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 160 }}>
              <Typography variant="h6">{team.data.name}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {league ? `${league.league_name} S${league.season_number} · ${league.division_name}` : "No active ESEA league"}
              </Typography>
            </Box>
            <Button component={RouterLink} to={`/team/${myTeamId}`} size="small" startIcon={<BarChartIcon />}>
              Analysis
            </Button>
          </>
        ) : (
          <Skeleton width="60%" height={48} />
        )}
      </Box>

      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${colors.border}` }}>
        {overview.loading ? (
          <Skeleton width="80%" />
        ) : next ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Next ESEA match
                {next.scheduledAt ? ` · ${format(new Date(next.scheduledAt), "EEE dd MMM, HH:mm")}` : ""}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>vs {next.opponent.name}</Typography>
            </Box>
            <Button
              component={RouterLink}
              to={`/matchup?us=${myTeamId}&them=${next.opponent.id}`}
              variant="contained"
              startIcon={<CompareArrowsIcon />}
            >
              Scout opponent
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No upcoming ESEA match scheduled yet. Check the league tab for standings.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
