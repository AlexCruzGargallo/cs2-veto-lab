import { Box, Typography } from "@mui/material";
import { colors } from "../../themes/tokens";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  color?: string;
  icon?: React.ReactNode;
};

export default function StatCard({ label, value, hint, color = colors.text, icon }: StatCardProps) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: `1px solid ${colors.border}`,
        borderRadius: 2.5,
        p: 2,
        position: "relative",
        overflow: "hidden",
        // Línea de color arriba: identifica la métrica de un vistazo.
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 0 auto 0",
          height: 2,
          bgcolor: color,
          opacity: 0.7,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
        {icon}
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" sx={{ color, mt: 0.75, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
