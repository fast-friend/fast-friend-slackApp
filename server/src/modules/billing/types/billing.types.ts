export type PlanType = "free" | "pro" | "custom";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid";

export const PLAN_MEMBER_LIMIT: Record<PlanType, number> = {
  free: 10,
  pro: Infinity,
  custom: Infinity,
};

// Templates available on the free tier
export const FREE_TIER_TEMPLATES = ["discovery"];
