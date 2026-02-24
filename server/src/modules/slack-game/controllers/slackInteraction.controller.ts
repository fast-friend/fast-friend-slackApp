import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import GameMessage from "../models/GameMessage.model";
import GameResponse from "../models/GameResponse.model";
import { calculatePoints, getOptionText } from "../services/scoring.service";

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
        const gameMessageId = payload.message.metadata?.event_payload.gameMessageId;
        const responseUrl = payload.response_url;

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
