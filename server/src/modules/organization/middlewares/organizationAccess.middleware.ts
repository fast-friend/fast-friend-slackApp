import { Request, Response, NextFunction } from "express";
import AppError from "../../../utils/appError";
import { OrganizationRole } from "../types/organization.types";
import {
  getUserRoleInOrganization,
  checkOrganizationAccess,
} from "../services/organization.service";

// Extend Express Request to include organization context
declare global {
  namespace Express {
    interface Request {
      organization?: {
        organizationId: string;
        role: OrganizationRole;
      };
    }
  }
}

/**
 * Middleware to verify user has access to organization
 * Attaches organizationId and role to request.organization
 *
 * @param orgIdParam - Name of the route parameter containing organizationId (e.g., "organizationId", "orgId")
 */
export const requireOrganization = (orgIdParam: string = "organizationId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get organization ID from route params
      const organizationId = req.params[orgIdParam];

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      // Get user ID from JWT (set by protect middleware)
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Check if user has access to this organization
      const hasAccess = await checkOrganizationAccess(userId, organizationId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this organization",
        });
      }

      // Get user's role in organization
      const role = await getUserRoleInOrganization(userId, organizationId);

      if (!role) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this organization",
        });
      }

      // Attach organization context to request
      req.organization = {
        organizationId,
        role,
      };

      next();
    } catch (error) {
      console.error("Organization access middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify organization access",
      });
    }
  };
};

/**
 * Middleware to require specific roles in organization
 * Must be used AFTER requireOrganization middleware
 *
 * @param allowedRoles - Array of roles allowed to access the route
 */
export const requireRole = (...allowedRoles: OrganizationRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if organization context is attached
      if (!req.organization) {
        return res.status(500).json({
          success: false,
          message:
            "Organization context not found. Use requireOrganization middleware first.",
        });
      }

      const { role } = req.organization;

      // Check if user's role is allowed
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
        });
      }

      next();
    } catch (error) {
      console.error("Role check middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify permissions",
      });
    }
  };
};
