import { Request, Response } from "express";
import { fetchWorkspaceUsers } from "../services/slackApi.service";
import {
  createGroup,
  getGroupsByWorkspace,
  getGroupById,
  updateGroup,
  deleteGroup,
} from "../services/group.service";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import OrganizationMember from "../../organization/models/organizationMember.model";

/**
 * Get user's organization ID
 */
const getUserOrganization = async (userId: string): Promise<string> => {
  const member = await OrganizationMember.findOne({ userId });

  if (!member) {
    throw new Error("User is not part of any organization");
  }

  return member.organizationId.toString();
};

/**
 * Verify workspace belongs to user's organization
 */
const verifyWorkspaceAccess = async (workspaceId: string, userId: string) => {
  const organizationId = await getUserOrganization(userId);

  const workspace = await SlackWorkspace.findOne({
    _id: workspaceId,
    organizationId,
  });

  if (!workspace) {
    throw new Error("Workspace not found or access denied");
  }

  return workspace;
};

/**
 * GET /api/v1/workspaces/:workspaceId/users
 * Fetch all users from Slack workspace
 */
export const getWorkspaceUsers = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = (req as any).user?.userId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID is required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log(`Fetching workspace users for workspaceId: ${workspaceId}`);

    // Verify workspace belongs to user's organization
    await verifyWorkspaceAccess(workspaceId, userId);

    const users = await fetchWorkspaceUsers(workspaceId);

    console.log(`Successfully fetched ${users.length} users`);

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Error fetching workspace users:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch workspace users",
    });
  }
};

/**
 * POST /api/v1/workspaces/:workspaceId/groups
 * Create a new group
 */
export const createGroupHandler = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { groupName, description, members } = req.body;
    const createdBy = (req as any).user?.userId;

    // Validate authentication
    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Validate required fields
    if (!groupName || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Group name and workspace ID are required",
      });
    }

    // Verify workspace belongs to user's organization
    await verifyWorkspaceAccess(workspaceId, createdBy);

    const group = await createGroup({
      groupName,
      description,
      workspaceId,
      members: members || [],
      createdBy,
    });

    res.status(201).json({
      success: true,
      data: { group },
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create group",
    });
  }
};

/**
 * GET /api/v1/workspaces/:workspaceId/groups
 * Get all groups for a workspace
 */
export const getGroups = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = (req as any).user?.userId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Workspace ID is required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Verify workspace belongs to user's organization
    await verifyWorkspaceAccess(workspaceId, userId);

    const groups = await getGroupsByWorkspace(workspaceId);

    res.status(200).json({
      success: true,
      data: { groups },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch groups",
    });
  }
};

/**
 * GET /api/v1/groups/detail/:groupId
 * Get a single group by ID
 */
export const getGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const group = await getGroupById(groupId);

    res.status(200).json({
      success: true,
      data: { group },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Group not found",
    });
  }
};

/**
 * PUT /api/v1/groups/:groupId
 * Update a group
 */
export const updateGroupHandler = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { groupName, description, members } = req.body;

    const group = await updateGroup(groupId, {
      groupName,
      description,
      members,
    });

    res.status(200).json({
      success: true,
      data: { group },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update group",
    });
  }
};

/**
 * DELETE /api/v1/groups/:groupId
 * Delete a group (soft delete)
 */
export const deleteGroupHandler = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const result = await deleteGroup(groupId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete group",
    });
  }
};

/**
 * POST /api/v1/groups/:groupId/members
 * Add members to a group (supports single or multiple users)
 */
export const addMemberHandler = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { users, userId, slackUser } = req.body;

    // Support both single user (legacy) and multiple users
    let usersToAdd: Array<{ userId: string; slackUser: any }> = [];

    if (users && Array.isArray(users)) {
      // New format: multiple users
      usersToAdd = users;
    } else if (userId && slackUser) {
      // Legacy format: single user
      usersToAdd = [{ userId, slackUser }];
    } else {
      return res.status(400).json({
        success: false,
        message: "Users array or userId and slackUser are required",
      });
    }

    // Validate that we have users to add
    if (usersToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one user must be provided",
      });
    }

    // Get group to find workspaceId
    const { getGroupById, addMultipleMembersToGroup } =
      await import("../services/group.service");
    const group = await getGroupById(groupId);

    const updatedGroup = await addMultipleMembersToGroup(
      groupId,
      usersToAdd,
      group.workspaceId,
    );

    res.status(200).json({
      success: true,
      data: { group: updatedGroup },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to add members",
    });
  }
};

/**
 * DELETE /api/v1/groups/:groupId/members/:userId
 * Remove a member from a group
 */
export const removeMemberHandler = async (req: Request, res: Response) => {
  try {
    const { groupId, userId } = req.params;

    const { removeMemberFromGroup } = await import("../services/group.service");
    const updatedGroup = await removeMemberFromGroup(groupId, userId);

    res.status(200).json({
      success: true,
      data: { group: updatedGroup },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove member",
    });
  }
};
