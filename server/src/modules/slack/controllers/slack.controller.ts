import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import SlackWorkspace from "../models/slackWorkspace.model";
import { env } from "../../../config/env.config";
import type {
  ISlackOAuthResponse,
  ISlackUsersListResponse,
  ISlackConversationOpenResponse,
  ISlackMessageResponse,
  ISendMessageRequest,
} from "../types/slack.types";

/** Raw Slack member shape returned by users.list */
interface ISlackMemberRaw {
  id: string;
  team_id?: string;
  name: string;
  deleted?: boolean;
  real_name?: string;
  is_bot?: boolean;
  is_app_user?: boolean;
  is_owner?: boolean;
  is_admin?: boolean;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile?: {
    email?: string;
    display_name?: string;
    real_name?: string;
    image_72?: string;
    image_48?: string;
    image_192?: string;
    title?: string;
    phone?: string;
    pronouns?: string;
    status_text?: string;
    status_emoji?: string;
  };
}

/**
 * @desc    Start Slack OAuth flow
 * @route   GET /api/v1/slack/oauth/start?organization_id=xxx
 * @access  Private
 */
export const startOAuth = asyncHandler(async (req: Request, res: Response) => {
  const { organization_id } = req.query;

  if (!organization_id) {
    throw new AppError("Organization ID is required", 400);
  }

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope:
      "users:read,channels:read,groups:read,im:read,im:write,mpim:read,chat:write",
    redirect_uri: env.SLACK_REDIRECT_URI,
    // Store organization ID in state to retrieve after OAuth
    state: organization_id as string,
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
});

/**
 * @desc    Handle Slack OAuth callback
 * @route   GET /api/v1/slack/oauth/callback
 * @access  Public
 */
export const oauthCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) {
      throw new AppError("Authorization code not provided", 400);
    }

    // Exchange code for access token
    const response = await axios.post<ISlackOAuthResponse>(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: env.SLACK_REDIRECT_URI,
        },
      },
    );

    const data = response.data;

    if (!data.ok) {
      throw new AppError("Slack OAuth failed", 400);
    }

    const { team, access_token, bot_user_id } = data;

    // Get organization ID from state
    const organizationId = state as string;

    if (!organizationId) {
      throw new AppError("Organization ID not provided", 401);
    }

    // Get user ID from authenticated session (optional, for connectedBy field)
    const connectedBy = req.user?.userId;

    // Save or update workspace connection
    const workspace = await SlackWorkspace.findOneAndUpdate(
      {
        organizationId,
        teamId: team.id,
      },
      {
        organizationId,
        teamId: team.id,
        teamName: team.name,
        botUserId: bot_user_id,
        botToken: access_token,
        connectedBy: connectedBy || organizationId, // Use organizationId as fallback
        connectedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );

    // Fetch users to populate default group
    const { slackApiCache } = await import("../../../utils/slackApiCache");
    const usersResponse = await slackApiCache.getUsersList(access_token);
    let slackUserIds: string[] = [];
    let activeMembers: any[] = [];

    if (usersResponse.ok) {
      activeMembers = usersResponse.members.filter((u: any) => !u.is_bot && !u.deleted);
      slackUserIds = activeMembers.map((u: any) => u.id);

      // (The automatic SlackUser sync is handled below by the createGroup service logic)
    }

    // Create default "All Members Team"
    const Group = (await import("../../groups/models/Group.model")).default;
    let allMembersGroup = await Group.findOne({
      workspaceId: workspace._id.toString(),
      groupName: "All Members Team"
    });

    if (!allMembersGroup) {
      const { createGroup } = await import("../../groups/services/group.service");
      allMembersGroup = await createGroup({
        groupName: "All Members Team",
        description: "Default team containing all workspace members",
        workspaceId: workspace._id.toString(),
        members: slackUserIds,
        slackUsers: activeMembers, // Pass full payload to auto-sync the Users DB!
        createdBy: connectedBy || organizationId,
      });
    }

    // Create default "User Onboarding Game"
    const GameTemplate = (await import("../../groups/models/GameTemplate.model")).default;
    const onboardingTemplate = await GameTemplate.findOne({ templateName: "onboarding", isActive: true });

    if (onboardingTemplate) {
      const Game = (await import("../../groups/models/Game.model")).default;
      const gameExists = await Game.findOne({
        workspaceId: workspace._id.toString(),
        groupId: allMembersGroup._id.toString(),
        gameName: "User Onboarding Game"
      });

      if (!gameExists) {
        // Calculate the next day of the week (0-6)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextDayOfWeek = tomorrow.getDay();

        await Game.create({
          gameName: "User Onboarding Game",
          gameTemplateId: onboardingTemplate._id.toString(),
          groupId: allMembersGroup._id.toString(),
          workspaceId: workspace._id.toString(),
          scheduleType: "weekly",
          scheduledDays: [nextDayOfWeek],
          scheduledTime: "11:00",
          createdBy: connectedBy || organizationId,
          isActive: true,
        });
      }
    }

    // Redirect back to onboarding page (or dashboard if already onboarded) with success message
    res.redirect(`${env.FRONTEND_URL}/onboarding?connected=true`);
  },
);

