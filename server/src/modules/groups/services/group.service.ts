import Group from "../models/Group.model";
import {
  addMultipleUsersToGroup,
  removeGroupFromAllUsers,
  syncSlackUsers,
} from "./user.service";
import { SlackUserProfile } from "./slackApi.service";

interface CreateGroupData {
  groupName: string;
  description?: string;
  workspaceId: string;
  members?: string[];
  createdBy: string;
  slackUsers?: SlackUserProfile[];
}

interface UpdateGroupData {
  groupName?: string;
  description?: string;
  members?: string[];
}

/**
 * Create a new group
 * @param data - Group creation data including Slack user profiles
 * @returns Created group document
 */
export const createGroup = async (data: CreateGroupData) => {
  const {
    groupName,
    description,
    workspaceId,
    members = [],
    createdBy,
    slackUsers = [],
  } = data;

  // Check if group name already exists in workspace
  const existingGroup = await Group.findOne({
    workspaceId,
    groupName,
    isActive: true,
  });

  if (existingGroup) {
    throw new Error("Group name already exists in this workspace");
  }

  // Sync Slack users to database only if members are provided
  if (slackUsers.length > 0) {
    await syncSlackUsers(workspaceId, slackUsers);
  }

  // Create the group
  const group = await Group.create({
    groupName,
    description,
    workspaceId,
    members,
    createdBy,
    isActive: true,
  });

  // Add group to users' groupsJoined arrays only if members exist
  if (members.length > 0) {
    await addMultipleUsersToGroup(workspaceId, members, group._id.toString());
  }

  return group;
};

/**
 * Get all groups for a workspace
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @returns Array of group documents
 */
export const getGroupsByWorkspace = async (workspaceId: string) => {
  return await Group.find({ workspaceId, isActive: true }).sort({
    createdAt: -1,
  });
};

/**
 * Get a single group by ID
 * @param groupId - MongoDB ObjectId of the Group
 * @returns Group document
 */
export const getGroupById = async (groupId: string) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new Error("Group not found");
  }

  return group;
};

/**
 * Update a group
 * @param groupId - MongoDB ObjectId of the Group
 * @param data - Update data
 * @returns Updated group document
 */
export const updateGroup = async (groupId: string, data: UpdateGroupData) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new Error("Group not found");
  }

  // If updating members, handle groupsJoined arrays
  if (data.members) {
    const oldMembers = group.members;
    const newMembers = data.members;

    // Find users to add and remove
    const usersToAdd = newMembers.filter((id) => !oldMembers.includes(id));
    const usersToRemove = oldMembers.filter((id) => !newMembers.includes(id));

    // Update groupsJoined arrays
    if (usersToAdd.length > 0) {
      await addMultipleUsersToGroup(group.workspaceId, usersToAdd, groupId);
    }

    if (usersToRemove.length > 0) {
      const { removeUserFromGroup } = await import("./user.service");
      for (const userId of usersToRemove) {
        await removeUserFromGroup(userId, group.workspaceId, groupId);
      }
    }
  }

  // Update group document
  Object.assign(group, data);
  await group.save();

  return group;
};

/**
 * Delete a group (soft delete)
 * @param groupId - MongoDB ObjectId of the Group
 */
export const deleteGroup = async (groupId: string) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new Error("Group not found");
  }

  // Remove group from all users' groupsJoined arrays
  await removeGroupFromAllUsers(group.workspaceId, groupId);

  // Soft delete the group
  group.isActive = false;
  await group.save();

  return { message: "Group deleted successfully" };
};

/**
 * Add a single member to a group
 * @param groupId - MongoDB ObjectId of the Group
 * @param userId - Slack user ID
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @param slackUser - Slack user profile from API
 * @returns Updated group document
 */
export const addMemberToGroup = async (
  groupId: string,
  userId: string,
  workspaceId: string,
  slackUser: SlackUserProfile,
) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new Error("Group not found");
  }

  // Check if user is already a member
  if (group.members.includes(userId)) {
    throw new Error("User is already a member of this group");
  }

  // Sync the single user to database (create if not exists)
  await syncSlackUsers(workspaceId, [slackUser]);

  // Add user to group members
  group.members.push(userId);
  await group.save();

  // Add group to user's groupsJoined array
  const { addUserToGroup } = await import("./user.service");
  await addUserToGroup(userId, workspaceId, groupId);

  return group;
};

/**
 * Add multiple members to a group at once
 * @param groupId - MongoDB ObjectId of the Group
 * @param users - Array of users with userId and slackUser profile
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @returns Updated group document
 */
export const addMultipleMembersToGroup = async (
  groupId: string,
  users: Array<{ userId: string; slackUser: SlackUserProfile }>,
  workspaceId: string,
) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new Error("Group not found");
  }

  // Collect user IDs and Slack profiles
  const userIds: string[] = [];
  const slackUsers: SlackUserProfile[] = [];
  const alreadyMembers: string[] = [];

  for (const user of users) {
    // Check if user is already a member
    if (group.members.includes(user.userId)) {
      alreadyMembers.push(user.userId);
      continue;
    }
    userIds.push(user.userId);
    slackUsers.push(user.slackUser);
  }

  // If no new users to add, return early
  if (userIds.length === 0) {
    if (alreadyMembers.length > 0) {
      throw new Error("All selected users are already members of this group");
    }
    return group;
  }

  // Sync all users to database (create if not exists)
  await syncSlackUsers(workspaceId, slackUsers);

  // Add all users to group members
  group.members.push(...userIds);
  await group.save();

  // Add group to all users' groupsJoined array
  await addMultipleUsersToGroup(workspaceId, userIds, groupId);

  return group;
};

/**
 * Remove a single member from a group
 * @param groupId - MongoDB ObjectId of the Group
 * @param userId - Slack user ID
 * @returns Updated group document
 */
export const removeMemberFromGroup = async (
  groupId: string,
  userId: string,
) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new Error("Group not found");
  }

  // Check if user is a member
  if (!group.members.includes(userId)) {
    throw new Error("User is not a member of this group");
  }

  // Remove user from group members
  group.members = group.members.filter((id) => id !== userId);
  await group.save();

  // Remove group from user's groupsJoined array
  const { removeUserFromGroup } = await import("./user.service");
  await removeUserFromGroup(userId, group.workspaceId, groupId);

  return group;
};
