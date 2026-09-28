import { Box, Typography } from "@mui/material";
import { useState } from "react";
import { fetchTeamId } from "../../services/faceit";
import SearchBar from "../../components/home/SearchBar";
import TeamCard from "../../components/home/TeamCard";
import type { FaceitTeam } from "../../types/faceit";

export default function MapVetoScoutPage() {
  const [teams, setTeams] = useState<FaceitTeam[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // setLoading(true);
    try {
      const teams = await fetchTeamId(searchTerm);
      setTeams(teams);
      setHasSearched(true);
    } catch (error) {
      console.error(error);
    } finally {
      // setLoading(false);
    }
  };

  return (
    <>
      <section>
        <Box sx={{ textAlign: "start", mb: 8 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{ color: "text.primary" }}
          >
            Map Veto <span style={{ color: "#3B82F6" }}>Scout</span>
          </Typography>
          <Typography
            variant="body1"
            component="p"
            sx={{
              mt: 1,
              color: "text.secondary",
              fontSize: "1rem",
              maxWidth: 760,
            }}
          >
            Search teams, analyze veto patterns, gain the competitive edge.
          </Typography>
        </Box>
      </section>
      <section>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={handleSubmit}
        />
        {hasSearched && (
          <Typography
            variant="body1"
            component="p"
            sx={{
              textAlign: "start",
              mt: 1,
              color: "text.secondary",
              fontSize: "1rem",
              maxWidth: 760,
            }}
          >
            <span style={{ color: "#FFFFFF" }}>{teams.length} </span>
            teams found for "{searchTerm}"
          </Typography>
        )}
      </section>
      <section>
        {teams.length > 0 && (
          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {teams.map((team) => (
              <TeamCard key={team.team_id} team={team} />
            ))}
          </Box>
        )}
      </section>
    </>
  );
}
