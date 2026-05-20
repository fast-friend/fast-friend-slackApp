import { Request, Response } from "express";
import { stripe } from "./stripe.client";
import { env } from "../../config/env.config";
import * as billingService from "./billing.service";

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        if (
          session.mode === "subscription" &&
          session.subscription &&
          session.metadata?.organizationId
        ) {
          const sub: any = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await billingService.activateProPlan(
            session.metadata.organizationId,
            sub.id,
            new Date(sub.current_period_end * 1000)
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        await billingService.updateSubscriptionStatus(
          sub.id,
          sub.status,
          new Date(sub.current_period_end * 1000)
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await billingService.cancelSubscription(sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await billingService.updateSubscriptionStatus(
            invoice.subscription as string,
            "past_due",
            new Date()
          );
        }
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};
