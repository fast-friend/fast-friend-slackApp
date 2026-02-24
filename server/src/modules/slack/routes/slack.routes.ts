import { Router } from "express";
import {
  startOAuth,
  oauthCallback,
  getWorkspaces,
  getWorkspaceUsers,
  getWorkspaceChannels,
  getChannelMembers,
  sendMessage,
  disconnectWorkspace,
} from "../controllers/slack.controller";
import { protect } from "../../auth/middlewares/auth.middleware";

const router = Router();

// OAuth routes - now public, organization_id passed via query params
router.get("/oauth/start", startOAuth);
router.get("/oauth/callback", oauthCallback);

// Protected routes
router.get("/workspaces", protect(), getWorkspaces);
router.get("/workspaces/:workspaceId/users", protect(), getWorkspaceUsers);
router.get(
  "/workspaces/:workspaceId/channels",
  protect(),
  getWorkspaceChannels,
);
router.post(
  "/workspaces/:workspaceId/channel-members",
  protect(),
  getChannelMembers,
);
router.post("/workspaces/:workspaceId/message", protect(), sendMessage);
router.delete("/workspaces/:workspaceId", protect(), disconnectWorkspace);

export default router;
