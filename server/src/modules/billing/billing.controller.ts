import { Request, Response } from "express";
import * as billingService from "./billing.service";
import OrganizationMember from "../organization/models/organizationMember.model";
import AuthUser from "../auth/models/authuser.model";
import { OrganizationRole } from "../organization/types/organization.types";
import { env } from "../../config/env.config";

const getOrgIdForUser = async (userId: string): Promise<string | null> => {
  const membership = await OrganizationMember.findOne({
    userId,
    isActive: true,
  }).sort({ createdAt: 1 });
  return membership?.organizationId.toString() ?? null;
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.body;
    const userId = req.user!.userId;

    if (!priceId) {
      return res.status(400).json({ success: false, message: "priceId is required" });
    }

    const organizationId = await getOrgIdForUser(userId);
    if (!organizationId) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const membership = await OrganizationMember.findOne({
      userId,
      organizationId,
      role: { $in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: "Only admins can manage billing" });
    }

    const user = await AuthUser.findById(userId).select("email");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const url = await billingService.createCheckoutSession(
      organizationId,
      priceId,
      user.email
    );

    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to create checkout session" });
  }
};

export const createPortalSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const organizationId = await getOrgIdForUser(userId);
    if (!organizationId) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const url = await billingService.createPortalSession(organizationId);
    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error("createPortalSession error:", error);
    return res.status(500).json({ success: false, message: "Failed to create portal session" });
  }
};

export const getSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const organizationId = await getOrgIdForUser(userId);
    if (!organizationId) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const subscription = await billingService.getSubscription(organizationId);
    return res.json({ success: true, data: subscription });
  } catch (error) {
    console.error("getSubscription error:", error);
    return res.status(500).json({ success: false, message: "Failed to get subscription" });
  }
};

export const getPrices = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      proMonthly: env.STRIPE_PRICE_PRO_MONTHLY,
      proYearly: env.STRIPE_PRICE_PRO_YEARLY,
    },
  });
};
