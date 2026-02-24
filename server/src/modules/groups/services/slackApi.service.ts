import axios from "axios";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";

export interface SlackUserProfile {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string;
  is_bot: boolean;
  is_app_user: boolean;
  is_owner: boolean;
  is_admin: boolean;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile: {
    email?: string;
    display_name: string;
    real_name: string;
    image_72: string;
    title?: string;
    phone?: string;
    pronouns?: string;
    status_text?: string;
    status_emoji?: string;
  };
}

/**
 * Fetch all users from a Slack workspace
 * @param workspaceId - MongoDB ObjectId of the SlackWorkspace
 * @returns Array of Slack user profiles
 */
export const fetchWorkspaceUsers = async (
  workspaceId: string,
): Promise<SlackUserProfile[]> => {
  try {
    // Get workspace credentials from database
    const workspace = await SlackWorkspace.findById(workspaceId);

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Call Slack API to fetch users with caching
    const { slackApiCache } = await import("../../../utils/slackApiCache");
    const response = await slackApiCache.getUsersList(workspace.botToken);

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error || "Unknown error"}`);
    }

    // Filter out bots and deleted users, and return full user objects
    const users: SlackUserProfile[] = response.members
      .filter((user: any) => !user.is_bot && !user.deleted)
      .map((user: any) => ({
        id: user.id,
        team_id: user.team_id,
        name: user.name,
        deleted: user.deleted || false,
        real_name: user.real_name || user.name,
        is_bot: user.is_bot || false,
        is_app_user: user.is_app_user || false,
        is_owner: user.is_owner || false,
        is_admin: user.is_admin || false,
        tz: user.tz || undefined,
        tz_label: user.tz_label || undefined,
        tz_offset: user.tz_offset ?? undefined,
        profile: {
          email: user.profile?.email || "",
          display_name: user.profile?.display_name || user.name,
          real_name: user.profile?.real_name || user.real_name || user.name,
          image_72: user.profile?.image_72 || user.profile?.image_48 || "",
          title: user.profile?.title || undefined,
          phone: user.profile?.phone || undefined,
          pronouns: user.profile?.pronouns || undefined,
          status_text: user.profile?.status_text || undefined,
          status_emoji: user.profile?.status_emoji || undefined,
        },
      }));

    console.log(
      `Fetched ${users.length} users from Slack for workspace ${workspaceId}`,
    );

    return users;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch workspace users: ${error.message}`);
    }
    throw new Error("Failed to fetch workspace users");
  }
};
