import type { AnalyzedMatch, VetoStep } from "../types/faceit";
import { format } from "date-fns/format";
import {
  Box,
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { formatMap } from "../utils/maps";
import { isCounted } from "../utils/stats";
import { colors, RESULT_COLORS, tint } from "../themes/tokens";
import ResultBadge from "./ui/ResultBadge";
import Panel from "./ui/Panel";

type VetosTableProps = {
  matches: AnalyzedMatch[];
  teamId: string;
};

function stepStyle(step: VetoStep) {
  // Elegido por Faceit (el equipo no votó a tiempo o no se presentó): no cuenta.
  if (step.random && !step.decider) {
    return { label: "Auto", color: colors.neutral, filled: false };
  }
  if (step.decider) {
    return { label: "Decider", color: colors.warn, filled: false };
  }
  if (step.by === "us") {
    return step.action === "pick"
      ? { label: "Their pick", color: colors.win, filled: true }
      : { label: "Their ban", color: colors.loss, filled: true };
  }
  return step.action === "pick"
    ? { label: "Opponent pick", color: colors.accentText, filled: false }
    : { label: "Opponent ban", color: colors.neutral, filled: false };
}

function VetoChip({ step, label: text }: { step: VetoStep; label?: string }) {
  const { label, color, filled } = stepStyle(step);
  const who = step.by === "us" ? "this team" : step.by === "them" ? "the opponent" : "nobody";
  const title = step.random && !step.decider
    ? `Step ${step.round} · Picked automatically by FACEIT for ${who} (no vote in time) · not counted`
    : `Step ${step.round} · ${label}${/^\d+$/.test(step.map) ? ` · Workshop map ${step.map}` : ""}`;

  return (
    <Tooltip title={title}>
      <Chip
        size="small"
        label={text ?? formatMap(step.map)}
        variant={filled ? "filled" : "outlined"}
        sx={{
          borderColor: filled ? "transparent" : tint(color, 0.5),
          color,
          bgcolor: filled ? tint(color, 0.16) : "transparent",
          textDecoration: step.action === "drop" ? "line-through" : "none",
          textDecorationColor: tint(color, 0.6),
          fontStyle: step.random ? "italic" : "normal",
          borderStyle: step.random && !step.decider ? "dashed" : "solid",
          opacity: step.random && !step.decider ? 0.7 : 1,
        }}
      />
    </Tooltip>
  );
}

function Legend() {
  const samples: VetoStep[] = [
    { round: 0, map: "Their pick", action: "pick", by: "us", random: false, decider: false },
    { round: 0, map: "Their ban", action: "drop", by: "us", random: false, decider: false },
    { round: 0, map: "Opponent pick", action: "pick", by: "them", random: false, decider: false },
    { round: 0, map: "Opponent ban", action: "drop", by: "them", random: false, decider: false },
    { round: 0, map: "Decider", action: "pick", by: null, random: false, decider: true },
    { round: 0, map: "Auto (not counted)", action: "drop", by: "us", random: true, decider: false },
  ];
  return (
    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
      {samples.map((s) => (
        <VetoChip key={s.map} step={s} label={s.map} />
      ))}
    </Box>
  );
}

function MatchDate({ match }: { match: AnalyzedMatch }) {
  return (
    <Box>
      <Link href={match.faceitUrl} target="_blank" rel="noreferrer" underline="hover" variant="body2">
        {match.date ? format(new Date(match.date), "dd MMM yyyy") : "—"}
      </Link>
      <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
        BO{match.bestOf}
      </Typography>
    </Box>
  );
}

function EloLine({ match }: { match: AnalyzedMatch }) {
  if (match.teamElo === null || match.opponentElo === null) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
      <Tooltip title="Average FACEIT ELO of each lineup in this match">
        <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          ELO {match.teamElo} vs {match.opponentElo}
        </Typography>
      </Tooltip>
    </Box>
  );
}

function Opponent({ match, teamId }: { match: AnalyzedMatch; teamId: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Tooltip title="Compare both teams" placement="top-start">
        <Link
          component={RouterLink}
          to={`/matchup?us=${teamId}&them=${match.opponent.id}`}
          variant="body2"
          color="inherit"
          underline="hover"
          sx={{ fontWeight: 600, display: "block" }}
          noWrap
        >
          {match.opponent.name}
        </Link>
      </Tooltip>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25, minWidth: 0 }}>
        {match.isLeague && (
          <Chip
            label="ESEA"
            size="small"
            sx={{ height: 16, fontSize: "0.62rem", bgcolor: colors.accentSoft, color: colors.accentText }}
          />
        )}
        <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
          {match.competitionName}
        </Typography>
      </Box>
      <EloLine match={match} />
    </Box>
  );
}

function MatchResult({ match }: { match: AnalyzedMatch }) {
  return (
    <Box sx={{ whiteSpace: "nowrap" }}>
      <ResultBadge result={match.result}>
        {match.score.us}-{match.score.them}
      </ResultBadge>
      {!isCounted(match) && (
        <Tooltip
          title={
            match.forfeit
              ? "Forfeit: no map was played. Not counted in any stat (its veto is usually automatic)."
              : "This match was cancelled. Not counted in any stat."
          }
        >
          <Chip
            size="small"
            label={match.forfeit ? "FF · not counted" : "Cancelled · not counted"}
            sx={{ ml: 1, height: 18, fontSize: "0.65rem", color: colors.warn, bgcolor: tint(colors.warn, 0.14) }}
          />
        </Tooltip>
      )}
      {match.bestOf > 1 &&
        match.maps.map((m) => (
          <Typography
            key={m.map}
            variant="caption"
            sx={{ display: "block", color: RESULT_COLORS[m.result], pl: "30px" }}
          >
            {formatMap(m.map)} {m.us}-{m.them}
          </Typography>
        ))}
    </Box>
  );
}

function VetoSequence({ match }: { match: AnalyzedMatch }) {
  if (match.vetos.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        No veto recorded
      </Typography>
    );
  }
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {match.vetos.map((step) => (
        <VetoChip key={step.round} step={step} />
      ))}
    </Box>
  );
}

const VetosTable = ({ matches, teamId }: VetosTableProps) => {
  const theme = useTheme();
  // En pantallas estrechas la tabla obliga a hacer scroll lateral: se muestra
  // cada partido como una tarjeta con el veto a todo el ancho.
  const compact = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Panel
      title="Veto history"
      subtitle="Every veto step in order, from this team's point of view."
      action={<Legend />}
      padded={false}
    >
      {compact ? (
        <Box sx={{ mt: 1 }}>
          {matches.map((match) => (
            <Box
              key={match.matchId}
              sx={{
                px: 2.5,
                py: 2,
                borderTop: `1px solid ${colors.border}`,
                display: "grid",
                gap: 1.25,
                opacity: isCounted(match) ? 1 : 0.6,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                <MatchDate match={match} />
                <MatchResult match={match} />
              </Box>
              <Opponent match={match} teamId={teamId} />
              <VetoSequence match={match} />
            </Box>
          ))}
        </Box>
      ) : (
        <TableContainer>
          <Table size="small" sx={{ "& td, & th": { px: 2.5 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell>Result</TableCell>
                <TableCell>Veto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.matchId} hover sx={{ "& td": { py: 1.5 }, opacity: isCounted(match) ? 1 : 0.6 }}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <MatchDate match={match} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Opponent match={match} teamId={teamId} />
                  </TableCell>
                  <TableCell>
                    <MatchResult match={match} />
                  </TableCell>
                  <TableCell>
                    <VetoSequence match={match} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Panel>
  );
};

export default VetosTable;
