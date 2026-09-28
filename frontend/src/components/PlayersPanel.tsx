import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { format } from "date-fns/format";
import type { AnalyzedMatch } from "../types/faceit";
import { analyzeRoster } from "../utils/roster";
import { summarizePlayers, type PlayerLine } from "../utils/players";
import { formatMap, isActiveMap } from "../utils/maps";
import { colors, tint } from "../themes/tokens";
import Panel from "./ui/Panel";

type Metric = "adr" | "kd" | "entry";

const METRICS: Record<Metric, { label: string; get: (l: PlayerLine) => number | null; good: number; bad: number; digits: number }> = {
  adr: { label: "ADR", get: (l) => l.adr, good: 85, bad: 65, digits: 0 },
  kd: { label: "K/D", get: (l) => l.kd, good: 1.15, bad: 0.9, digits: 2 },
  entry: { label: "Entries / map", get: (l) => l.firstKillsPerMap, good: 3, bad: 1.5, digits: 1 },
};

// Color de fondo según lo buena que es la cifra (verde) o mala (rojo).
function heat(value: number | null, good: number, bad: number) {
  if (value === null) return "transparent";
  if (value >= good) return tint(colors.win, Math.min(0.12 + (value - good) / (good - bad) * 0.2, 0.35));
  if (value <= bad) return tint(colors.loss, Math.min(0.12 + (bad - value) / (good - bad) * 0.2, 0.35));
  return "transparent";
}

const numCell = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

type PlayersPanelProps = {
  matches: AnalyzedMatch[];
  currentLineup: string[];
};

export default function PlayersPanel({ matches, currentLineup }: PlayersPanelProps) {
  const [metric, setMetric] = useState<Metric>("adr");
  const roster = useMemo(() => analyzeRoster(matches, currentLineup), [matches, currentLineup]);
  const players = useMemo(() => summarizePlayers(matches), [matches]);
  const statsById = new Map(players.map((p) => [p.id, p]));

  const maps = useMemo(() => {
    const count = new Map<string, number>();
    // Sólo mapas con estadísticas de jugadores (algunos partidos no las tienen).
    for (const m of matches)
      for (const p of m.maps)
        if (p.players.length && isActiveMap(p.map)) count.set(p.map, (count.get(p.map) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([map]) => map);
  }, [matches]);

  if (roster.players.length === 0) {
    return (
      <Panel>
        <Typography sx={{ color: "text.secondary" }}>No player data for the current filters.</Typography>
      </Panel>
    );
  }

  const m = METRICS[metric];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Panel title="Roster" subtitle={`Players who appeared in the ${matches.length} matches analyzed.`} padded={false}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 760, "& td, & th": { px: 2 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell sx={{ width: 180 }}>Matches played</TableCell>
                <TableCell align="right">ELO</TableCell>
                <TableCell align="right">Maps</TableCell>
                <TableCell align="right">K/D</TableCell>
                <TableCell align="right">ADR</TableCell>
                <TableCell align="right">HS%</TableCell>
                <TableCell align="right">Entries/map</TableCell>
                <TableCell align="right">Clutches</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.players.map((p) => {
                const s = statsById.get(p.id)?.overall;
                return (
                  <TableRow key={p.id} hover sx={{ opacity: p.inCurrentLineup ? 1 : 0.65 }}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Avatar src={p.avatar || undefined} sx={{ width: 28, height: 28 }}>
                          {p.nickname[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.nickname}
                        </Typography>
                        {p.inCurrentLineup && (
                          <Chip
                            size="small"
                            label="Current"
                            sx={{ height: 18, fontSize: "0.65rem", bgcolor: colors.accentSoft, color: colors.accentText }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Last played ${format(new Date(p.lastPlayed), "dd MMM yyyy")}`}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={p.share * 100}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: colors.hover,
                              "& .MuiLinearProgress-bar": { bgcolor: colors.accent, borderRadius: 3 },
                            }}
                          />
                          <Typography variant="caption" sx={{ ...numCell, width: 64, textAlign: "right" }}>
                            {Math.round(p.share * 100)}% · {p.matches}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={numCell}>{p.elo ?? "–"}</TableCell>
                    <TableCell align="right" sx={numCell}>{s?.maps ?? 0}</TableCell>
                    <TableCell align="right" sx={{ ...numCell, bgcolor: heat(s?.kd ?? null, 1.15, 0.9) }}>{s?.kd ?? "–"}</TableCell>
                    <TableCell align="right" sx={{ ...numCell, bgcolor: heat(s?.adr ?? null, 85, 65) }}>{s?.adr ?? "–"}</TableCell>
                    <TableCell align="right" sx={numCell}>{s?.hsPct ?? "–"}</TableCell>
                    <TableCell align="right" sx={numCell}>{s?.firstKillsPerMap ?? "–"}</TableCell>
                    <TableCell align="right" sx={numCell}>{s?.clutches ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>

      <Panel
        title="Per map"
        subtitle="Each player's performance on each map. Green is above average, red below."
        action={
          <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, v) => v && setMetric(v)}>
            {(Object.keys(METRICS) as Metric[]).map((k) => (
              <ToggleButton key={k} value={k}>
                {METRICS[k].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
        padded={false}
      >
        <TableContainer>
          <Table size="small" sx={{ minWidth: 120 + maps.length * 90, "& td, & th": { px: 2 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                {maps.map((map) => (
                  <TableCell key={map} align="center">
                    {formatMap(map)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.players
                .filter((p) => statsById.has(p.id))
                .map((p) => {
                  const byMap = statsById.get(p.id)!.byMap;
                  return (
                    <TableRow key={p.id}>
                      <TableCell sx={{ fontWeight: 600, opacity: p.inCurrentLineup ? 1 : 0.65 }}>{p.nickname}</TableCell>
                      {maps.map((map) => {
                        const line = byMap[map];
                        const value = line ? m.get(line) : null;
                        return (
                          <TableCell key={map} align="center" sx={{ ...numCell, bgcolor: heat(value, m.good, m.bad) }}>
                            {value === null ? (
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>–</Typography>
                            ) : (
                              <Tooltip title={`${line!.maps} map${line!.maps === 1 ? "" : "s"} played`}>
                                <span>
                                  {value.toFixed(m.digits)}
                                  <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
                                    ({line!.maps})
                                  </Typography>
                                </span>
                              </Tooltip>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>
    </Box>
  );
}
