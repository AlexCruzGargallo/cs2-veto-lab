import { Box, Typography } from "@mui/material";
import type { Result } from "../../types/faceit";
import { RESULT_COLORS, tint } from "../../themes/tokens";

const RESULT_LABELS: Record<Result, string> = {
  win: "W",
  loss: "L",
  draw: "D",
  unknown: "–",
};

export default function ResultBadge({ result, children }: { result: Result; children: React.ReactNode }) {
  const color = RESULT_COLORS[result];
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: 1,
          display: "grid",
          placeItems: "center",
          fontSize: "0.72rem",
          fontWeight: 800,
          color,
          bgcolor: tint(color, 0.16),
        }}
      >
        {RESULT_LABELS[result]}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </Typography>
    </Box>
  );
}
