import SlackUser from "../models/SlackUser.model";
import { SlackUserProfile } from "./slackApi.service";

/**
 * Sync Slack users to database
 * Creates new SlackUser records if they don't exist
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @param slackUsers - Array of Slack user profiles from API
 * @returns Array of synced user IDs
 */
export const syncSlackUsers = async (
    workspaceId: string,
    slackUsers: SlackUserProfile[]
): Promise<string[]> => {
    const syncedUserIds: string[] = [];

    for (const slackUser of slackUsers) {
        try {
            await SlackUser.findOneAndUpdate(
                { userId: slackUser.id, workspaceId },
                {
                    $set: {
                        userName: slackUser.name,
                        realName: slackUser.real_name,
                        displayName: slackUser.profile.display_name || undefined,
                        email: slackUser.profile.email || undefined,
                        avatarUrl: slackUser.profile.image_72 || undefined,
                        // Extended Slack profile fields
                        jobTitle: slackUser.profile.title || undefined,
                        statusText: slackUser.profile.status_text || undefined,
                        statusEmoji: slackUser.profile.status_emoji || undefined,
                        phone: slackUser.profile.phone || undefined,
                        pronouns: slackUser.profile.pronouns || undefined,
                        timezone: slackUser.tz || undefined,
                        tzLabel: slackUser.tz_label || undefined,
                        tzOffset: slackUser.tz_offset ?? undefined,
                        isOwner: slackUser.is_owner,
                        isAdmin: slackUser.is_admin,
                        isActive: true,
                    },
                    $setOnInsert: {
                        groupsJoined: [],
                        messagesSent: 0,
                        responsesCount: 0,
                    },
                },
                { upsert: true, new: true }
            );

            syncedUserIds.push(slackUser.id);
        } catch (error) {
            console.error(
                `Failed to sync user ${slackUser.id}:`,
                error instanceof Error ? error.message : error
            );
            // Continue with other users even if one fails
        }
    }

    return syncedUserIds;
};

/**
 * Add group to user's groupsJoined array
 * @param userId - Slack user ID
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @param groupId - MongoDB ObjectId of the Group
 */
export const addUserToGroup = async (
    userId: string,
    workspaceId: string,
    groupId: string
): Promise<void> => {
    await SlackUser.findOneAndUpdate(
        { userId, workspaceId },
        { $addToSet: { groupsJoined: groupId } },
        { new: true }
    );
};

/**
 * Remove group from user's groupsJoined array
 * @param userId - Slack user ID
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @param groupId - MongoDB ObjectId of the Group
 */
export const removeUserFromGroup = async (
    userId: string,
    workspaceId: string,
    groupId: string
): Promise<void> => {
    await SlackUser.findOneAndUpdate(
        { userId, workspaceId },
        { $pull: { groupsJoined: groupId } },
        { new: true }
    );
};

/**
 * Update multiple users' groupsJoined arrays
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @param userIds - Array of Slack user IDs
 * @param groupId - MongoDB ObjectId of the Group
 */
export const addMultipleUsersToGroup = async (
    workspaceId: string,
    userIds: string[],
    groupId: string
): Promise<void> => {
    await SlackUser.updateMany(
        { userId: { $in: userIds }, workspaceId },
        { $addToSet: { groupsJoined: groupId } }
    );
};

/**
 * Remove group from all users
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @param groupId - MongoDB ObjectId of the Group
 */
export const removeGroupFromAllUsers = async (
    workspaceId: string,
    groupId: string
): Promise<void> => {
    await SlackUser.updateMany(
        { workspaceId, groupsJoined: groupId },
        { $pull: { groupsJoined: groupId } }
    );
};
