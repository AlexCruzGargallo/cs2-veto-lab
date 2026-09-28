import { createTheme } from "@mui/material";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3B82F6",
    },
    background: {
      default: "#0F1319",
      paper: "#1A202C",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#8B96A5",
    },
  },

  typography: {
    fontFamily: '"Sora", "Inter", "Segoe UI", sans-serif',
    h1: { fontWeight: "bold", letterSpacing: "-0.02em", fontSize: "30px" },
    h2: { fontWeight: "bold", letterSpacing: "-0.02em", fontSize: "30px" },
    h3: { fontWeight: 700 },
    body1: { fontSize: "1rem" },
    body2: { fontSize: "0.92rem" },
  },
});

export default darkTheme;
