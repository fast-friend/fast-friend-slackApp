import { Router } from "express";
import { protect } from "../../auth/middlewares/auth.middleware";
import {
  requireOrganization,
  requireRole,
} from "../middlewares/organizationAccess.middleware";
import { OrganizationRole } from "../types/organization.types";
import * as organizationController from "../controllers/organization.controller";

const router = Router();

// Basic organization CRUD routes
// Note: Users belong to one organization (created on signup)
// Organization members are managed through Slack workspaces

router.post("/", protect(), organizationController.createOrganization);
router.get("/", protect(), organizationController.getUserOrganizations);

router.get(
  "/:organizationId",
  protect(),
  requireOrganization("organizationId"),
  organizationController.getOrganizationById,
);

router.patch(
  "/:organizationId",
  protect(),
  requireOrganization("organizationId"),
  requireRole(OrganizationRole.OWNER, OrganizationRole.ADMIN),
  organizationController.updateOrganization,
);

router.delete(
  "/:organizationId",
  protect(),
  requireOrganization("organizationId"),
  requireRole(OrganizationRole.OWNER),
  organizationController.deleteOrganization,
);

export default router;
