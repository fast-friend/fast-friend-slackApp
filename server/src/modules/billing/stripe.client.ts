import Stripe from "stripe";
import { env } from "../../config/env.config";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia" as any,
});