/**
 * @desc    Get all connected workspaces for current user's organizations
 * @route   GET /api/v1/slack/workspaces
 * @access  Private
 */
export const getWorkspaces = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    // Import OrganizationMember model to find user's organizations
    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;

    // Get all organizations the user belongs to
    const memberships = await OrganizationMember.find({
      userId,
      isActive: true,
    }).select("organizationId");

    const organizationIds = memberships.map((m) => m.organizationId);

    // Get all workspaces for these organizations
    const workspaces = await SlackWorkspace.find({
      organizationId: { $in: organizationIds },
    }).select("-botToken"); // Don't send token to frontend

    res.status(200).json({
      success: true,
      data: { workspaces },
    });
  },
);

/**
 * @desc    Get a specific workspace by ID
 * @route   GET /api/v1/organizations/:organizationId/workspaces/:workspaceId
 * @access  Private
 */
export const getWorkspaceById = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId, organizationId } = req.params;

    // Find workspace
    const workspace = await SlackWorkspace.findOne({
      _id: workspaceId,
      organizationId,
    }).select("-botToken"); // Don't send token to frontend

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    res.status(200).json({
      success: true,
      data: { workspace },
    });
  },
);

/**
 * @desc    Get users from a specific workspace
 * @route   GET /api/v1/slack/workspaces/:workspaceId/users
 * @access  Private
 *
 * Display source: Slack API (all workspace members) UNION CSV-imported DB users.
 * Storage rule (unchanged): SlackUser DB only stores users in ≥1 group.
 */
