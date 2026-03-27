import { Router } from "express";
import { verifySlackSignature } from "../middlewares/slackVerification.middleware";
import * as slackCommandsController from "../controllers/slackCommands.controller";

const router = Router();

// Slack slash commands (public, verified by Slack signature)
// Since we are parsing application/x-www-form-urlencoded, express.raw must be applied upstream in server/src/index.ts
router.post(
  "/",
  verifySlackSignature,
  slackCommandsController.handleCommand,
);

export default router;
