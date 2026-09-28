import { Alert, Box, Chip, Skeleton, Typography } from "@mui/material";
import { useState } from "react";
import BlockIcon from "@mui/icons-material/Block";
import MapIcon from "@mui/icons-material/Map";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { searchTeams } from "../../services/faceit";
import SearchBar from "../../components/home/SearchBar";
import TeamCard from "../../components/home/TeamCard";
import MyTeamCard from "../../components/home/MyTeamCard";
import type { FaceitTeam } from "../../types/faceit";
import { colors } from "../../themes/tokens";

const FEATURES = [
  {
    icon: <BlockIcon fontSize="small" />,
    title: "Veto patterns",
    text: "Every pick and ban from recent matches: permabans, first bans and what they leave as decider.",
  },
  {
    icon: <MapIcon fontSize="small" />,
    title: "Map pool",
    text: "Win rate, round difference and pick/ban rate per map, filtered by ESEA and BO1/BO3.",
  },
  {
    icon: <CompareArrowsIcon fontSize="small" />,
    title: "Matchup simulator",
    text: "Compare your team with the opponent and simulate the veto before the match.",
  },
];

const gridSx = {
  mt: 3,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 2,
};

export default function MapVetoScoutPage() {
  const [teams, setTeams] = useState<FaceitTeam[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  // El término buscado se guarda aparte para que el texto "N teams found for X"
  // no cambie mientras el usuario sigue escribiendo.
  const [searchedTerm, setSearchedTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    setError(null);
    try {
      setTeams(await searchTeams(term));
      setSearchedTerm(term);
    } catch (err) {
      setTeams([]);
      setSearchedTerm(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section>
        <Box sx={{ textAlign: "start", mb: 4, maxWidth: 760 }}>
          <Chip
            label="FACEIT · ESEA scouting"
            size="small"
            sx={{
              mb: 2,
              bgcolor: colors.accentSoft,
              color: colors.accentText,
              border: `1px solid ${colors.accentBorder}`,
            }}
          />
          <Typography variant="h1" sx={{ fontSize: { xs: "2.1rem", md: "2.8rem" } }}>
            Map Veto <span style={{ color: colors.accent }}>Scout</span>
          </Typography>
          <Typography
            variant="body1"
            component="p"
            sx={{ mt: 1.5, color: "text.secondary", fontSize: "1.05rem" }}
          >
            Search teams, analyze veto patterns, gain the competitive edge.
          </Typography>
        </Box>
      </section>

      <section>
        <Box sx={{ maxWidth: 760 }}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={handleSubmit}
            loading={loading}
            placeholder="Search a team by name, e.g. BGNS Orange"
          />
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 760 }}>
            {error}
          </Alert>
        )}
        {searchedTerm === null && <MyTeamCard />}
        {!loading && searchedTerm !== null && (
          <Typography variant="body2" sx={{ textAlign: "start", mt: 3, color: "text.secondary" }}>
            <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
              {teams.length}
            </Box>{" "}
            {teams.length === 1 ? "team" : "teams"} found for "{searchedTerm}"
          </Typography>
        )}
      </section>

      <section>
        {loading && (
          <Box sx={gridSx}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={148} />
            ))}
          </Box>
        )}

        {!loading && teams.length > 0 && (
          <Box sx={gridSx}>
            {teams.map((team) => (
              <TeamCard key={team.team_id} team={team} />
            ))}
          </Box>
        )}

        {!loading && searchedTerm === null && (
          <Box sx={{ ...gridSx, mt: 6 }}>
            {FEATURES.map((f) => (
              <Box
                key={f.title}
                sx={{
                  textAlign: "left",
                  p: 2.5,
                  borderRadius: 3,
                  border: `1px solid ${colors.border}`,
                  bgcolor: "rgba(26,32,44,0.6)",
                }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: colors.accentSoft,
                    color: colors.accentText,
                    mb: 1.5,
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="h6">{f.title}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  {f.text}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </section>
    </>
  );
}
