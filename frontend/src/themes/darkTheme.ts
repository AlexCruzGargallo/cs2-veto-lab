import { createTheme } from "@mui/material";
import { colors } from "./tokens";

const headingFont = '"Sora", "Inter", "Segoe UI", sans-serif';

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.accent,
    },
    success: { main: colors.win },
    error: { main: colors.loss },
    warning: { main: colors.warn },
    background: {
      default: colors.bg,
      paper: colors.surface,
    },
    text: {
      primary: colors.text,
      secondary: colors.muted,
    },
    divider: colors.border,
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: { fontFamily: headingFont, fontWeight: 800, letterSpacing: "-0.03em", fontSize: "2.6rem" },
    h2: { fontFamily: headingFont, fontWeight: 700, letterSpacing: "-0.02em", fontSize: "30px" },
    h3: { fontFamily: headingFont, fontWeight: 700 },
    h4: { fontFamily: headingFont, fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontFamily: headingFont, fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontFamily: headingFont, fontWeight: 700, fontSize: "1.05rem" },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: "0.08em", lineHeight: 1.6 },
    body1: { fontSize: "1rem" },
    body2: { fontSize: "0.92rem" },
    button: { textTransform: "none", fontWeight: 600 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Brillo azul muy sutil arriba: da profundidad sin cambiar la paleta.
          backgroundImage: `radial-gradient(1200px 500px at 50% -200px, rgba(59,130,246,0.10), transparent)`,
          backgroundRepeat: "no-repeat",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: `1px solid ${colors.border}`, backgroundImage: "none" },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, minHeight: 44, fontSize: "0.92rem" },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          padding: "5px 12px",
          color: colors.muted,
          borderColor: colors.border,
          "&.Mui-selected": {
            color: colors.accentText,
            backgroundColor: colors.accentSoft,
            "&:hover": { backgroundColor: "rgba(59,130,246,0.18)" },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: colors.border },
        head: {
          color: colors.muted,
          fontSize: "0.72rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
  },
});

export default darkTheme;