export const getWorkspaceUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    const workspace = await SlackWorkspace.findById(workspaceId);
    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });
    if (!membership) {
      throw new AppError("You don't have access to this workspace", 403);
    }

    // ── Source 1: Slack API — all real workspace members ─────────────────
    const { slackApiCache } = await import("../../../utils/slackApiCache");
    const response = await slackApiCache.getUsersList(workspace.botToken);
    if (!response.ok) {
      throw new AppError("Failed to fetch users from Slack", 500);
    }
    const slackMembers: ISlackMemberRaw[] = response.members.filter(
      (u: any) => !u.is_bot && !u.deleted,
    );
    const slackMemberIds = new Set(slackMembers.map((u) => u.id));

    // ── Source 2: DB — CSV-imported users not in Slack ────────────────────
    const SlackUser = (await import("../../groups/models/SlackUser.model")).default;
    const csvOnlyUsers = await SlackUser.find({
      workspaceId,
      csvImported: true,
      isActive: true,
      userId: { $nin: Array.from(slackMemberIds) }, // exclude any who also exist in Slack
    }).lean();

    // ── Enrichment models ─────────────────────────────────────────────────
    const GameMessage = (
      await import("../../slack-game/models/GameMessage.model")
    ).default;
    const GameResponse = (
      await import("../../slack-game/models/GameResponse.model")
    ).default;
    const mongoose = await import("mongoose");
    const Group = mongoose.default.models.Group ||
      (await import("../../groups/models/Group.model")).default;

    /** Fetch game stats for any userId */
    const getStats = async (uid: string) => {
      const [gamesPlayed, correct, total] = await Promise.all([
        GameMessage.countDocuments({ workspaceId, recipientSlackUserId: uid, responded: true }),
        GameResponse.countDocuments({ responderSlackUserId: uid, actionId: "correct" }),
        GameResponse.countDocuments({ responderSlackUserId: uid }),
      ]);
      return {
        gamesPlayed,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    };

    // ── Build Slack-member rows ────────────────────────────────────────────
    const slackRows = await Promise.all(
      slackMembers.map(async (slackUser) => {
        const dbUser = await SlackUser.findOne({ userId: slackUser.id, workspaceId });
        const userGroups = dbUser?.groupsJoined?.length
          ? await Group.find({ _id: { $in: dbUser.groupsJoined }, isActive: true }).select("groupName")
          : [];
        const stats = await getStats(slackUser.id);
        return {
          ...slackUser,
          teams: userGroups.map((g: any) => g.groupName),
          ...stats,
          role: (dbUser?.roles && dbUser.roles.length > 0) ? dbUser.roles[0] : (dbUser?.jobTitle || "Member"),
          photoUrl: dbUser?.photoUrl || undefined,
        };
      }),
    );

    // ── Build CSV-only rows ───────────────────────────────────────────────
    const csvRows = await Promise.all(
      csvOnlyUsers.map(async (dbUser) => {
        const stats = await getStats(dbUser.userId);
        return {
          id: dbUser.userId,
          name: dbUser.userName,
          real_name: dbUser.realName,
          is_bot: false,
          deleted: false,
          is_owner: dbUser.isOwner || false,
          is_admin: dbUser.isAdmin || false,
          profile: {
            display_name: dbUser.displayName || dbUser.userName,
            real_name: dbUser.realName,
            email: dbUser.email,
            image_72: dbUser.avatarUrl,
            title: dbUser.jobTitle,
            phone: dbUser.phone,
            pronouns: dbUser.pronouns,
            status_text: dbUser.statusText,
            status_emoji: dbUser.statusEmoji,
          },
          teams: [],
          ...stats,
          role: (dbUser.roles && dbUser.roles.length > 0) ? dbUser.roles[0] : (dbUser.jobTitle || "Member"),
          photoUrl: dbUser.photoUrl || undefined,
          csvImported: true,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: { users: [...slackRows, ...csvRows] },
    });
  },
);



/**
 * @desc    Force-refresh workspace users by clearing the Slack API cache
 * @route   POST /api/v1/slack/workspaces/:workspaceId/users/refresh
 * @access  Private
 */
export const refreshWorkspaceUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    const workspace = await SlackWorkspace.findById(workspaceId);
    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });
    if (!membership) {
      throw new AppError("You don't have access to this workspace", 403);
    }

    // Clear the cache for this workspace's bot token
    const { slackApiCache } = await import("../../../utils/slackApiCache");
    slackApiCache.clearCache(workspace.botToken);

    res.status(200).json({
      success: true,
      message: "Cache cleared. User list will refresh from Slack.",
    });
  },
);



