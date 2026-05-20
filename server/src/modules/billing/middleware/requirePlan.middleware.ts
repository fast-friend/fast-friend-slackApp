import { Request, Response, NextFunction } from "express";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import Organization from "../../organization/models/organization.model";
import OrganizationMember from "../../organization/models/organizationMember.model";
import {
  PLAN_MEMBER_LIMIT,
  FREE_TIER_TEMPLATES,
} from "../types/billing.types";

const getOrgFromWorkspace = async (workspaceId: string) => {
  const workspace = await SlackWorkspace.findById(workspaceId);
  if (!workspace) return null;
  return Organization.findById(workspace.organizationId);
};

// Blocks access for free-tier orgs — use on any pro-only route
export const requirePro = () =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      if (!workspaceId) {
        return res.status(400).json({ success: false, message: "Workspace ID required" });
      }

      const org = await getOrgFromWorkspace(workspaceId);
      if (!org) {
        return res.status(404).json({ success: false, message: "Organization not found" });
      }

      if (org.plan === "free") {
        return res.status(403).json({
          success: false,
          message: "This feature requires a Pro plan. Please upgrade to continue.",
          upgradeRequired: true,
          currentPlan: "free",
        });
      }

      next();
    } catch (error) {
      console.error("requirePro error:", error);
      return res.status(500).json({ success: false, message: "Plan check failed" });
    }
  };

// Blocks game creation if the template isn't in the free tier allowlist
export const requireTemplateAccess = () =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const templateName = req.body?.templateName ?? req.query?.templateName;

      if (!workspaceId || !templateName) return next();

      const org = await getOrgFromWorkspace(workspaceId);
      if (!org) return next();

      if (org.plan === "free" && !FREE_TIER_TEMPLATES.includes(templateName)) {
        return res.status(403).json({
          success: false,
          message:
            "This game module requires a Pro plan. Only the Discovery game is available on the Free plan.",
          upgradeRequired: true,
          currentPlan: "free",
          allowedTemplates: FREE_TIER_TEMPLATES,
        });
      }

      next();
    } catch (error) {
      console.error("requireTemplateAccess error:", error);
      return res.status(500).json({ success: false, message: "Plan check failed" });
    }
  };

// Blocks adding members when a free-tier org is at its limit
export const requireMemberSlot = () =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      if (!workspaceId) return next();

      const org = await getOrgFromWorkspace(workspaceId);
      if (!org || org.plan !== "free") return next();

      const memberCount = await OrganizationMember.countDocuments({
        organizationId: org._id,
        isActive: true,
      });

      if (memberCount >= PLAN_MEMBER_LIMIT.free) {
        return res.status(403).json({
          success: false,
          message: `Free plan is limited to ${PLAN_MEMBER_LIMIT.free} team members. Upgrade to Pro for unlimited members.`,
          upgradeRequired: true,
          currentPlan: "free",
          memberLimit: PLAN_MEMBER_LIMIT.free,
        });
      }

      next();
    } catch (error) {
      console.error("requireMemberSlot error:", error);
      return res.status(500).json({ success: false, message: "Plan check failed" });
    }
  };
