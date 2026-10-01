import type { FaceitTeam, TeamStats, FaceitLeague } from "../types/faceit";
import { Box, Typography, CircularProgress, Avatar, Chip, Link } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { formatMap } from "../utils/maps";
import StatCard from "./ui/StatCard";
import { colors } from "../themes/tokens";

type TeamDetailsProps = {
  team: FaceitTeam;
  stats: TeamStats;
  league: FaceitLeague | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LeagueLine({ league }: { league: FaceitLeague }) {
  const record = [league.wins, league.losses, league.ties ? league.ties : null]
    .filter((n) => n !== null)
    .join("-");

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
      <Chip
        size="small"
        label={`${league.league_name} S${league.season_number}`}
        sx={{ bgcolor: colors.accentSoft, color: colors.accentText, border: `1px solid ${colors.accentBorder}` }}
      />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {league.division_name}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {league.conference_name} · {league.region}
        {league.stage_name ? ` · ${league.stage_name}` : ""}
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        label={`${league.placement ? `#${league.placement} · ` : ""}${record}`}
      />
    </Box>
  );
}

function WinRateRing({ value }: { value: number | null }) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={72}
        thickness={4}
        sx={{ color: colors.border, position: "absolute" }}
      />
      <CircularProgress
        variant="determinate"
        value={value ?? 0}
        size={72}
        thickness={4}
        sx={{ color: colors.accent, "& circle": { strokeLinecap: "round" } }}
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
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1 }}>
          {value === null ? "–" : `${value}%`}
        </Typography>
        <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", lineHeight: 1.4 }}>
          WR
        </Typography>
      </Box>
    </Box>
  );
}

const TeamDetails = ({ team, stats, league }: TeamDetailsProps) => {
  const { matches, maps, favMap, mostBanned, firstBan } = stats;

  return (
    <Box sx={{ mb: 3, textAlign: "left" }}>
      {/* Header card */}
      <Box
        sx={{
          bgcolor: "background.paper",
          border: `1px solid ${colors.border}`,
          backgroundImage: `linear-gradient(120deg, ${colors.accentSoft}, transparent 45%)`,
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Avatar
            src={team.avatar || undefined}
            variant="rounded"
            sx={{
              width: 72,
              height: 72,
              bgcolor: colors.accentDeep,
              fontSize: "1.4rem",
              fontWeight: 700,
              border: `1px solid ${colors.border}`,
            }}
          >
            {getInitials(team.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "1.5rem", md: "1.9rem" } }}>
                {team.name}
              </Typography>
              <Link
                href={`https://www.faceit.com/en/teams/${team.team_id}`}
                target="_blank"
                rel="noreferrer"
                variant="body2"
                underline="hover"
                sx={{ color: "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                {team.nickname}
                <OpenInNewIcon sx={{ fontSize: 14 }} />
              </Link>
            </Box>
            {league ? (
              <LeagueLine league={league} />
            ) : (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                No active ESEA league
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="h5">
              <span style={{ color: colors.win }}>{matches.wins}W</span>
              <span style={{ color: colors.muted, fontWeight: 400 }}> · </span>
              <span style={{ color: colors.loss }}>{matches.losses}L</span>
              {matches.draws > 0 && (
                <span style={{ color: colors.muted }}> · {matches.draws}D</span>
              )}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {matches.total > 0 ? `last ${matches.total} matches` : "no played matches"}
            </Typography>
          </Box>
          <WinRateRing value={matches.winRate} />
        </Box>
      </Box>

      {/* Stat cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 1.5,
        }}
      >
        <StatCard label="Matches" value={matches.total} hint={`${matches.wins}-${matches.losses}`} />
        <StatCard
          label="Map win rate"
          value={maps.winRate === null ? "N/A" : `${maps.winRate}%`}
          hint={`${maps.wins}-${maps.losses} in maps`}
          color={colors.win}
        />
        <StatCard
          label="Fav. map"
          value={favMap ? formatMap(favMap) : "N/A"}
          hint="most picked"
          color={colors.accent}
        />
        <StatCard
          label="Most banned"
          value={mostBanned ? formatMap(mostBanned) : "N/A"}
          hint="by this team"
          color={colors.loss}
        />
        <StatCard
          label="First ban"
          value={firstBan ? formatMap(firstBan) : "N/A"}
          hint="usual opening ban"
          color={colors.warn}
        />
      </Box>
    </Box>
  );
};

export default TeamDetails;
