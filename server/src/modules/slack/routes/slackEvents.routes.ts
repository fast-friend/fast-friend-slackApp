import { Router } from "express";
import { handleSlackEvent } from "../controllers/slackEvents.controller";
import { verifySlackEventsSignature } from "../middlewares/slackEventsVerification.middleware";

const router = Router();

// Slack Events API endpoint (public, verified by Slack signature)
router.post("/", verifySlackEventsSignature, handleSlackEvent);

export default router;
