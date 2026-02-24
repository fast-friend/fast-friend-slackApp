import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import GameSession from "../models/GameSession.model";
import GameMessage from "../models/GameMessage.model";
import GameResponse from "../models/GameResponse.model";
import Game from "../../groups/models/Game.model";
import Group from "../../groups/models/Group.model";
import SlackUser from "../../groups/models/SlackUser.model";

/**
 * @desc    Get workspace-scoped game statistics
 * @route   GET /api/v1/workspaces/:workspaceId/slack-game/stats
 * @access  Private
 */
export const getGameStats = asyncHandler(
    async (req: Request, res: Response) => {
        const { workspaceId } = req.params;

        // --- Correct data sources, all filtered by workspaceId ---

        // Total employees = Slack users synced for this workspace
        const totalEmployees = await SlackUser.countDocuments({
            workspaceId,
            isActive: true,
        });

        // Total teams = Groups created in this workspace
        const totalTeams = await Group.countDocuments({ workspaceId });

        // Active games = Games that are scheduled/active and not cancelled
        const activeGames = await Game.countDocuments({
            workspaceId,
            isActive: true,
            status: { $in: ["scheduled", "active"] },
        });

        // --- Workspace-scoped accuracy ---
        // Walk: Games in workspace → GameSessions → GameMessages → GameResponses
        const workspaceGames = await Game.find({ workspaceId }, { _id: 1 }).lean();
        const workspaceGameIds = workspaceGames.map((g) => g._id);

        const workspaceSessions = await GameSession.find(
            { gameId: { $in: workspaceGameIds } },
            { _id: 1 }
        ).lean();
        const workspaceSessionIds = workspaceSessions.map((s) => s._id);

        const workspaceMessages = await GameMessage.find(
            { gameSessionId: { $in: workspaceSessionIds } },
            { _id: 1 }
        ).lean();
        const workspaceMessageIds = workspaceMessages.map((m) => m._id);

        const totalResponses = await GameResponse.countDocuments({
            gameMessageId: { $in: workspaceMessageIds },
        });
        const correctAnswers = await GameResponse.countDocuments({
            gameMessageId: { $in: workspaceMessageIds },
            actionId: "correct",
        });

        const avgAccuracy =
            totalResponses > 0
                ? Math.round((correctAnswers / totalResponses) * 100)
                : 0;

        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                totalTeams,
                activeGames,
                avgAccuracy,
            },
        });
    }
);


/**
 * @desc    Get leaderboard (top users by points)
 * @route   GET /api/v1/workspaces/:workspaceId/slack-game/leaderboard
 * @access  Private
 */
export const getLeaderboard = asyncHandler(
    async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 10;
        // workspaceId comes from the URL param, not a query string
        const { workspaceId } = req.params;

        // Build match filter — scope responses to this workspace via message lookup
        let matchFilter: any = {};
        if (workspaceId) {
            const messages = await GameMessage.find(
                { workspaceId },
                { _id: 1 }
            ).lean();
            const messageIds = messages.map((m) => m._id);
            matchFilter = { gameMessageId: { $in: messageIds } };
        }

        // Aggregate user statistics
        const leaderboard = await GameResponse.aggregate([
            ...(Object.keys(matchFilter).length > 0
                ? [{ $match: matchFilter }]
                : []),
            {
                $group: {
                    _id: "$responderSlackUserId",
                    totalPoints: { $sum: "$points" },
                    totalResponses: { $sum: 1 },
                    correctAnswers: {
                        $sum: {
                            $cond: [{ $eq: ["$actionId", "correct"] }, 1, 0],
                        },
                    },
                },
            },
            { $sort: { totalPoints: -1 } },
            { $limit: limit },
            {
                $project: {
                    slackUserId: "$_id",
                    totalPoints: 1,
                    totalResponses: 1,
                    correctAnswers: 1,
                    _id: 0,
                },
            },
        ]);

        // Enrich each entry with real name + avatar from SlackUser collection
        const slackUserIds = leaderboard.map((u) => u.slackUserId);
        const slackUsers = await SlackUser.find(
            { userId: { $in: slackUserIds }, workspaceId },
            { userId: 1, realName: 1, userName: 1, avatarUrl: 1, photoUrl: 1, role: 1 }
        ).lean();

        const userMap = new Map(slackUsers.map((u) => [u.userId, u]));

        const enrichedLeaderboard = leaderboard.map((user, index) => {
            const profile = userMap.get(user.slackUserId);
            return {
                ...user,
                rank: index + 1,
                name: profile?.realName || profile?.userName || user.slackUserId,
                avatarUrl: profile?.photoUrl || profile?.avatarUrl || null,
                role: (profile?.roles && profile.roles.length > 0) ? profile.roles[0] : (profile?.jobTitle || "Member"),
            };
        });

        res.status(200).json({
            success: true,
            data: {
                leaderboard: enrichedLeaderboard,
            },
        });
    }
);



