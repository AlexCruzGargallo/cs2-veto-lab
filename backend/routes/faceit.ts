import { Router } from "express";
import { HttpError } from "../lib/http.js";
import { getTeamAnalysis } from "../services/analysisService.js";
import { getLeagueOverview } from "../services/leagueService.js";
import {
  getCurrentLeague,
  getMatchData,
  getMatchVetos,
  getTeamById,
  searchTeams,
} from "../services/faceitService.js";

const router = Router();

// Express 5 propaga solo los errores de handlers async al middleware de errores.

router.get("/teams/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) throw new HttpError(400, "Missing query parameter q");

  const data = await searchTeams(q);
  const teams = (data.items ?? [])
    .filter((team: any) => team.game === "cs2")
    .map((team: any) => ({
      ...team,
      faceit_url: "https://www.faceit.com/en/teams/" + team.team_id,
    }));
  res.json(teams);
});

router.get("/teams/:teamId", async (req, res) => {
  res.json(await getTeamById(req.params.teamId));
});

router.get("/teams/:teamId/league", async (req, res) => {
  res.json(await getCurrentLeague(req.params.teamId));
});

router.get("/teams/:teamId/league-overview", async (req, res) => {
  res.json(await getLeagueOverview(req.params.teamId));
});

router.get("/teams/:teamId/analysis", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 150);
  res.json(await getTeamAnalysis(req.params.teamId, limit));
});

router.get("/matches/:matchId", async (req, res) => {
  res.json(await getMatchData(req.params.matchId));
});

router.get("/matches/:matchId/vetos", async (req, res) => {
  res.json(await getMatchVetos(req.params.matchId));
});

export default router;
