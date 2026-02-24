import { SlackUser } from "../types/slack.types";

interface GameMessageBlock {
    blocks: Array<{
        type: string;
        text?: {
            type: string;
            text: string;
        };
        image_url?: string;
        alt_text?: string;
        elements?: Array<{
            type: string;
            text: {
                type: string;
                text: string;
                emoji?: boolean;
            };
            action_id: string;
            value?: string;
        }>;
    }>;
    metadata: {
        event_type: string;
        event_payload: {
            gameMessageId: string;
        };
    };
}

/**
 * Build Slack message with photo and 4 name options
 * @param subject - The user whose photo is shown
 * @param gameMessageId - ID to track this message
 * @param allUsers - All workspace users for generating wrong options
 */
export const buildGameMessage = (
    subject: SlackUser,
    gameMessageId: string,
    nameOptions: string[]
): GameMessageBlock => {
    const imageUrl = subject.profile.image_512 || subject.profile.image_192;
    const correctName = subject.profile.real_name || "Unknown";

    return {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Who is this teammate?*\n\nSelect the correct name below:",
                },
            },
            {
                type: "image",
                image_url: imageUrl,
                alt_text: "Teammate photo",
            },
            {
                type: "actions",
                elements: nameOptions.map((name, index) => ({
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: name,
                        emoji: true,
                    },
                    action_id: `${name === correctName ? "correct" : "incorrect"}_${index}`,
                    value: name,
                })),
            },
        ],
        metadata: {
            event_type: "game_response",
            event_payload: {
                gameMessageId,
            },
        },
    };
};
