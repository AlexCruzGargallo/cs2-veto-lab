import type {
  FaceitTeam,
  FaceitTeamStats,
  FaceitLeague,
} from "../types/faceit";
import { Box, Typography, CircularProgress, Avatar } from "@mui/material";

type TeamDetailsProps = {
  team: FaceitTeam;
  stats?: FaceitTeamStats;
  league: FaceitLeague;
};

const MAP_NAMES: Record<string, string> = {
  de_dust2: "Dust 2",
  de_mirage: "Mirage",
  de_inferno: "Inferno",
  de_nuke: "Nuke",
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_overpass: "Overpass",
  de_vertigo: "Vertigo",
  de_train: "Train",
};
const formatMap = (guid: string) =>
  MAP_NAMES[guid] ??
  guid.replace("de_", "").replace(/\b\w/g, (c) => c.toUpperCase());

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const TeamDetails = ({ team, stats, league }: TeamDetailsProps) => {
  if (!team || !stats) return null;
  const { wins, losses, total, winRate, favMap, mostBanned } = stats;
  console.log("team", team);
  return (
    <Box sx={{ mb: 3 }}>
      {/* Header card */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            src={team.avatar || undefined}
            variant="rounded"
            sx={{
              width: 64,
              height: 64,
              bgcolor: "#1e40af",
              fontSize: "1.4rem",
              fontWeight: 700,
            }}
          >
            {getInitials(team.name)}
          </Avatar>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {team.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                -{team.nickname}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {league.league_name +
                  " " +
                  league.division_name +
                  " " +
                  league.conference_name +
                  " " +
                  league.region +
                  " " +
                  league.placement +
                  " (" +
                  league.wins +
                  "-" +
                  league.losses +
                  ")"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                ○ {team.game.toUpperCase()}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Typography variant="body2">
            <span style={{ color: "#4caf50", fontWeight: 700 }}>{wins}W</span>
            {" • "}
            <span style={{ color: "#f44336", fontWeight: 700 }}>{losses}L</span>
          </Typography>
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={68}
              sx={{ color: "divider", position: "absolute" }}
            />
            <CircularProgress
              variant="determinate"
              value={winRate}
              size={68}
              sx={{ color: "#3B82F6" }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{ fontWeight: 700, fontSize: "0.75rem", lineHeight: 1 }}
              >
                {winRate}%
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  color: "text.secondary",
                  lineHeight: 1,
                }}
              >
                WR
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Stat cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1.5,
        }}
      >
        {[
          { label: "Win Rate", value: `${winRate}%`, color: "#4caf50" },
          { label: "Matches", value: String(total), color: "text.primary" },
          {
            label: "Fav. Map",
            value: favMap ? formatMap(favMap) : "N/A",
            color: "#3B82F6",
          },
          {
            label: "Most Banned",
            value: mostBanned ? formatMap(mostBanned) : "N/A",
            color: "#f44336",
          },
        ].map(({ label, value, color }) => (
          <Box
            key={label}
            sx={{ bgcolor: "background.paper", borderRadius: 2, p: 2 }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block" }}
            >
              {label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color, mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TeamDetails;