/**
 * @desc    Get game history with pagination
 * @route   GET /api/v1/slack-game/history
 * @access  Private (ORGANISATION only)
 */
export const getGameHistory = asyncHandler(
    async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const workspaceId = req.query.workspaceId as string;
        const skip = (page - 1) * limit;

        // Build filter
        const filter: any = {};
        if (workspaceId) {
            filter.workspaceId = workspaceId;
        }

        // Get total count
        const total = await GameSession.countDocuments(filter);

        // Get game sessions with workspace info
        const games = await GameSession.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("workspaceId", "teamName")
            .lean();

        // Get message and response counts for each game
        const gamesWithCounts = await Promise.all(
            games.map(async (game) => {
                const messagesSent = await GameMessage.countDocuments({
                    gameSessionId: game._id,
                });
                const responsesReceived = await GameResponse.countDocuments({
                    gameMessageId: {
                        $in: await GameMessage.find(
                            { gameSessionId: game._id },
                            { _id: 1 }
                        ).then((msgs) => msgs.map((m) => m._id)),
                    },
                });

                return {
                    _id: game._id,
                    date: game.date,
                    workspaceName: (game.workspaceId as any)?.teamName || "Unknown",
                    messagesSent,
                    responsesReceived,
                    status: game.status,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: {
                games: gamesWithCounts,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    }
);

/**
 * @desc    Get per-group team performance (accuracy + response rate)
 * @route   GET /api/v1/workspaces/:workspaceId/slack-game/team-performance
 * @access  Private
 */
export const getTeamPerformance = asyncHandler(
    async (req: Request, res: Response) => {
        const { workspaceId } = req.params;

        // Get all groups for this workspace
        const groups = await Group.find({ workspaceId }).lean();

        if (groups.length === 0) {
            return res.status(200).json({
                success: true,
                data: { teams: [] },
            });
        }

        // For each group, gather all games → sessions → messages → responses
        const teams = await Promise.all(
            groups.map(async (group) => {
                // Games belonging to this group
                // groupId and workspaceId are stored as plain strings in Game model
                const games = await Game.find({
                    groupId: group._id.toString(),
                    workspaceId,
                }).lean();

                if (games.length === 0) {
                    return {
                        groupId: group._id.toString(),
                        groupName: group.groupName,
                        accuracy: 0,
                        responseRate: 0,
                        totalGames: 0,
                        totalMessages: 0,
                    };
                }

                const gameIds = games.map((g) => g._id);

                // Sessions for those games
                const sessions = await GameSession.find({
                    gameId: { $in: gameIds },
                }).lean();

                const sessionIds = sessions.map((s) => s._id);

                // Messages sent in those sessions
                const messages = await GameMessage.find({
                    gameSessionId: { $in: sessionIds },
                }).lean();

                const totalMessages = messages.length;
                const messageIds = messages.map((m) => m._id);

                // Responses for those messages
                const totalResponses = await GameResponse.countDocuments({
                    gameMessageId: { $in: messageIds },
                });

                const correctResponses = await GameResponse.countDocuments({
                    gameMessageId: { $in: messageIds },
                    actionId: "correct",
                });

                const accuracy =
                    totalResponses > 0
                        ? Math.round((correctResponses / totalResponses) * 100)
                        : 0;

                const responseRate =
                    totalMessages > 0
                        ? Math.round((totalResponses / totalMessages) * 100)
                        : 0;

                return {
                    groupId: group._id.toString(),
                    groupName: group.groupName,
                    accuracy,
                    responseRate,
                    totalGames: games.length,
                    totalMessages,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: { teams },
        });
    }
);

/**
 * @desc    Get daily performance data (accuracy + response rate) for a team over X days
 * @route   GET /api/v1/workspaces/:workspaceId/slack-game/performance-chart
 * @access  Private
 */
export const getPerformanceChart = asyncHandler(
    async (req: Request, res: Response) => {
        const { workspaceId } = req.params;
        const groupId = req.query.groupId as string;
        let daysStr = req.query.days as string;

        if (!groupId) {
            res.status(400);
            throw new Error("groupId query parameter is required");
        }

        // Determine days. If "all", we'll compute how many days since the first game.
        let days = 7;
        if (daysStr === "all") {
            // Find earliest game
            const gameFilter: any = { workspaceId };
            if (groupId !== "all") {
                gameFilter.groupId = groupId;
            }
            const firstGame = await Game.findOne(gameFilter).sort({ createdAt: 1 }).lean();
            if (!firstGame) {
                return res.status(200).json({ success: true, data: { chart: [] } });
            }
            const diffTime = Math.abs(new Date().getTime() - new Date(firstGame.createdAt).getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            // Cap at 365 or similar if needed, but going to assume we show all.
        } else {
            days = parseInt(daysStr) || 7;
        }

        // Calculate start date (start of day, `days` ago)
        const startDate = new Date();
        startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
        startDate.setUTCHours(0, 0, 0, 0);

        // Find games for this group (or all groups) in this workspace within the date range
        const gameQuery: any = {
            workspaceId,
            createdAt: { $gte: startDate },
        };
        if (groupId !== "all") {
            gameQuery.groupId = groupId;
        }

        const games = await Game.find(gameQuery).lean();

        if (games.length === 0) {
            return res.status(200).json({ success: true, data: { chart: [] } });
        }

        const gameIds = games.map((g) => g._id);

        // Map game IDs to their creation date string (YYYY-MM-DD)
        const gameDateMap = new Map<string, string>();
        games.forEach((g) => {
            const dateStr = new Date(g.createdAt).toISOString().split("T")[0];
            gameDateMap.set(g._id.toString(), dateStr);
        });

        // Get sessions
        const sessions = await GameSession.find({
            gameId: { $in: gameIds },
        }).lean();

        // Map session IDs to the game's date
        const sessionDateMap = new Map<string, string>();
        sessions.forEach((s) => {
            const dateStr = gameDateMap.get(s.gameId.toString());
            if (dateStr) {
                sessionDateMap.set(s._id.toString(), dateStr);
            }
        });

        const sessionIds = sessions.map((s) => s._id);

        // Get messages
        const messages = await GameMessage.find({
            gameSessionId: { $in: sessionIds },
        }).lean();

        // Map message IDs to dates
        const messageDateMap = new Map<string, string>();
        messages.forEach((m) => {
            const dateStr = sessionDateMap.get(m.gameSessionId.toString());
            if (dateStr) {
                messageDateMap.set(m._id.toString(), dateStr);
            }
        });

        const messageIds = messages.map((m) => m._id);

        // Get all responses
        const responses = await GameResponse.find({
            gameMessageId: { $in: messageIds },
        }, { gameMessageId: 1, actionId: 1 }).lean();

        // Bucket statistics by date
        const dailyStats = new Map<string, {
            totalMessages: number;
            totalResponses: number;
            correctResponses: number;
        }>();

        // Pre-fill last N days so we have zeros for empty days
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            dailyStats.set(dateStr, { totalMessages: 0, totalResponses: 0, correctResponses: 0 });
        }

        // Tally messages sent per day
        messages.forEach((m) => {
            const dateStr = messageDateMap.get(m._id.toString());
            if (dateStr && dailyStats.has(dateStr)) {
                dailyStats.get(dateStr)!.totalMessages += 1;
            }
        });

        // Tally responses per day
        responses.forEach((r) => {
            const dateStr = messageDateMap.get(r.gameMessageId.toString());
            if (dateStr && dailyStats.has(dateStr)) {
                const stats = dailyStats.get(dateStr)!;
                stats.totalResponses += 1;
                if (r.actionId === "correct") {
                    stats.correctResponses += 1;
                }
            }
        });

        // Convert bucket map to array, calculate percentages, and sort oldest-to-newest
        const chart = Array.from(dailyStats.entries()).map(([dateStr, stats]) => {
            const accuracy = stats.totalResponses > 0
                ? Math.round((stats.correctResponses / stats.totalResponses) * 100)
                : 0;

            const responseRate = stats.totalMessages > 0
                ? Math.round((stats.totalResponses / stats.totalMessages) * 100)
                : 0;

            // Format to simple date like "Feb 14"
            const dateObj = new Date(dateStr);
            const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return {
                date: formattedDate,
                rawDate: dateStr,
                accuracy,
                responseRate,
            };
        }).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

        // Remove rawDate from final JSON
        const finalChart = chart.map(({ rawDate, ...rest }) => rest);

        res.status(200).json({
            success: true,
            data: { chart: finalChart },
        });
    }
);
