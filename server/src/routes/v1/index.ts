import { Router } from "express";
import { authRoutes } from "../../modules/auth";
import { slackRoutes } from "../../modules/slack";
import { organizationRoutes } from "../../modules/organization";
import { verifySlackSignature } from "../../modules/slack-game/middlewares/slackVerification.middleware";
import * as slackInteractionController from "../../modules/slack-game/controllers/slackInteraction.controller";
import workspaceRoutes from "../../modules/slack/routes/workspace.routes";
import slackEventsRoutes from "../../modules/slack/routes/slackEvents.routes";
import slackCommandsRoutes from "../../modules/slack-game/routes/slackCommands.routes";
import onboardingRoutes from "../../modules/onboarding/routes/onboarding.routes";
import { verifySchedulerSecret } from "../../modules/slack-game/middlewares/schedulerAuth.middleware";
import * as schedulerController from "../../modules/slack-game/controllers/scheduler.controller";

const router = Router();

// Auth routes
router.use("/auth", authRoutes);

// Organization routes (basic org management only)
router.use("/organizations", organizationRoutes);

// Workspace routes (simplified workspace-centric routes)
router.use("/workspaces", workspaceRoutes);

// Slack OAuth routes (public)
router.use("/slack", slackRoutes);

// Slack Events routes (public, verified)
router.use("/slack/events", slackEventsRoutes);

// Slack webhook: handle interactions (public, verified by Slack signature)
router.post(
  "/slack-game/interactions",
  verifySlackSignature,
  slackInteractionController.handleInteraction,
);

// Slack Slash Commands (public, verified by Slack signature)
router.use("/slack-game/commands", slackCommandsRoutes);

// Public onboarding routes (token-based, no JWT required)
router.use("/onboard", onboardingRoutes);

// External scheduler: trigger daily game (protected by secret key)
router.post(
  "/scheduler/run-daily-game",
  verifySchedulerSecret,
  schedulerController.triggerDailyGame,
);

export default router;