/**
 * @desc    Send message to channel or DM
 * @route   POST /api/v1/slack/workspaces/:workspaceId/message
 * @access  Private
 */
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { channelId, userId, text } = req.body as ISendMessageRequest;

  if (!text) {
    throw new AppError("Message text is required", 400);
  }

  if (!channelId && !userId) {
    throw new AppError("Either channelId or userId is required", 400);
  }

  // Find workspace
  const workspace = await SlackWorkspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  // Verify user has access to this workspace's organization
  const OrganizationMember = (
    await import("../../organization/models/organizationMember.model")
  ).default;
  const membership = await OrganizationMember.findOne({
    userId: req.user?.userId,
    organizationId: workspace.organizationId,
    isActive: true,
  });

  if (!membership) {
    throw new AppError("You don't have access to this workspace", 403);
  }

  let targetChannelId = channelId;

  // If sending DM, open conversation first
  if (userId && !channelId) {
    const dmResponse = await axios.post<ISlackConversationOpenResponse>(
      "https://slack.com/api/conversations.open",
      { users: userId },
      {
        headers: {
          Authorization: `Bearer ${workspace.botToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!dmResponse.data.ok) {
      console.error("Slack API Error:", dmResponse.data);
      throw new AppError(
        `Failed to open DM conversation: ${dmResponse.data.error || "Unknown error"}`,
        500,
      );
    }

    targetChannelId = dmResponse.data.channel.id;
  }

  // Send message
  const messageResponse = await axios.post<ISlackMessageResponse>(
    "https://slack.com/api/chat.postMessage",
    {
      channel: targetChannelId,
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${workspace.botToken}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!messageResponse.data.ok) {
    console.error("Slack API Error:", messageResponse.data);
    throw new AppError(
      `Failed to send message: ${messageResponse.data.error || "Unknown error"}`,
      500,
    );
  }

  res.status(200).json({
    success: true,
    message: "Message sent successfully",
    data: {
      channel: messageResponse.data.channel,
      ts: messageResponse.data.ts,
    },
  });
});

/**
 * @desc    Get channels from a specific workspace
 * @route   GET /api/v1/slack/workspaces/:workspaceId/channels
 * @access  Private
 */
export const getWorkspaceChannels = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    // Find workspace
    const workspace = await SlackWorkspace.findById(workspaceId);

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Verify user has access to this workspace's organization
    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId: req.user?.userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });

    if (!membership) {
      throw new AppError("You don't have access to this workspace", 403);
    }

    // Fetch channels from Slack
    const response = await axios.get(
      "https://slack.com/api/conversations.list",
      {
        params: {
          types: "public_channel,private_channel",
          exclude_archived: true,
          limit: 1000,
        },
        headers: {
          Authorization: `Bearer ${workspace.botToken}`,
        },
      },
    );

    if (!response.data.ok) {
      throw new AppError("Failed to fetch channels from Slack", 500);
    }

    const channels = response.data.channels || [];

    res.status(200).json({
      success: true,
      data: { channels },
    });
  },
);

/**
 * @desc    Get members of specific channels
 * @route   POST /api/v1/slack/workspaces/:workspaceId/channel-members
 * @access  Private
 */
export const getChannelMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { channelIds } = req.body as { channelIds: string[] };

    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      throw new AppError("Channel IDs array is required", 400);
    }

    // Find workspace
    const workspace = await SlackWorkspace.findById(workspaceId);

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Verify user has access to this workspace's organization
    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId: req.user?.userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });

    if (!membership) {
      throw new AppError("You don't have access to this workspace", 403);
    }

    // Fetch users from all selected channels
    const allUserIds = new Set<string>();

    for (const channelId of channelIds) {
      try {
        const response = await axios.get(
          "https://slack.com/api/conversations.members",
          {
            params: {
              channel: channelId,
              limit: 1000,
            },
            headers: {
              Authorization: `Bearer ${workspace.botToken}`,
            },
          },
        );

        if (response.data.ok && response.data.members) {
          response.data.members.forEach((userId: string) =>
            allUserIds.add(userId),
          );
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers["retry-after"] || 60;
          throw new AppError(
            `Slack API rate limit exceeded. Please try again in ${retryAfter} seconds.`,
            429,
          );
        }
        console.error(
          `Failed to fetch members for channel ${channelId}:`,
          error,
        );
      }
    }

    // First try to get users from our database to avoid API calls
    const SlackUser = (await import("../../groups/models/SlackUser.model"))
      .default;
    const dbUsers = await SlackUser.find({
      workspaceId: workspace._id.toString(),
      userId: { $in: Array.from(allUserIds) },
      isActive: true,
    }).lean();

    // If we have all users in DB, return them as Slack API format
    if (dbUsers.length === allUserIds.size) {
      const slackFormattedUsers = dbUsers.map((user: any) => ({
        id: user.userId,
        name: user.userName,
        real_name: user.realName,
        is_owner: user.isOwner || false,
        is_admin: user.isAdmin || false,
        tz: user.timezone,
        tz_label: user.tzLabel,
        tz_offset: user.tzOffset,
        profile: {
          email: user.email,
          display_name: user.displayName || user.userName,
          image_72: user.avatarUrl,
          title: user.jobTitle,
          phone: user.phone,
          pronouns: user.pronouns,
          status_text: user.statusText,
          status_emoji: user.statusEmoji,
        },
        is_bot: false,
        deleted: !user.isActive,
      }));

      return res.status(200).json({
        success: true,
        data: { users: slackFormattedUsers },
      });
    }

    // Otherwise, fetch from Slack API and update DB with caching
    const { slackApiCache } = await import("../../../utils/slackApiCache");
    let usersResponse;
    try {
      usersResponse = await slackApiCache.getUsersList(workspace.botToken);

      if (!usersResponse.ok) {
        throw new AppError("Failed to fetch users from Slack", 500);
      }
    } catch (error: any) {
      if (error.statusCode === 429 || error.response?.status === 429) {
        const retryAfter = error.response?.headers["retry-after"] || 60;
        throw new AppError(
          `Slack API rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          429,
        );
      }
      throw error;
    }

    // Filter users to only those in the selected channels and exclude bots
    const users = usersResponse.members.filter(
      (user: any) => allUserIds.has(user.id) && !user.is_bot && !user.deleted,
    );

    // Update/insert users in database for future use
    for (const user of users as ISlackMemberRaw[]) {
      await SlackUser.findOneAndUpdate(
        { userId: user.id, workspaceId: workspace._id.toString() },
        {
          $set: {
            userName: user.name || user.real_name,
            realName: user.real_name,
            displayName: user.profile?.display_name || undefined,
            email: user.profile?.email || undefined,
            avatarUrl: user.profile?.image_72 || user.profile?.image_48 || undefined,
            jobTitle: user.profile?.title || undefined,
            statusText: user.profile?.status_text || undefined,
            statusEmoji: user.profile?.status_emoji || undefined,
            phone: user.profile?.phone || undefined,
            pronouns: user.profile?.pronouns || undefined,
            timezone: user.tz || undefined,
            tzLabel: user.tz_label || undefined,
            tzOffset: user.tz_offset ?? undefined,
            isOwner: user.is_owner || false,
            isAdmin: user.is_admin || false,
            isActive: !user.deleted,
          },
          $setOnInsert: {
            groupsJoined: [],
            messagesSent: 0,
            responsesCount: 0,
          },
        },
        { upsert: true, new: true },
      );
    }

    res.status(200).json({
      success: true,
      data: { users },
    });
  },
);

