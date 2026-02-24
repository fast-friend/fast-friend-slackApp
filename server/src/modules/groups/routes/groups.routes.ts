import { Router } from "express";
import {
  createGroupHandler,
  getGroups,
  getGroup,
  updateGroupHandler,
  deleteGroupHandler,
  addMemberHandler,
  removeMemberHandler,
} from "../controllers/groups.controller";
import gamesRoutes from "./games.routes";

const router = Router({ mergeParams: true }); // mergeParams to access parent route params (workspaceId)

// All routes are under /api/v1/workspaces/:workspaceId/groups
// The workspaceId param is available via mergeParams from parent route

// Get all groups for the workspace
router.get("/", getGroups);

// Create a new group
router.post("/", createGroupHandler);

// Get a single group by ID
router.get("/:groupId", getGroup);

// Update a group
router.put("/:groupId", updateGroupHandler);

// Delete a group
router.delete("/:groupId", deleteGroupHandler);

// Add members to a group
router.post("/:groupId/members", addMemberHandler);

// Remove a member from a group
router.delete("/:groupId/members/:userId", removeMemberHandler);

// Nest game routes under /:groupId/games
router.use("/:groupId/games", gamesRoutes);

export default router;
