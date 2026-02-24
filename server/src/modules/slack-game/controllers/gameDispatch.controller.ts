import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import GameSession from "../models/GameSession.model";
import GameMessage from "../models/GameMessage.model";
import { selectDailyPairs } from "../services/userSelection.service";
import { buildGameMessage } from "../services/slackBlockBuilder";
import { SlackUser } from "../types/slack.types";

interface ISlackUsersListResponse {
    ok: boolean;
    members: SlackUser[];
}

interface ISlackConversationOpenResponse {
    ok: boolean;
    channel: {
        id: string;
    };
    error?: string;
}

interface ISlackMessageResponse {
    ok: boolean;
    channel: string;
    ts: string;
    error?: string;
}

/**
 * @desc    Manually trigger game for a workspace
 * @route   POST /api/v1/slack-game/trigger
 * @access  Private (SUPERADMIN only)
 */
export const triggerGame = asyncHandler(
    async (req: Request, res: Response) => {
        const { workspaceId } = req.body;

        if (!workspaceId) {
            throw new AppError("Workspace ID is required", 400);
        }

        // Find workspace
        const workspace = await SlackWorkspace.findById(workspaceId);
        if (!workspace) {
            throw new AppError("Workspace not found", 404);
        }

        // Get current date
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        // Check if game already exists for today
        const existingSession = await GameSession.findOne({
            workspaceId,
            date: today,
        });

        if (existingSession) {
            throw new AppError("Game already sent for today", 400);
        }

        // Fetch workspace users from Slack
        const usersResponse = await axios.get<ISlackUsersListResponse>(
            "https://slack.com/api/users.list",
            {
                headers: {
                    Authorization: `Bearer ${workspace.botToken}`,
                },
            }
        );

        if (!usersResponse.data.ok) {
            throw new AppError("Failed to fetch users from Slack", 500);
        }

        const slackUsers = usersResponse.data.members;

        // Select daily pairs
        const pairs = await selectDailyPairs(workspaceId, slackUsers);

        if (pairs.length === 0) {
            throw new AppError("No valid pairs found for today", 400);
        }

        // Create game session
        const gameSession = await GameSession.create({
            workspaceId,
            date: today,
            status: "scheduled",
        });

        let sentCount = 0;
        const errors: Array<{ userId: string; error: string }> = [];

        // Send messages to each recipient
        for (const pair of pairs) {
            try {
                // Open DM conversation
                const dmResponse =
                    await axios.post<ISlackConversationOpenResponse>(
                        "https://slack.com/api/conversations.open",
                        { users: pair.recipient.id },
                        {
                            headers: {
                                Authorization: `Bearer ${workspace.botToken}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                if (!dmResponse.data.ok) {
                    throw new Error(
                        `Failed to open DM: ${dmResponse.data.error}`
                    );
                }

                const channelId = dmResponse.data.channel.id;

                // Create temporary game message to get ID
                const gameMessage = await GameMessage.create({
                    gameSessionId: gameSession._id,
                    workspaceId,
                    recipientSlackUserId: pair.recipient.id,
                    subjectSlackUserId: pair.subject.id,
                    slackChannelId: channelId,
                });

                // Generate 4 name options (1 correct + 3 random)
                const { generateNameOptions } = await import(
                    "../services/nameGenerator.service"
                );
                const nameOptions = generateNameOptions(
                    pair.subject,
                    slackUsers
                );

                // Build message blocks
                const messagePayload = buildGameMessage(
                    pair.subject,
                    gameMessage._id.toString(),
                    nameOptions
                );

                // Send message
                const messageResponse = await axios.post<ISlackMessageResponse>(
                    "https://slack.com/api/chat.postMessage",
                    {
                        channel: channelId,
                        ...messagePayload,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${workspace.botToken}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (!messageResponse.data.ok) {
                    throw new Error(
                        `Failed to send message: ${messageResponse.data.error}`
                    );
                }

                // Update game message with timestamp
                await GameMessage.findByIdAndUpdate(gameMessage._id, {
                    slackMessageTs: messageResponse.data.ts,
                });

                sentCount++;
            } catch (error: any) {
                errors.push({
                    userId: pair.recipient.id,
                    error: error.message,
                });
                console.error(
                    `Error sending message to ${pair.recipient.id}:`,
                    error
                );
            }
        }

        // Update session status
        await GameSession.findByIdAndUpdate(gameSession._id, {
            status: sentCount > 0 ? "sent" : "scheduled",
        });

        res.status(200).json({
            success: true,
            message: "Game triggered successfully",
            data: {
                sessionId: gameSession._id,
                totalPairs: pairs.length,
                sentCount,
                errors: errors.length > 0 ? errors : undefined,
            },
        });
    }
);
