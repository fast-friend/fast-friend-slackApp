import { Router } from "express";
import * as gameDispatchController from "../controllers/gameDispatch.controller";
import * as analyticsController from "../controllers/analytics.controller";
import { requirePro } from "../../billing/middleware/requirePlan.middleware";

const router = Router({ mergeParams: true }); // mergeParams to access organizationId from parent

// Authentication already applied by parent router (either organization or legacy)

// Analytics routes
router.get("/stats", analyticsController.getGameStats);
router.get("/leaderboard", analyticsController.getLeaderboard);
router.get("/history", analyticsController.getGameHistory);
router.get("/team-performance", analyticsController.getTeamPerformance);
router.get("/performance-chart", analyticsController.getPerformanceChart);

// Admin: manually trigger game — Pro plan required
router.post("/trigger", requirePro(), gameDispatchController.triggerGame);

export default router;
