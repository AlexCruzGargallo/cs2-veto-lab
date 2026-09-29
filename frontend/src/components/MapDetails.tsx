import { Box, Chip, LinearProgress, Tooltip, Typography } from "@mui/material";
import type { MapStats, TeamStats } from "../types/faceit";
import { formatMap, mapImage } from "../utils/maps";
import { colors, tint } from "../themes/tokens";
import Panel from "./ui/Panel";

type MapDetailsProps = {
  stats: TeamStats;
};

type Verdict = { label: string; color: string; hint: string };

// Umbrales orientativos: con pocas partidas cualquier etiqueta es anecdótica,
// por eso se exige un mínimo de vetos antes de etiquetar.
function verdictFor(s: MapStats, vetoedMatches: number, pickableMatches: number): Verdict | null {
  if (vetoedMatches < 3) return null;
  if ((s.banRate ?? 0) >= 60)
    return { label: "Permaban", color: colors.loss, hint: "Banned in 60%+ of their vetoes" };
  if (pickableMatches >= 3 && (s.pickRate ?? 0) >= 40)
    return { label: "Comfort pick", color: colors.win, hint: "40%+ of the times they pick a map, it's this one" };
  if (s.played >= 3 && (s.winRate ?? 0) >= 65)
    return { label: "Strong", color: colors.accent, hint: "65%+ win rate over 3+ maps" };
  if (s.played >= 3 && (s.winRate ?? 100) <= 35)
    return { label: "Weak", color: colors.warn, hint: "35% or lower win rate over 3+ maps" };
  return null;
}

function RateBar({ label, count, value, color }: { label: string; count: number; value: number | null; color: string }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {label} <span style={{ opacity: 0.7 }}>×{count}</span>
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {value === null ? "–" : `${value}%`}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value ?? 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: colors.hover,
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
        {value}
        {hint && (
          <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
            {hint}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}

function MapCard({
  stats,
  vetoedMatches,
  pickableMatches,
}: {
  stats: MapStats;
  vetoedMatches: number;
  pickableMatches: number;
}) {
  const image = mapImage(stats.map);
  const verdict = verdictFor(stats, vetoedMatches, pickableMatches);

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: `1px solid ${colors.border}`,
        borderRadius: 3,
        overflow: "hidden",
        transition: "border-color 150ms",
        "&:hover": { borderColor: colors.borderStrong },
      }}
    >
      <Box
        sx={{
          height: 96,
          px: 2,
          pb: 1.25,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          background: image
            ? `linear-gradient(to top, ${colors.surface} 5%, rgba(26,32,44,0.15)), url(${image}) center/cover`
            : `linear-gradient(135deg, #1e293b, #334155)`,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "1.2rem", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>
          {formatMap(stats.map)}
        </Typography>
        {verdict && (
          <Tooltip title={verdict.hint}>
            <Chip
              size="small"
              label={verdict.label}
              sx={{
                bgcolor: tint(verdict.color, 0.2),
                color: verdict.color,
                border: `1px solid ${tint(verdict.color, 0.5)}`,
                backdropFilter: "blur(6px)",
              }}
            />
          </Tooltip>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", mb: 2 }}>
          <Stat label="Played" value={String(stats.played)} />
          <Stat
            label="W-L"
            value={`${stats.wins}-${stats.losses}`}
            hint={stats.winRate === null ? undefined : `${stats.winRate}%`}
          />
          <Stat
            label="Round diff"
            value={stats.roundDiff > 0 ? `+${stats.roundDiff}` : String(stats.roundDiff)}
            color={stats.roundDiff > 0 ? colors.win : stats.roundDiff < 0 ? colors.loss : undefined}
          />
        </Box>

        <RateBar label="Pick rate" count={stats.picks} value={stats.pickRate} color={colors.win} />
        <RateBar label="Ban rate" count={stats.bans} value={stats.banRate} color={colors.loss} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          {[
            ["1st ban", stats.firstBans],
            ["Decider", stats.deciders],
            ["Opp. pick", stats.opponentPicks],
            ["Opp. ban", stats.opponentBans],
          ].map(([label, value]) => (
            <Box key={label} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{value}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

const MapDetails = ({ stats }: MapDetailsProps) => {
  if (stats.mapStats.length === 0) {
    return (
      <Panel>
        <Typography sx={{ color: "text.secondary" }}>No maps match the current filters.</Typography>
      </Panel>
    );
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, textAlign: "left" }}>
        Ban rate is based on the {stats.vetoedMatches} matches with a recorded veto. Pick rate is based on
        the {stats.pickableMatches} matches where this team picked a map (nobody picks in a BO1, and
        only one team does in a BO2). The decider (leftover map) doesn't count as a pick, and neither
        do forfeits or steps FACEIT picked automatically because nobody voted in time.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: 1.5,
          textAlign: "left",
        }}
      >
        {stats.mapStats.map((s) => (
          <MapCard key={s.map} stats={s} vetoedMatches={stats.vetoedMatches} pickableMatches={stats.pickableMatches} />
        ))}
      </Box>
    </Box>
  );
};

export default MapDetails;
