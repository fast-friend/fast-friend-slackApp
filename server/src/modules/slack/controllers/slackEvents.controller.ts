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
                await handleAppHomeOpened(eventPayload, req.body.api_app_id, req.body.team_id);
            }
        }
    }
);

/**
 * Handle when a user opens the Home tab of the Slack App
 */
const handleAppHomeOpened = async (eventPayload: any, apiAppId: string, teamId: string) => {
    const slackUserId = eventPayload.user;
    console.log(`[AppHome] Triggered for user: ${slackUserId} in team: ${teamId}`);

    // Fetch the specific workspace that this event belongs to
    let workspace = await SlackWorkspace.findOne({ teamId });

    if (!workspace || !workspace.botToken) {
        console.error(`[AppHome] ERROR: No workspace or botToken found for team ${teamId}.`, { hasWorkspace: !!workspace });
        return;
    }

    console.log(`[AppHome] Found workspace, calling views.publish with token starting with: ${workspace.botToken.substring(0, 5)}...`);
    // Publish the App Home view using Slack's views.publish API
    try {
        const payload = {
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
        };

        const publishRes = await axios.post(
            "https://slack.com/api/views.publish",
            JSON.stringify(payload),
            {
                headers: {
                    Authorization: `Bearer ${workspace.botToken}`,
                    "Content-Type": "application/json; charset=utf-8"
                }
            }
        );
        console.log("[AppHome] views.publish response:", JSON.stringify(publishRes.data));
    } catch (error: any) {
        console.error("Failed to publish app home view:", error.response?.data || error.message);
    }
};
