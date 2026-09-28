import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { colors } from "../../themes/tokens";

type PanelProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  sx?: SxProps<Theme>;
};

// Contenedor base de la app: la tarjeta sobre background.paper con borde sutil.
export default function Panel({ title, subtitle, action, children, padded = true, sx }: PanelProps) {
  return (
    <Box
      sx={[
        {
          bgcolor: "background.paper",
          border: `1px solid ${colors.border}`,
          borderRadius: 3,
          overflow: "hidden",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {(title || action) && (
        <Box
          sx={{
            px: 2.5,
            pt: 2.25,
            pb: padded ? 0 : 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            {title && <Typography variant="h6">{title}</Typography>}
            {subtitle && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 720 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      <Box sx={{ p: padded ? 2.5 : 0 }}>{children}</Box>
    </Box>
  );
}
