import { Link as RouterLink, useParams } from "react-router-dom";
import { useMemo } from "react";
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Tab as MuiTab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import VetosTable from "../../components/VetosTable";
import MapDetails from "../../components/MapDetails";
import TeamDetails from "../../components/TeamDetails";
import PlayersPanel from "../../components/PlayersPanel";
import RosterChangesAlert from "../../components/RosterChangesAlert";
import LeaguePanel from "../../components/LeaguePanel";
import FilterBar from "../../components/FilterBar";
import Panel from "../../components/ui/Panel";
import { useTeamData } from "../../hooks/useTeamData";
import { useAnalysisFilters } from "../../hooks/useAnalysisFilters";
import { useMyTeam } from "../../hooks/useMyTeam";
import { computeTeamStats, filterMatches } from "../../utils/stats";
import { analyzeRoster } from "../../utils/roster";
import { colors } from "../../themes/tokens";
import "./TeamStatsPage.scss";

const TABS = ["vetos", "maps", "players", "league"] as const;
type Tab = (typeof TABS)[number];

function LoadingState() {
  return (
    <Box>
      <Skeleton variant="rounded" height={120} sx={{ mb: 1.5, borderRadius: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5, mb: 3 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={92} sx={{ borderRadius: 2.5 }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={44} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={360} sx={{ borderRadius: 3 }} />
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 2, textAlign: "center" }}>
        Analyzing recent matches… The first time can take a while; after that it's cached.
      </Typography>
    </Box>
  );
}

export default function TeamStatsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data, loading, error, retry } = useTeamData(teamId);
  const { filters, setFilter, params, setParam } = useAnalysisFilters();
  const { myTeamId, setMyTeamId } = useMyTeam();

  const tabParam = params.get("tab") as Tab;
  const tab: Tab = TABS.includes(tabParam) ? tabParam : "vetos";

  // La alineación actual y los cambios de roster se calculan con TODOS los
  // partidos, no con los filtrados.
  const roster = useMemo(() => analyzeRoster(data?.matches ?? []), [data]);

  const matches = useMemo(
    () =>
      filterMatches(data?.matches ?? [], {
        competition: filters.competition,
        format: filters.format,
        period: filters.period,
        currentLineup: filters.lineup ? roster.currentLineup : null,
      }),
    [data, filters.competition, filters.format, filters.period, filters.lineup, roster],
  );
  const stats = useMemo(() => computeTeamStats(matches), [matches]);

  const backButton = (
    <Button component={RouterLink} to="/" size="small" startIcon={<ArrowBackIcon />} sx={{ color: "text.secondary" }}>
      Search
    </Button>
  );

  if (loading) {
    return (
      <>
        <Box sx={{ mb: 2 }}>{backButton}</Box>
        <LoadingState />
      </>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ textAlign: "left" }}>
        <Box sx={{ mb: 2 }}>{backButton}</Box>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Retry
            </Button>
          }
        >
          {error ?? "Team not found."}
        </Alert>
      </Box>
    );
  }

  const teamIdValue = data.team.team_id;
  const isMyTeam = myTeamId === teamIdValue;
  const hasLeagueMatches = data.matches.some((m) => m.isLeague);
  // Sólo se ofrecen los formatos que el equipo ha jugado de verdad.
  const formats = [...new Set(data.matches.map((m) => m.bestOf))].sort((a, b) => a - b);
  const showsFilters = tab !== "league";

  return (
    <div>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        {backButton}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title={isMyTeam ? "This is your team" : "Remember this team as yours for quick scouting"}>
            <Button
              size="small"
              variant="outlined"
              startIcon={isMyTeam ? <StarIcon sx={{ color: colors.warn }} /> : <StarBorderIcon />}
              onClick={() => setMyTeamId(isMyTeam ? null : teamIdValue)}
              sx={{ borderColor: colors.border, color: isMyTeam ? "text.primary" : "text.secondary" }}
            >
              {isMyTeam ? "My team" : "Set as my team"}
            </Button>
          </Tooltip>
          {!isMyTeam && (
            <Button
              component={RouterLink}
              to={`/matchup?them=${teamIdValue}`}
              variant="contained"
              size="small"
              startIcon={<CompareArrowsIcon />}
            >
              Compare with my team
            </Button>
          )}
        </Box>
      </Box>

      <TeamDetails team={data.team} stats={stats} league={data.league} />

      <RosterChangesAlert roster={roster} />

      {data.failedMatches.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, textAlign: "left" }}>
          {data.failedMatches.length} matches couldn't be loaded and are not included in the stats.
        </Alert>
      )}

      <Box sx={{ borderBottom: `1px solid ${colors.border}`, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v: Tab) => setParam("tab", v === "vetos" ? null : v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <MuiTab value="vetos" label={`Veto history (${matches.length})`} />
          <MuiTab value="maps" label="Map pool" />
          <MuiTab value="players" label="Players" />
          <MuiTab value="league" label="League" />
        </Tabs>
      </Box>

      {showsFilters && (
        <FilterBar
          filters={filters}
          setFilter={setFilter}
          hasLeague={hasLeagueMatches}
          formats={formats}
          lineupAvailable={roster.currentLineup.length > 0}
        />
      )}

      {tab === "vetos" &&
        (matches.length === 0 ? (
          <Panel>
            <Typography sx={{ color: "text.secondary" }}>
              {data.matches.length === 0
                ? "This team has no recent matches."
                : "No matches match the current filters."}
            </Typography>
          </Panel>
        ) : (
          <VetosTable matches={matches} teamId={teamIdValue} />
        ))}
      {tab === "maps" && <MapDetails stats={stats} />}
      {tab === "players" && <PlayersPanel matches={matches} currentLineup={roster.currentLineup} currentElo={data.currentElo ?? {}} />}
      {tab === "league" && <LeaguePanel teamId={teamIdValue} />}
    </div>
  );
}
