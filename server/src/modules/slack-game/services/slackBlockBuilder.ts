import { SlackUser } from "../types/slack.types";

interface SlackButtonElement {
    type: string;
    text: {
        type: string;
        text: string;
        emoji?: boolean;
    };
    action_id: string;
    value?: string;
}

interface SlackMessageBlock {
    type: string;
    text?: {
        type: string;
        text: string;
    };
    image_url?: string;
    alt_text?: string;
    elements?: SlackButtonElement[];
}

interface SlackInteractiveMessage {
    blocks: SlackMessageBlock[];
    metadata: {
        event_type: string;
        event_payload: Record<string, string>;
    };
}

interface MessageMetadataConfig {
    eventType: string;
    eventPayload: Record<string, string>;
}

const buildInteractiveMessage = (
    subject: SlackUser,
    nameOptions: string[],
    metadata: MessageMetadataConfig,
    promptText: string,
): SlackInteractiveMessage => {
    const imageUrl = subject.profile.image_512 || subject.profile.image_192;
    const correctName = subject.profile.real_name || "Unknown";

    return {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: promptText,
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
            event_type: metadata.eventType,
            event_payload: metadata.eventPayload,
        },
    };
};

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
): SlackInteractiveMessage =>
    buildInteractiveMessage(
        subject,
        nameOptions,
        {
            eventType: "game_response",
            eventPayload: {
                gameMessageId,
            },
        },
        "*Who is this teammate?*\n\nSelect the correct name below:",
    );

export const buildPracticeQuestionMessage = (
    subject: SlackUser,
    practiceSessionId: string,
    questionIndex: number,
    totalQuestions: number,
    sourceGameMessageId: string,
    nameOptions: string[],
): SlackInteractiveMessage =>
    buildInteractiveMessage(
        subject,
        nameOptions,
        {
            eventType: "practice_response",
            eventPayload: {
                practiceSessionId,
                questionIndex: questionIndex.toString(),
                sourceGameMessageId,
            },
        },
        `*Practice mode*\nQuestion ${questionIndex + 1} of ${totalQuestions}. No XP is awarded.\n\n*Who is this teammate?*`,
    );
