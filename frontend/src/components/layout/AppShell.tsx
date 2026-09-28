import { Suspense } from "react";
import { Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import { NavLink, Outlet, Link as RouterLink } from "react-router-dom";
import { colors } from "../../themes/tokens";

const NAV = [
  { to: "/", label: "Search", end: true },
  { to: "/matchup", label: "Matchup", end: false },
];

export function Logo({ size = "small" }: { size?: "small" | "large" }) {
  const large = size === "large";
  return (
    <Box
      component={RouterLink}
      to="/"
      sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "inherit", textDecoration: "none" }}
    >
      <Box
        sx={{
          width: large ? 40 : 30,
          height: large ? 40 : 30,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          bgcolor: colors.accentSoft,
          border: `1px solid ${colors.accentBorder}`,
          color: colors.accentText,
        }}
      >
        <GpsFixedIcon sx={{ fontSize: large ? 22 : 17 }} />
      </Box>
      <Typography variant="h6" component="span" sx={{ fontSize: large ? "1.3rem" : "1rem" }}>
        Map Veto <span style={{ color: colors.accent }}>Scout</span>
      </Typography>
    </Box>
  );
}

export default function AppShell() {
  return (
    <>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${colors.border}`,
          bgcolor: "rgba(15,19,25,0.8)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Container
          maxWidth={false}
          sx={{ maxWidth: 1180, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <Logo />
          <Box component="nav" sx={{ display: "flex", gap: 0.5 }}>
            {NAV.map(({ to, label, end }) => (
              <Button
                key={to}
                component={NavLink}
                to={to}
                end={end}
                size="small"
                sx={{
                  color: colors.muted,
                  px: 1.5,
                  "&.active": { color: colors.text, bgcolor: colors.hover },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        </Container>
      </Box>

      <Container component="main" maxWidth={false} sx={{ maxWidth: 1180, flex: 1, py: { xs: 3, md: 5 } }}>
        <Suspense
          fallback={
            <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          }
        >
          <Outlet />
        </Suspense>
      </Container>

      <Box component="footer" sx={{ borderTop: `1px solid ${colors.border}`, py: 3 }}>
        <Container maxWidth={false} sx={{ maxWidth: 1180 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Data from FACEIT. Not affiliated with FACEIT or ESEA.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
