import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";

import "./index.css";
import TeamStatsPage from "./pages/team-stats/TeamStatsPage.tsx";
import darkTheme from "./themes/DarkTheme.ts";
import MapVetoScoutPage from "./pages/home/MapVetoScoutPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MapVetoScoutPage />,
  },
  {
    path: "/team/:teamId",
    element: <TeamStatsPage />,
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