/**
 * @desc    Disconnect workspace
 * @route   DELETE /api/v1/slack/workspaces/:workspaceId
 * @access  Private
 */
export const disconnectWorkspace = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    // Find workspace
    const workspace = await SlackWorkspace.findById(workspaceId);

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Verify user has ADMIN or OWNER role in this workspace's organization
    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      throw new AppError(
        "You don't have permission to disconnect this workspace",
        403,
      );
    }

    // Delete the workspace
    await SlackWorkspace.findByIdAndDelete(workspaceId);

    res.status(200).json({
      success: true,
      message: "Workspace disconnected successfully",
    });
  },
);

/**
 * @desc    Get workspace statistics (groups, users, games, engagement)
 * @route   GET /api/v1/workspaces/:workspaceId/stats
 * @access  Private
 */
export const getWorkspaceStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    // Find workspace
    const workspace = await SlackWorkspace.findById(workspaceId);

    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    // Verify user has access to this workspace's organization
    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });

    if (!membership) {
      throw new AppError("You don't have access to this workspace", 403);
    }

    // Import necessary models
    const Group = (await import("../../groups/models/Group.model")).default;
    const Game = (await import("../../../modules/groups/models/Game.model"))
      .default;
    const GameSession = (
      await import("../../../modules/slack-game/models/GameSession.model")
    ).default;
    const GameResponse = (
      await import("../../../modules/slack-game/models/GameResponse.model")
    ).default;

    // Get counts in parallel
    const [groupsCount, gamesCount, totalSessions, totalResponses] =
      await Promise.all([
        Group.countDocuments({ workspaceId, isActive: true }),
        Game.countDocuments({ workspaceId, isActive: true }),
        GameSession.countDocuments({ workspaceId }),
        GameResponse.countDocuments({}), // Will filter by sessions from this workspace
      ]);

    // Get users count from Slack API
    let usersCount = 0;
    try {
      const response = await axios.get<ISlackUsersListResponse>(
        "https://slack.com/api/users.list",
        {
          headers: {
            Authorization: `Bearer ${workspace.botToken}`,
          },
        },
      );

      if (response.data.ok) {
        // Count active, non-bot users
        usersCount = response.data.members.filter(
          (user) => !user.is_bot && !user.deleted,
        ).length;
      }
    } catch (error) {
      console.error("Failed to fetch users count from Slack:", error);
      // Continue with usersCount = 0
    }

    // Calculate engagement rate (responses / total sessions)
    // If no sessions exist, engagement is 0%
    const engagementRate =
      totalSessions > 0 ? (totalResponses / totalSessions) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        groupsCount,
        usersCount,
        gamesCount,
        engagementRate: Math.round(engagementRate * 10) / 10, // Round to 1 decimal
      },
    });
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvUserRow {
  userId: string;
  userName: string;
  realName: string;
  jobTitle: string;
  displayName?: string;
  email?: string;
  phone?: string;
  pronouns?: string;
  department?: string;
}

