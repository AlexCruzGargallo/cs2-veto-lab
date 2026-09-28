import { useMemo, useState } from "react";
import { Box, FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import type { AnalyzedMatch, Side, TeamStats } from "../../types/faceit";
import { formatMap, mapImage } from "../../utils/maps";
import {
  detectVetoPattern,
  mapProbabilities,
  simulateVeto,
  type MapProbability,
  type VetoFormat,
} from "../../utils/matchup";
import { colors, tint } from "../../themes/tokens";

type VetoSimulatorProps = {
  us: TeamStats;
  them: TeamStats;
  usName: string;
  themName: string;
  pool: string[];
  // Partidos de ambos equipos, para deducir el orden real del veto.
  matches: AnalyzedMatch[];
};

const signed = (x: number) => {
  const n = Math.round(x * 100);
  return n > 0 ? `+${n}` : String(n);
};

// Barras horizontales: probabilidad de que se juegue cada mapa.
function ProbabilityBars({ probs, format }: { probs: MapProbability[]; format: VetoFormat }) {
  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      {probs.map((p) => (
        <Tooltip
          key={p.map}
          placement="top-start"
          title={
            <Box>
              <strong>{formatMap(p.map)}</strong>
              <br />
              {format === "bo1"
                ? `Ends on this map in ${Math.round(p.played * 100)}% of simulations`
                : `Played in ${Math.round(p.played * 100)}% of simulations (decider ${Math.round(p.decider * 100)}%)`}
              <br />
              Edge {signed(p.edge)}
            </Box>
          }
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "84px 1fr 44px",
              alignItems: "center",
              gap: 1.5,
              py: 0.5,
              borderRadius: 1,
              cursor: "default",
              "&:hover": { bgcolor: colors.hover },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {formatMap(p.map)}
            </Typography>
            <Box sx={{ height: 10, borderRadius: "0 4px 4px 0", bgcolor: colors.hover, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: `${Math.max(p.played * 100, p.played > 0 ? 1 : 0)}%`,
                  bgcolor: colors.accent,
                  borderRadius: "0 4px 4px 0",
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
              {Math.round(p.played * 100)}%
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

export default function VetoSimulator({ us, them, usName, themName, pool, matches }: VetoSimulatorProps) {
  const [format, setFormat] = useState<VetoFormat>("bo1");
  const [first, setFirst] = useState<Side>("us");
  const [highRisk, setHighRisk] = useState(false);

  const pattern = useMemo(() => detectVetoPattern(matches, format, pool.length), [matches, format, pool.length]);
  const steps = useMemo(
    () => simulateVeto(pattern, pool, first, us, them, { highRisk }),
    [pattern, pool, first, us, them, highRisk],
  );
  const probs = useMemo(
    () => mapProbabilities(pattern, pool, first, us, them, { highRisk }),
    [pattern, pool, first, us, them, highRisk],
  );
  // Ventaja esperada: media de la ventaja de los mapas jugados, ponderada por su probabilidad.
  const expectedEdge = probs.reduce((sum, p) => sum + p.played * p.edge, 0) / (format === "bo1" ? 1 : 3);

  const played = steps.filter((s) => s.action === "pick");

  return (
    <Box sx={{ textAlign: "left" }}>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 2.5 }}>
        <ToggleButtonGroup size="small" exclusive value={format} onChange={(_, v) => v && setFormat(v)}>
          <ToggleButton value="bo1">BO1</ToggleButton>
          <ToggleButton value="bo3">BO3</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" exclusive value={first} onChange={(_, v) => v && setFirst(v)}>
          <ToggleButton value="us">{usName} starts</ToggleButton>
          <ToggleButton value="them">{themName} starts</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title="Anticipate the opponent: don't spend a ban on a map they'll very likely ban themselves, and ban the next worst one instead. Riskier — if they don't do what they usually do, you may end up playing it.">
          <FormControlLabel
            sx={{
              ml: { sm: "auto" },
              mr: 0,
              px: 1.25,
              borderRadius: 2,
              border: `1px solid ${highRisk ? tint(colors.warn, 0.5) : colors.border}`,
              bgcolor: highRisk ? tint(colors.warn, 0.1) : "transparent",
            }}
            control={
              <Switch
                size="small"
                checked={highRisk}
                onChange={(e) => setHighRisk(e.target.checked)}
                sx={{ "& .Mui-checked": { color: `${colors.warn} !important` }, "& .Mui-checked + .MuiSwitch-track": { bgcolor: `${colors.warn} !important` } }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600, color: highRisk ? colors.warn : "text.secondary" }}>
                High risk
              </Typography>
            }
          />
        </Tooltip>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 3fr) minmax(0, 2fr)" }, gap: 3 }}>
        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Most likely veto
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5 }}>
            {steps.map((step) => {
              const color = step.decider ? colors.warn : step.action === "pick" ? colors.win : colors.loss;
              const who = step.decider ? "Decider" : step.actor === "us" ? usName : themName;
              const ours = step.actor === "us";
              const risky = step.reason.startsWith("High risk");
              return (
                <Box
                  key={step.round}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "24px 1fr 56px", sm: "24px minmax(90px, 150px) 56px 120px 1fr" },
                    alignItems: "center",
                    columnGap: 1.5,
                    rowGap: 0.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: risky ? tint(colors.warn, 0.08) : ours ? tint(colors.accent, 0.08) : colors.hover,
                    border: `1px solid ${risky ? tint(colors.warn, 0.4) : ours ? colors.accentBorder : "transparent"}`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {step.round}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: ours ? colors.accentText : "text.primary" }} noWrap>
                    {who}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color, fontWeight: 800, letterSpacing: "0.06em", justifySelf: { xs: "end", sm: "start" } }}
                  >
                    {step.decider ? "LEFT" : step.action === "pick" ? "PICK" : "BAN"}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, gridColumn: { xs: "2 / 4", sm: "auto" } }}>
                    <Box
                      sx={{
                        width: 30,
                        height: 20,
                        borderRadius: 0.75,
                        flexShrink: 0,
                        background: mapImage(step.map) ? `url(${mapImage(step.map)}) center/cover` : "#334155",
                        filter: step.action === "drop" ? "grayscale(1) brightness(0.6)" : "none",
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color, textDecoration: step.action === "drop" ? "line-through" : "none" }}
                    >
                      {formatMap(step.map)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", gridColumn: { xs: "2 / 4", sm: "auto" } }}>
                    {step.reason}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              border: `1px solid ${colors.accentBorder}`,
              bgcolor: colors.accentSoft,
              display: "flex",
              alignItems: "baseline",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="overline" sx={{ color: colors.accentText }}>
              {format === "bo1" ? "Predicted map" : "Predicted maps"}
            </Typography>
            <Typography variant="h6">{played.map((s) => formatMap(s.map)).join(" → ")}</Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            {format === "bo1" ? "Chance the match ends on each map" : "Chance each map is played"}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <ProbabilityBars probs={probs} format={format} />
          </Box>
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            Expected edge:{" "}
            <Box
              component="span"
              sx={{ fontWeight: 700, color: expectedEdge > 0.02 ? colors.win : expectedEdge < -0.02 ? colors.loss : "text.primary" }}
            >
              {signed(expectedEdge)}
            </Box>
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
            2,000 simulated vetoes where {themName} picks and bans according to their history (not always
            their usual choice), and {usName} follows the suggestion{highRisk ? " in high risk mode" : ""}.
          </Typography>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
        {themName}'s steps are predicted from their history; {usName}'s steps are suggestions based on
        the edge per map. The veto order is inferred from real matches (ESEA first).
      </Typography>
    </Box>
  );
}
