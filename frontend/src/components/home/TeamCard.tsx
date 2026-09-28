import type { FaceitTeam } from "../../types/faceit";
import { Box, Button, Card, CardContent, CardHeader } from "@mui/material";
import { useNavigate } from "react-router-dom";
import default_team from "../../assets/default_team.png";
import LinkIcon from "@mui/icons-material/Link";
import BarChartIcon from "@mui/icons-material/BarChart";
import { colors } from "../../themes/tokens";

interface TeamCardProps {
  team: FaceitTeam;
}

export default function TeamCard({ team }: TeamCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="team-card"
      sx={{
        transition: "border-color 150ms, transform 150ms",
        "&:hover": { borderColor: colors.accentBorder, transform: "translateY(-2px)" },
      }}
    >
      <CardHeader
        sx={{ textAlign: "left", pb: 0 }}
        avatar={
          <img
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              objectFit: "cover",
              border: `1px solid ${colors.border}`,
            }}
            src={team.avatar || default_team}
            alt={team.name}
          />
        }
        title={team.name}
        subheader={`${team.nickname} · ${team.game.toUpperCase()}`}
        slotProps={{
          title: { sx: { fontWeight: 700, fontSize: "1rem" }, noWrap: true },
          subheader: { noWrap: true },
        }}
      />
      <CardContent>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LinkIcon />}
            target="_blank"
            href={team.faceit_url}
            sx={{
              borderColor: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.65)",
              backgroundColor: "rgba(255,255,255,0.02)",

              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.12)",
              },
            }}
          >
            Faceit Page
          </Button>

          <Button
            fullWidth
            variant="contained"
            startIcon={<BarChartIcon />}
            onClick={() => navigate("/team/" + team.team_id)}
            sx={{
              backgroundColor: "rgba(59,130,246,0.12)",
              color: "#60a5fa",
              border: "1px solid rgba(59,130,246,0.3)",

              "&:hover": {
                backgroundColor: "rgba(59,130,246,0.18)",
              },
            }}
          >
            Analysis
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
