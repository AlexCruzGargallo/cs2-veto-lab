import { Router } from "express";
import {
  getMatchVetos,
  getTeam,
  getMatches,
  getMatchData,
  getTeamById,
  getESEALeague,
} from "../services/faceitService.js";

const router = Router();

router.get("/team/:teamName", async (req, res) => {
  try {
    const data = await getTeam(req.params.teamName);
    const formattedData = data.items
      .filter((team: any) => team.game === "cs2")
      .map((team: any) => ({
        ...team,
        faceit_url: "https://www.faceit.com/en/teams/" + team.team_id,
      }));
    res.json(formattedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teamById/:teamId", async (req, res) => {
  try {
    const data = await getTeamById(req.params.teamId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/matches/:teamId", async (req, res) => {
  try {
    const data = await getMatches(req.params.teamId);
    const unique = Array.from(
      new Map(data.map((m: any) => [m.matchId, m])).values(),
    );
    res.json(unique);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/vetos/:matchId", async (req, res) => {
  try {
    const data = await getMatchVetos(req.params.matchId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/match/:matchId", async (req, res) => {
  try {
    const data = await getMatchData(req.params.matchId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/team/:teamId/league", async (req, res) => {
  try {
    const data = await getESEALeague(req.params.teamId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
