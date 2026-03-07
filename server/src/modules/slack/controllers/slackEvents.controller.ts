import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import SlackWorkspace from "../models/slackWorkspace.model";

/**
 * @desc    Handle incoming Events from Slack Subscriptions
 * @route   POST /api/v1/slack/events
 * @access  Public (Verified by Slack Signature via middleware)
 */
export const handleSlackEvent = asyncHandler(
    async (req: Request, res: Response) => {
        const { type } = req.body;

        // 1. Initial URL Verification Handshake
        if (type === "url_verification") {
            const { challenge } = req.body;
            res.status(200).send({ challenge });
            return;
        }

        // 2. Respond 200 OK immediately for all other events (Slack requirement)
        res.status(200).send();

        // 3. Process the actual Event Asynchronously
        if (type === "event_callback") {
            const eventPayload = req.body.event;

            if (eventPayload.type === "app_home_opened") {
                await handleAppHomeOpened(eventPayload, req.body.api_app_id);
            }
        }
    }
);

/**
 * Handle when a user opens the Home tab of the Slack App
 */
const handleAppHomeOpened = async (eventPayload: any, apiAppId: string) => {
    const slackUserId = eventPayload.user;
    console.log("[AppHome] Triggered for user:", slackUserId);

    // We can fetch ANY workspace connected, or use the eventPayload if available
    let workspace = await SlackWorkspace.findOne();

    if (!workspace || !workspace.botToken) {
        console.error("[AppHome] ERROR: No workspace or botToken found.", { hasWorkspace: !!workspace, hasBotToken: !!workspace?.botToken });
        return;
    }

    console.log("[AppHome] Found workspace, calling views.publish...");
    // Publish the App Home view using Slack's views.publish API
    try {
        const publishRes = await axios.post(
            "https://slack.com/api/views.publish",
            {
                user_id: slackUserId,
                view: {
                    type: "home",
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: "Welcome to Fast Friends! 👋",
                                emoji: true
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "This is your game hub. From here you can check your current standing or see how much XP you've earned from playing."
                            }
                        },
                        {
                            type: "divider"
                        },
                        {
                            type: "actions",
                            elements: [
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "🏆 View Leaderboard",
                                        emoji: true
                                    },
                                    style: "primary",
                                    value: "view_leaderboard",
                                    action_id: "view_leaderboard"
                                },
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "⭐ Check My XP",
                                        emoji: true
                                    },
                                    value: "check_xp",
                                    action_id: "check_xp"
                                }
                            ]
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${workspace.botToken}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log("[AppHome] views.publish response:", JSON.stringify(publishRes.data));
    } catch (error: any) {
        console.error("Failed to publish app home view:", error.response?.data || error.message);
    }
};
