import { useParams } from "react-router-dom";
import { useState } from "react";
import VetosTable from "../../components/VetosTable";
import MapDetails from "../../components/MapDetails";
import TeamDetails from "../../components/TeamDetails";
import "./TeamStatsPage.scss";

import { useTeamData } from "../../hooks/useTeamData";
import { Box, Tabs, Tab } from "@mui/material";
import AIChat from "../../components/AIChat";

export default function TeamStatsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { team, matches, loading, stats, league } = useTeamData(teamId!);
  const [tabValue, setTabValue] = useState(0);

  console.log("LEAGUE:", league);
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {team && stats ? (
        <TeamDetails team={team} stats={stats} league={league} />
      ) : (
        <p>Team not found.</p>
      )}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={(event, newValue) => setTabValue(newValue)}
          aria-label="basic tabs example"
        >
          <Tab label="Veto Table" />
          <Tab label="Map Details" />
          <Tab label="AI Chat" />
        </Tabs>
      </Box>
      {tabValue === 0 &&
        (matches.length === 0 ? (
          <p>No matches found for this team.</p>
        ) : (
          <VetosTable matches={matches} team={team} />
        ))}
      {tabValue === 1 && <MapDetails matches={matches} />}
      {tabValue === 2 && <AIChat />}
    </div>
  );
}
