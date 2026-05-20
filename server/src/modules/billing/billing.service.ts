import { stripe } from "./stripe.client";
import Organization from "../organization/models/organization.model";
import { env } from "../../config/env.config";

export const getOrCreateCustomer = async (
  organizationId: string,
  email: string
): Promise<string> => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new Error("Organization not found");

  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: org.name,
    metadata: { organizationId: org._id.toString() },
  });

  org.stripeCustomerId = customer.id;
  await org.save();

  return customer.id;
};

export const createCheckoutSession = async (
  organizationId: string,
  priceId: string,
  userEmail: string
): Promise<string> => {
  const customerId = await getOrCreateCustomer(organizationId, userEmail);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/billing`,
    metadata: { organizationId },
    subscription_data: { metadata: { organizationId } },
  });

  return session.url!;
};

export const createPortalSession = async (
  organizationId: string
): Promise<string> => {
  const org = await Organization.findById(organizationId);
  if (!org) throw new Error("Organization not found");
  if (!org.stripeCustomerId) throw new Error("No Stripe customer found — complete checkout first");

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/billing`,
  });

  return session.url;
};

export const getSubscription = async (organizationId: string) => {
  const org = await Organization.findById(organizationId).select(
    "plan stripeCustomerId stripeSubscriptionId subscriptionStatus currentPeriodEnd"
  );
  if (!org) throw new Error("Organization not found");
  return org;
};

export const activateProPlan = async (
  organizationId: string,
  subscriptionId: string,
  currentPeriodEnd: Date
): Promise<void> => {
  await Organization.findByIdAndUpdate(organizationId, {
    plan: "pro",
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: "active",
    currentPeriodEnd,
  });
};

export const updateSubscriptionStatus = async (
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date
): Promise<void> => {
  const plan = status === "active" || status === "trialing" ? "pro" : "free";
  await Organization.findOneAndUpdate(
    { stripeSubscriptionId },
    { plan, subscriptionStatus: status, currentPeriodEnd }
  );
};

export const cancelSubscription = async (
  stripeSubscriptionId: string
): Promise<void> => {
  await Organization.findOneAndUpdate(
    { stripeSubscriptionId },
    {
      plan: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    }
  );
};
