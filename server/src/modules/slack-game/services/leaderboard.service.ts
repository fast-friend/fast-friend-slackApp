import mongoose from "mongoose";
import GameResponse from "../models/GameResponse.model";
import GameMessage from "../models/GameMessage.model";
import SlackUser from "../../groups/models/SlackUser.model";

export interface LeaderboardUser {
    rank: number;
    userId: string;
    name: string;
    points: number;
    isCurrentUser: boolean;
}

export interface LeaderboardResult {
    leaderboard: LeaderboardUser[];
}

/**
 * Calculates current XP for a single user in a workspace
 */
export const getUserXP = async (workspaceId: string, slackUserId: string): Promise<number> => {
    // GameResponses only hold the responderSlackUserId and gameMessageId.
    // We must join with GameMessage to ensure it belongs to the correct workspaceId.
    const xpResult = await GameResponse.aggregate([
        {
            $match: {
                responderSlackUserId: slackUserId,
            }
        },
        {
            $lookup: {
                from: "gamemessages",
                localField: "gameMessageId",
                foreignField: "_id",
                as: "message"
            }
        },
        {
            $unwind: "$message"
        },
        {
            $match: {
                "message.workspaceId": new mongoose.Types.ObjectId(workspaceId),
            }
        },
        {
            $group: {
                _id: null,
                totalPoints: { $sum: "$points" }
            }
        }
    ]);

    return xpResult.length > 0 ? xpResult[0].totalPoints : 0;
};

/**
 * Generates the Leaderboard for a workspace.
 * Rules: Top 9. If requesting user is not in Top 9, they appear as 10th row.
 * If requesting user IS in top 9, it just shows top 10.
 */
export const getWorkspaceLeaderboard = async (
    workspaceId: string,
    requestingSlackUserId: string
): Promise<LeaderboardResult> => {
    // 1. Aggregate points for all users in the workspace
    const rankings = await GameResponse.aggregate([
        {
            $lookup: {
                from: "gamemessages",
                localField: "gameMessageId",
                foreignField: "_id",
                as: "message"
            }
        },
        {
            $unwind: "$message"
        },
        {
            $match: {
                "message.workspaceId": new mongoose.Types.ObjectId(workspaceId),
            }
        },
        {
            $group: {
                _id: "$responderSlackUserId",
                totalPoints: { $sum: "$points" }
            }
        },
        {
            $sort: { totalPoints: -1 }
        }
    ]);

    // 2. Fetch User Names
    // We only need names for people who appear in the final output, but it's simpler to fetch the pool
    // and map them. Since rankings are just strings, let's map them.

    // Assign ranks (handling ties properly if we wanted to, but simple index + 1 works usually)
    let currentRank = 1;
    const rankedUsers = rankings.map((r, index) => {
        // If same points as previous, keep same rank
        if (index > 0 && r.totalPoints === rankings[index - 1].totalPoints) {
            // keep currentRank
        } else {
            currentRank = index + 1;
        }

        return {
            rank: currentRank,
            userId: r._id as string,
            points: r.totalPoints as number
        };
    });

    // 3. Apply the "Top 9 + Me" logic
    let finalSelection: typeof rankedUsers = [];

    const userIndex = rankedUsers.findIndex(u => u.userId === requestingSlackUserId);

    if (userIndex === -1 && rankedUsers.length > 0) {
        // User hasn't played yet, they have 0 points.
        // We take up to 9 from top.
        finalSelection = rankedUsers.slice(0, 9);
        finalSelection.push({
            rank: rankedUsers.length + 1,
            userId: requestingSlackUserId,
            points: 0
        });
    } else if (userIndex < 10) {
        // User is naturally in Top 10. Just take Top 10.
        finalSelection = rankedUsers.slice(0, 10);
    } else {
        // User is ranked 11+, take top 9, and add user at the end
        finalSelection = rankedUsers.slice(0, 9);
        finalSelection.push(rankedUsers[userIndex]);
    }

    // 4. Fetch the SlackUser names from the database for the selected IDs
    const userIdsToFetch = finalSelection.map(u => u.userId);
    const slackUsers = await SlackUser.find({
        workspaceId,
        userId: { $in: userIdsToFetch }
    }).select("userId userName realName");

    const userMap = new Map();
    slackUsers.forEach(su => {
        userMap.set(su.userId, su.userName || su.realName || "Unknown User");
    });

    // 5. Final Assembly
    const leaderboard: LeaderboardUser[] = finalSelection.map(u => ({
        rank: u.rank,
        userId: u.userId,
        name: userMap.get(u.userId) || `<@${u.userId}>`, // fallback to slack mention
        points: u.points,
        isCurrentUser: u.userId === requestingSlackUserId
    }));

    return { leaderboard };
};
