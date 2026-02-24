import { Router } from "express";
import { protect } from "../../auth/middlewares/auth.middleware";
import * as slackController from "../controllers/slack.controller";
import groupsRoutes from "../../groups/routes/groups.routes";
import gameTemplatesRoutes from "../../groups/routes/gameTemplates.routes";
import slackGameRoutes from "../../slack-game/routes/slackGame.routes";
import * as gamesController from "../../groups/controllers/games.controller";
import { sendOnboardingLinks } from "../../onboarding/controllers/onboarding.controller";

const router = Router();

// All workspace routes are protected and scoped to workspace
// Format: /api/v1/workspaces/:workspaceId/...

// Workspace info
router.get("/:workspaceId", protect(), slackController.getWorkspaceById);

// Workspace stats
router.get("/:workspaceId/stats", protect(), slackController.getWorkspaceStats);

// Workspace users
router.get("/:workspaceId/users", protect(), slackController.getWorkspaceUsers);

// Force-refresh users (clear Slack API cache)
router.post("/:workspaceId/users/refresh", protect(), slackController.refreshWorkspaceUsers);

// Workspace channels
router.get(
  "/:workspaceId/channels",
  protect(),
  slackController.getWorkspaceChannels,
);

router.post(
  "/:workspaceId/channel-members",
  protect(),
  slackController.getChannelMembers,
);

// Send messages
router.post("/:workspaceId/message", protect(), slackController.sendMessage);

// Disconnect workspace
router.delete("/:workspaceId", protect(), slackController.disconnectWorkspace);

// Get all games across all groups in workspace
router.get(
  "/:workspaceId/games",
  protect(),
  gamesController.getAllGamesHandler,
);

// Groups routes - nested under workspace
router.use("/:workspaceId/groups", protect(), groupsRoutes);

// Game templates routes
router.use("/:workspaceId/game-templates", protect(), gameTemplatesRoutes);

// Slack game routes
router.use("/:workspaceId/slack-game", protect(), slackGameRoutes);

// Onboarding DM route
router.post("/:workspaceId/send-onboarding", protect(), sendOnboardingLinks);

// CSV user upload
router.post(
  "/:workspaceId/users/csv-upload",
  protect(),
  slackController.uploadUsersFromCsv,
);


export default router;
