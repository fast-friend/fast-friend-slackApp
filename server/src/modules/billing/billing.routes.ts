import { Router } from "express";
import { protect } from "../auth/middlewares/auth.middleware";
import * as billingController from "./billing.controller";
import { handleWebhook } from "./webhook.controller";

const router = Router();

// Stripe webhook — public, raw body parsed in index.ts before JSON middleware
router.post("/webhook", handleWebhook);

// Public price lookup (used to render upgrade UI)
router.get("/prices", billingController.getPrices);

// Protected billing routes
router.get("/subscription", protect(), billingController.getSubscription);
router.post("/checkout", protect(), billingController.createCheckoutSession);
router.post("/portal", protect(), billingController.createPortalSession);

export default router;
