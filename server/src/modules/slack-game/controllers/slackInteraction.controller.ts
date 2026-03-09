import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import GameMessage from "../models/GameMessage.model";
import GameResponse from "../models/GameResponse.model";
import { calculatePoints, getOptionText } from "../services/scoring.service";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import { getWorkspaceLeaderboard, getUserXP } from "../services/leaderboard.service";

interface SlackInteractionPayload {
    type: string;
    user: {
        id: string;
        username: string;
    };
    actions: Array<{
        action_id: string;
        value?: string;
    }>;
    message: {
        metadata?: {
            event_type: string;
            event_payload: {
                gameMessageId: string;
            };
        };
    };
    response_url: string; // URL to send follow-up messages
    trigger_id?: string; // Used to open modals
    team?: {
        id: string;
        domain: string;
    };
}

/**
 * @desc    Handle Slack button interactions
 * @route   POST /api/v1/slack-game/interactions
 * @access  Public (verified by Slack signature)
 */
export const handleInteraction = asyncHandler(
    async (req: Request, res: Response) => {
        // Parse payload (Slack sends it as URL-encoded form data)
        const payload: SlackInteractionPayload = JSON.parse(req.body.payload);

        // Extract data
        const responderSlackUserId = payload.user.id;
        const actionIdRaw = payload.actions[0]?.action_id; // "correct_0" or "incorrect_1"
        const actionId = actionIdRaw?.startsWith("correct") ? "correct" : "incorrect";
        const selectedName = payload.actions[0]?.value || "Unknown"; // The name they clicked
        const gameMessageId = payload.message?.metadata?.event_payload?.gameMessageId;
        const responseUrl = payload.response_url;
        const triggerId = payload.trigger_id;

        // --- APPHOME INTERACTION INTERCEPT ---
        if (actionIdRaw === "view_leaderboard" || actionIdRaw === "check_xp") {
            // Acknowledge the interaction immediately
            res.status(200).send();

            const teamId = payload.team?.id;

            // Fire off the modal creation asynchronously
            handleAppHomeInteractions(actionIdRaw, responderSlackUserId, teamId, triggerId)
                .catch(err => console.error("Error opening App Home modal:", err.message));
            return;
        }

        if (!gameMessageId) {
            // This is a non-game interaction (e.g. onboarding DM button click).
            // Slack requires a 200 response for ALL interaction callbacks — just acknowledge it.
            res.status(200).send();
            return;
        }

        if (!actionId) {
            throw new AppError("Invalid interaction payload", 400);
        }

        // Check if user already responded (idempotency)
        const existingResponse = await GameResponse.findOne({
            gameMessageId,
            responderSlackUserId,
        });

        if (existingResponse) {
            // Already responded - send message and return
            res.status(200).send();

            await axios.post(responseUrl, {
                response_type: "ephemeral",
                text: "You already responded to this question!"
            }).catch(error => {
                console.error("Error sending duplicate message:", error.message);
            });

            return;
        }

        // Calculate points
        const points = calculatePoints(actionId);
        const optionText = getOptionText(actionId, selectedName);

        // Save response
        await GameResponse.create({
            gameMessageId,
            responderSlackUserId,
            actionId,
            optionText,
            points,
        });

        // Update message as responded
        await GameMessage.findByIdAndUpdate(gameMessageId, {
            responded: true,
        });

        // Respond immediately to Slack (must be < 3 seconds)
        res.status(200).send();

        // Send feedback message asynchronously using response_url
        const responseMessage = points > 0
            ? `✅ *Correct!* You earned *${points} points*.\n\nYou selected: *${selectedName}*`
            : `❌ *Wrong answer!* Better luck next time.\n\nYou selected: *${selectedName}*`;

        // Send follow-up message (this happens after the response)
        await axios.post(responseUrl, {
            response_type: "ephemeral",
            replace_original: false,
            text: responseMessage,
        }).catch(error => {
            console.error("Error sending feedback message:", error.message);
        });
    }
);

/**
 * Handle App Home interactions for Leaderboard and XP Modals
 */
const handleAppHomeInteractions = async (actionId: string, slackUserId: string, teamId: string | undefined, triggerId?: string) => {
    if (!triggerId) return;

    if (!teamId) {
        console.error("Team ID was not provided in the interaction payload.");
        return;
    }

    // Fetch the explicit workspace this action originated from
    const workspace = await SlackWorkspace.findOne({ teamId });

    if (!workspace || !workspace.botToken) {
        console.error("Workspace or botToken not found for App Home interaction.");
        return;
    }

    const workspaceStr = workspace._id.toString();
    const token = workspace.botToken;

    let viewPayload: any;

    if (actionId === "view_leaderboard") {
        const { leaderboard } = await getWorkspaceLeaderboard(workspaceStr, slackUserId);

        let leaderboardBlocks: any[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🏆 Workspace Leaderboard",
                    emoji: true
                }
            },
            {
                type: "divider"
            }
        ];

        if (leaderboard.length === 0) {
            leaderboardBlocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "No games have been played yet. Be the first to earn points!"
                }
            });
        } else {
            leaderboard.forEach(user => {
                const isMe = user.isCurrentUser;
                leaderboardBlocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `${isMe ? "*" : ""}${user.rank}. ${user.name} - ${user.points} XP${isMe ? "*" : ""}`
                    }
                });
            });
        }

        viewPayload = {
            type: "modal",
            title: {
                type: "plain_text",
                text: "Leaderboard"
            },
            close: {
                type: "plain_text",
                text: "Close"
            },
            blocks: leaderboardBlocks
        };
    } else if (actionId === "check_xp") {
        const xp = await getUserXP(workspaceStr, slackUserId);

        viewPayload = {
            type: "modal",
            title: {
                type: "plain_text",
                text: "My XP"
            },
            close: {
                type: "plain_text",
                text: "Close"
            },
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "⭐ Your Current Experience",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `You currently have *${xp} XP*!\n\nKeep answering correctly to earn more points and climb the leaderboard.`
                    }
                }
            ]
        };
    }

    if (viewPayload) {
        try {
            await axios.post(
                "https://slack.com/api/views.open",
                {
                    trigger_id: triggerId,
                    view: viewPayload
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );
        } catch (error: any) {
            console.error("Failed to open modal:", error.response?.data || error.message);
        }
    }
};
