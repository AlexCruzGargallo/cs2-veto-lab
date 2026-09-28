import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";

import "./index.css";
import darkTheme from "./themes/darkTheme.ts";
import MapVetoScoutPage from "./pages/home/MapVetoScoutPage.tsx";
import AppShell from "./components/layout/AppShell.tsx";


const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: "/",
        element: <MapVetoScoutPage />,
      },
      {
        // Las páginas pesadas se cargan bajo demanda: la home no descarga el
        // código del análisis ni del simulador.
        path: "/team/:teamId",
        lazy: async () => ({ Component: (await import("./pages/team-stats/TeamStatsPage.tsx")).default }),
      },
      {
        path: "/matchup",
        lazy: async () => ({ Component: (await import("./pages/matchup/MatchupPage.tsx")).default }),
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
