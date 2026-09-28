import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import type { MapStats } from "../../types/faceit";
import type { Advice, MapMatchup } from "../../utils/matchup";
import { formatMap, mapImage } from "../../utils/maps";
import { colors, tint } from "../../themes/tokens";

const ADVICE: Record<Advice, { label: string; color: string } | null> = {
  pick: { label: "Pick", color: colors.win },
  ban: { label: "Ban", color: colors.loss },
  neutral: null,
};

function TeamCell({ stats }: { stats: MapStats | null }) {
  if (!stats || (stats.played === 0 && stats.picks === 0 && stats.bans === 0)) {
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        No data
      </Typography>
    );
  }
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {stats.wins}-{stats.losses}
        {stats.winRate !== null && (
          <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
            {stats.winRate}%
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Pick {stats.pickRate ?? 0}% · Ban {stats.banRate ?? 0}%
      </Typography>
    </Box>
  );
}

// Barra divergente: hacia la derecha (verde) nos favorece, hacia la izquierda
// (rojo) favorece al rival.
function EdgeBar({ edge }: { edge: number }) {
  const width = Math.min(Math.abs(edge), 1) * 50;
  const positive = edge >= 0;
  const value = Math.round(edge * 100);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ position: "relative", height: 8, bgcolor: colors.hover, borderRadius: 4, flex: 1, minWidth: 110 }}>
        <Box sx={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: "1px", bgcolor: colors.borderStrong }} />
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            borderRadius: 4,
            bgcolor: positive ? colors.win : colors.loss,
            left: positive ? "50%" : `${50 - width}%`,
            width: `${width}%`,
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          width: 30,
          textAlign: "right",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: value > 0 ? colors.win : value < 0 ? colors.loss : "text.secondary",
        }}
      >
        {value > 0 ? `+${value}` : value}
      </Typography>
    </Box>
  );
}

type MapPoolTableProps = {
  rows: MapMatchup[];
  usName: string;
  themName: string;
};

export default function MapPoolTable({ rows, usName, themName }: MapPoolTableProps) {
  return (
    <TableContainer>
      {/* Ancho mínimo: en móvil la tabla se desplaza dentro del panel en vez de comprimirse. */}
      <Table size="small" sx={{ minWidth: 720, "& td, & th": { px: 2.5, whiteSpace: "nowrap" } }}>
        <TableHead>
          <TableRow>
            <TableCell>Map</TableCell>
            <TableCell>{usName}</TableCell>
            <TableCell>{themName}</TableCell>
            <TableCell sx={{ width: "30%" }}>Edge</TableCell>
            <TableCell>Advice</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const advice = ADVICE[row.advice];
            const image = mapImage(row.map);
            return (
              <TableRow key={row.map} hover sx={{ "& td": { py: 1.25 } }}>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 28,
                        borderRadius: 1,
                        flexShrink: 0,
                        border: `1px solid ${colors.border}`,
                        background: image ? `url(${image}) center/cover` : "#334155",
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatMap(row.map)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <TeamCell stats={row.us} />
                </TableCell>
                <TableCell>
                  <TeamCell stats={row.them} />
                </TableCell>
                <TableCell>
                  <EdgeBar edge={row.edge} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {advice && (
                      <Chip
                        size="small"
                        label={advice.label}
                        sx={{
                          bgcolor: tint(advice.color, 0.16),
                          color: advice.color,
                          border: `1px solid ${tint(advice.color, 0.4)}`,
                        }}
                      />
                    )}
                    {row.lowSample && (
                      <Tooltip title="One of the teams has played it fewer than 2 times: take it with a grain of salt">
                        <Typography variant="caption" sx={{ color: "text.secondary", cursor: "help" }}>
                          low sample
                        </Typography>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