interface CsvRowError {
  row: number;
  userId: string;
  name: string;
  missingFields: string[];
}

const CSV_REQUIRED_FIELDS: (keyof CsvUserRow)[] = [
  "userId",
  "userName",
  "realName",
  "jobTitle",
];

/**
 * @desc    Upload / upsert Slack users from a parsed CSV payload
 * @route   POST /api/v1/workspaces/:workspaceId/users/csv-upload
 * @access  Private
 * @body    { users: CsvUserRow[], skipInvalid: boolean }
 */
export const uploadUsersFromCsv = asyncHandler(
  async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { users, skipInvalid } = req.body as {
      users: CsvUserRow[];
      skipInvalid: boolean;
    };

    if (!Array.isArray(users) || users.length === 0) {
      throw new AppError("No user rows provided", 400);
    }

    // Verify workspace exists and user has access
    const workspace = await SlackWorkspace.findById(workspaceId);
    if (!workspace) {
      throw new AppError("Workspace not found", 404);
    }

    const OrganizationMember = (
      await import("../../organization/models/organizationMember.model")
    ).default;
    const membership = await OrganizationMember.findOne({
      userId: req.user?.userId,
      organizationId: workspace.organizationId,
      isActive: true,
    });
    if (!membership) {
      throw new AppError("You don't have access to this workspace", 403);
    }

    // ── Validate each row ────────────────────────────────────────────────────
    const errors: CsvRowError[] = [];
    const validRows: CsvUserRow[] = [];

    users.forEach((row, index) => {
      const missing = CSV_REQUIRED_FIELDS.filter(
        (field) => !row[field] || String(row[field]).trim() === "",
      );

      if (missing.length > 0) {
        errors.push({
          row: index + 1,
          userId: row.userId || "",
          name: row.realName || row.userName || `Row ${index + 1}`,
          missingFields: missing,
        });
      } else {
        validRows.push(row);
      }
    });

    // If there are errors and skipInvalid is false → reject entirely
    if (errors.length > 0 && !skipInvalid) {
      return res.status(400).json({
        success: false,
        message: "Some rows are missing required fields. No users were uploaded.",
        errors,
      });
    }

    // ── Upsert valid rows ────────────────────────────────────────────────────
    const SlackUserModel = (
      await import("../../groups/models/SlackUser.model")
    ).default;

    let uploadedCount = 0;
    const uploadErrors: CsvRowError[] = [];

    for (const row of validRows) {
      try {
        await SlackUserModel.findOneAndUpdate(
          { userId: row.userId.trim(), workspaceId },
          {
            $set: {
              userName: row.userName.trim(),
              realName: row.realName.trim(),
              jobTitle: row.jobTitle.trim(),
              ...(row.displayName && { displayName: row.displayName.trim() }),
              ...(row.email && { email: row.email.trim().toLowerCase() }),
              ...(row.phone && { phone: row.phone.trim() }),
              ...(row.pronouns && { pronouns: row.pronouns.trim() }),
              ...(row.department && { department: row.department.trim() }),
              isActive: true,
              csvImported: true,
            },
            $setOnInsert: {
              groupsJoined: [],
              messagesSent: 0,
              responsesCount: 0,
            },
          },
          { upsert: true, new: true },
        );
        uploadedCount++;
      } catch (err) {
        console.error(`Failed to upsert CSV user ${row.userId}:`, err);
        uploadErrors.push({
          row: users.findIndex((u) => u.userId === row.userId) + 1,
          userId: row.userId,
          name: row.realName,
          missingFields: ["(database error)"],
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        uploaded: uploadedCount,
        skipped: [...errors, ...uploadErrors],
      },
    });
  },
);
