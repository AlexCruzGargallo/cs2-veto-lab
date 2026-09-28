import { useMemo } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { format } from "date-fns/format";
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  Link,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TeamPicker from "../../components/matchup/TeamPicker";
import MapPoolTable from "../../components/matchup/MapPoolTable";
import VetoSimulator from "../../components/matchup/VetoSimulator";
import Panel from "../../components/ui/Panel";
import ResultBadge from "../../components/ui/ResultBadge";
import { useTeamData } from "../../hooks/useTeamData";
import type { TeamAnalysis, TeamStats } from "../../types/faceit";
import { computeTeamStats, filterMatches } from "../../utils/stats";
import { analyzeRoster } from "../../utils/roster";
import FilterBar from "../../components/FilterBar";
import { useAnalysisFilters, type AnalysisFilters } from "../../hooks/useAnalysisFilters";
import { useMyTeam } from "../../hooks/useMyTeam";
import { compareMapPools } from "../../utils/matchup";
import { ACTIVE_MAP_POOL, formatMap } from "../../utils/maps";
import { colors } from "../../themes/tokens";

type SlotProps = {
  label: string;
  highlight?: boolean;
  analysis: ReturnType<typeof useTeamData>;
  stats: TeamStats | null;
  onChange: () => void;
};

function TeamSlot({ label, highlight, analysis, stats, onChange }: SlotProps) {
  const { data, loading, error, retry } = analysis;

  return (
    <Box
      sx={{
        height: "100%",
        bgcolor: "background.paper",
        border: `1px solid ${highlight ? colors.accentBorder : colors.border}`,
        backgroundImage: highlight ? `linear-gradient(120deg, ${colors.accentSoft}, transparent 60%)` : "none",
        borderRadius: 3,
        p: 2,
        textAlign: "left",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="overline" sx={{ color: highlight ? colors.accentText : "text.secondary" }}>
          {label}
        </Typography>
        <Button size="small" onClick={onChange} sx={{ color: "text.secondary" }}>
          Change
        </Button>
      </Box>
      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Skeleton variant="rounded" width={56} height={56} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="60%" height={28} />
            <Skeleton width="80%" />
          </Box>
        </Box>
      )}
      {error && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={retry}>Retry</Button>}>
          {error}
        </Alert>
      )}
      {data && stats && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src={data.team.avatar || undefined}
            variant="rounded"
            sx={{ width: 56, height: 56, bgcolor: colors.accentDeep, border: `1px solid ${colors.border}` }}
          >
            {data.team.name[0]}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Link
              component={RouterLink}
              to={`/team/${data.team.team_id}`}
              variant="h5"
              color="inherit"
              underline="hover"
              sx={{ display: "block", fontSize: "1.3rem" }}
              noWrap
            >
              {data.team.name}
            </Link>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              {data.league ? `${data.league.league_name} · ${data.league.division_name}` : "No active ESEA league"}
            </Typography>
            <Typography variant="caption" sx={{ display: "block" }}>
              <span style={{ color: colors.win, fontWeight: 700 }}>{stats.matches.wins}W</span>
              <span style={{ color: colors.muted }}> · </span>
              <span style={{ color: colors.loss, fontWeight: 700 }}>{stats.matches.losses}L</span>
              <span style={{ color: colors.muted }}>
                {" "}· maps {stats.maps.winRate === null ? "–" : `${stats.maps.winRate}%`}
              </span>
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function statsFor(data: TeamAnalysis | null, filters: AnalysisFilters) {
  if (!data) return null;
  // "Alineación actual" es la de cada equipo, calculada con todos sus partidos.
  const currentLineup = filters.lineup ? analyzeRoster(data.matches).currentLineup : null;
  const matches = filterMatches(data.matches, {
    competition: filters.competition,
    format: "all",
    period: filters.period,
    currentLineup,
  });
  return computeTeamStats(matches);
}

export default function MatchupPage() {
  const [params, setParams] = useSearchParams();

  // Sin ?us= en la URL se usa "mi equipo" recordado; ?us= vacío fuerza el buscador.
  const usParam = params.get("us");
  const themId = params.get("them") || undefined;
  const { myTeamId: myTeam, setMyTeamId } = useMyTeam();
  const usId = usParam ?? (myTeam && myTeam !== themId ? myTeam : null) ?? undefined;
  const { filters, setFilter } = useAnalysisFilters();

  const update = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v === null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );

  const usAnalysis = useTeamData(usId || undefined);
  const themAnalysis = useTeamData(themId);
  const usData = usId ? usAnalysis.data : null;
  const themData = themId ? themAnalysis.data : null;

  // Se usan los valores (no el objeto) como dependencias: el objeto cambia en cada render.
  const { competition, period, lineup } = filters;
  const usStats = useMemo(
    () => statsFor(usData, { competition, period, lineup, format: "all" }),
    [usData, competition, period, lineup],
  );
  const themStats = useMemo(
    () => statsFor(themData, { competition, period, lineup, format: "all" }),
    [themData, competition, period, lineup],
  );

  const allMatches = useMemo(
    () => [...(usData?.matches ?? []), ...(themData?.matches ?? [])],
    [usData, themData],
  );
  const pool = ACTIVE_MAP_POOL;
  const rows = useMemo(
    () => (usStats && themStats ? compareMapPools(usStats, themStats, pool) : []),
    [usStats, themStats, pool],
  );
  const headToHead = useMemo(
    () => (usData && themId ? usData.matches.filter((m) => m.opponent.id === themId) : []),
    [usData, themId],
  );

  const ready = usData && themData && usStats && themStats;
  const usName = usData?.team.name ?? "Us";
  const themName = themData?.team.name ?? "Opponent";
  const hasLeague = allMatches.some((m) => m.isLeague);

  return (
    <Box sx={{ textAlign: "left" }}>
      <Button
        component={RouterLink}
        to={themId ? `/team/${themId}` : "/"}
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        Back
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "2.4rem" } }}>
          Match<span style={{ color: colors.accent }}>up</span>
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          Compare both map pools and simulate the veto before the match.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto 1fr" },
          gap: 1.5,
          alignItems: "stretch",
          mb: 2.5,
        }}
      >
        {usId ? (
          <TeamSlot label="My team" highlight analysis={usAnalysis} stats={usStats} onChange={() => update({ us: "" })} />
        ) : (
          <TeamPicker
            label="My team"
            title="Pick your team"
            onPick={(team) => {
              setMyTeamId(team.team_id);
              update({ us: team.team_id });
            }}
          />
        )}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Tooltip title="Swap teams">
            <span>
              <IconButton
                disabled={!usId || !themId}
                onClick={() => update({ us: themId!, them: usId! })}
                sx={{ border: `1px solid ${colors.border}`, bgcolor: "background.paper" }}
              >
                <SwapHorizIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {themId ? (
          <TeamSlot label="Opponent" analysis={themAnalysis} stats={themStats} onChange={() => update({ them: null })} />
        ) : (
          <TeamPicker label="Opponent" title="Pick the opponent" onPick={(team) => update({ them: team.team_id })} />
        )}
      </Box>

      {ready && usId === themId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You picked the same team on both sides.
        </Alert>
      )}

      {ready && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FilterBar filters={filters} setFilter={setFilter} hasLeague={hasLeague} lineupAvailable />

          <Panel
            title="Map pool"
            subtitle={`Edge combines results (smoothed win rate) and each team's veto preference. Current pool: ${pool.map(formatMap).join(", ")}.`}
            padded={false}
          >
            <MapPoolTable rows={rows} usName={usName} themName={themName} />
          </Panel>

          <Panel title="Veto simulator" subtitle="Pick the format and who bans first.">
            <VetoSimulator
              us={usStats}
              them={themStats}
              usName={usName}
              themName={themName}
              pool={pool}
              matches={allMatches}
            />
          </Panel>

          <Panel title={`Head-to-head (${headToHead.length})`}>
            {headToHead.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                These teams haven't played each other in the analyzed matches.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {headToHead.map((m) => (
                  <Box
                    key={m.matchId}
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      flexWrap: "wrap",
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: colors.hover,
                    }}
                  >
                    <ResultBadge result={m.result}>
                      {m.score.us}-{m.score.them}
                    </ResultBadge>
                    <Link href={m.faceitUrl} target="_blank" rel="noreferrer" variant="body2" underline="hover">
                      {m.date ? format(new Date(m.date), "dd MMM yyyy") : "—"}
                    </Link>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      BO{m.bestOf} · {m.competitionName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", ml: { md: "auto" } }}>
                      {m.maps.map((p) => `${formatMap(p.map)} ${p.us}-${p.them}`).join(" · ")}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Box>
      )}
    </Box>
  );
}
