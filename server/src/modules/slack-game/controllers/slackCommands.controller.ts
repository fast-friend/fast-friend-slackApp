import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import GameSession from "../models/GameSession.model";
import GameMessage from "../models/GameMessage.model";
import Game from "../../groups/models/Game.model";
import { getWorkspaceLeaderboard, getUserXP } from "../services/leaderboard.service";
import { buildGameMessage } from "../services/slackBlockBuilder";
import { selectDailyPairs } from "../services/userSelection.service";
import { generateNameOptions } from "../services/nameGenerator.service";
import {
    getPracticeQuestion,
    startPracticeSession,
    endPracticeSession,
} from "../services/practice.service";
import { SlackUser } from "../types/slack.types";

interface SlackCommandPayload {
    token: string;
    team_id: string;
    team_domain: string;
    channel_id: string;
    channel_name: string;
    user_id: string;
    user_name: string;
    command: string;     // e.g., "/help"
    text: string;        // text after the command
    api_app_id: string;
    is_enterprise_install: string;
    response_url: string;
    trigger_id: string;
}

interface ISlackUsersListResponse {
    ok: boolean;
    members: SlackUser[];
}

const getFieldValue = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

/**
 * @desc    Handle Slack Slash Commands
 * @route   POST /api/v1/slack-game/commands
 * @access  Public (verified by Slack signature)
 */
export const handleCommand = asyncHandler(
    async (req: Request, res: Response) => {
        const payload = {
            token: getFieldValue(req.body.token),
            team_id: getFieldValue(req.body.team_id),
            team_domain: getFieldValue(req.body.team_domain),
            channel_id: getFieldValue(req.body.channel_id),
            channel_name: getFieldValue(req.body.channel_name),
            user_id: getFieldValue(req.body.user_id),
            user_name: getFieldValue(req.body.user_name),
            command: getFieldValue(req.body.command),
            text: getFieldValue(req.body.text),
            api_app_id: getFieldValue(req.body.api_app_id),
            is_enterprise_install: getFieldValue(req.body.is_enterprise_install),
            response_url: getFieldValue(req.body.response_url),
            trigger_id: getFieldValue(req.body.trigger_id),
        } satisfies Partial<SlackCommandPayload>;

        const commandRaw = payload.command?.toLowerCase().trim();
        // Allow for custom command names setup in Slack: e.g. /fast-help, /fast-leaderboard. We just check the suffix.
        const command = commandRaw?.split("-").pop() || commandRaw;
        
        const slackUserId = payload.user_id;
        const teamId = payload.team_id;
        const responseUrl = payload.response_url;

        if (!teamId || !slackUserId || !responseUrl) {
            throw new AppError("Invalid command payload", 400);
        }

        // Acknowledge the command immediately to prevent Slack timeout exception
        res.status(200).send();

        try {
            const workspace = await SlackWorkspace.findOne({ teamId });
            if (!workspace) {
                await sendEphemeralReply(responseUrl, "❌ Workspace not found or app not installed correctly.");
                return;
            }

            const workspaceStr = workspace._id.toString();

            switch (command) {
                case "/help":
                case "help":
                    await handleHelpCommand(responseUrl);
                    break;
                case "/leaderboard":
                case "leaderboard":
                    await handleLeaderboardCommand(responseUrl, workspaceStr, slackUserId);
                    break;
                case "/checkxp":
                case "checkxp":
                case "/xp":
                case "xp":
                    await handleCheckXpCommand(responseUrl, workspaceStr, slackUserId);
                    break;
                case "/start":
                case "start":
                    await handleStartCommand(responseUrl, workspace, slackUserId);
                    break;
                case "/startpractice":
                case "startpractice":
                    await handleStartPracticeCommand(responseUrl, workspaceStr, slackUserId);
                    break;
                case "/endpractice":
                case "endpractice":
                    await handleEndPracticeCommand(responseUrl, workspaceStr, slackUserId);
                    break;
                default:
                    await sendEphemeralReply(responseUrl, "❓ Unknown command. Type `/help` to see available commands.");
                    break;
            }
        } catch (error: any) {
            console.error(`Error handling slack command [${commandRaw}]:`, error.message);
            await sendEphemeralReply(responseUrl, "⚠️ An error occurred while processing your command. Please try again later.");
        }
    }
);

// --- Command Handlers ---

const handleHelpCommand = async (responseUrl: string) => {
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🛠️ Available Commands",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "*`/start`* - Brings up today's scheduled game if you have one pending.\n*`/leaderboard`* - Shows the top players in your workspace and your rank.\n*`/checkxp`* - Shows your current experience points (XP).\n*`/startpractice`* - Replays your previously answered questions in practice mode.\n*`/endpractice`* - Ends your active practice session."
            }
        }
    ];

    await axios.post(responseUrl, {
        response_type: "ephemeral",
        blocks
    });
};

const handleLeaderboardCommand = async (responseUrl: string, workspaceId: string, slackUserId: string) => {
    const { leaderboard } = await getWorkspaceLeaderboard(workspaceId, slackUserId);

    let blocks: any[] = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🏆 Workspace Leaderboard",
                emoji: true
            }
        },
        { type: "divider" }
    ];

    if (leaderboard.length === 0) {
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: "No games have been played yet. Be the first to earn points!"
            }
        });
    } else {
        leaderboard.forEach(user => {
            const isMe = user.isCurrentUser;
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${isMe ? "*" : ""}${user.rank}. ${user.name} - ${user.points} XP${isMe ? "*" : ""}`
                }
            });
        });
    }

    await axios.post(responseUrl, {
        response_type: "ephemeral",
        blocks
    });
};

const handleCheckXpCommand = async (responseUrl: string, workspaceId: string, slackUserId: string) => {
    const xp = await getUserXP(workspaceId, slackUserId);

    const blocks = [
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
    ];

    await axios.post(responseUrl, {
        response_type: "ephemeral",
        blocks
    });
};

const handleStartCommand = async (responseUrl: string, workspace: any, slackUserId: string) => {
    const today = new Date().toISOString().split("T")[0];

    // Check if there is a session for today for this workspace
    const session = await GameSession.findOne({
        workspaceId: workspace._id,
        date: today
    });

    if (!session) {
        await sendEphemeralReply(responseUrl, "📅 There are no games scheduled for today!");
        return;
    }

    // Check if user has an attached message for this session
    const gameMessage = await GameMessage.findOne({
        gameSessionId: session._id,
        recipientSlackUserId: slackUserId
    });

    if (gameMessage) {
        if (gameMessage.responded) {
            await sendEphemeralReply(responseUrl, "✅ You have already played all scheduled games for today!");
            return;
        }

        // They have a pending game. Regenerate it and send it right back here!
        const usersResponse = await axios.get<ISlackUsersListResponse>("https://slack.com/api/users.list", {
            headers: { Authorization: `Bearer ${workspace.botToken}` }
        });

        if (!usersResponse.data.ok) {
            await sendEphemeralReply(responseUrl, "❌ Cannot fetch users to recreate your game block.");
            return;
        }

        const allUsers = usersResponse.data.members;
        const subjectUser = allUsers.find((u: any) => u.id === gameMessage.subjectSlackUserId);

        if (!subjectUser) {
            await sendEphemeralReply(responseUrl, "❌ Could not safely load your game.");
            return;
        }

        const nameOptions = generateNameOptions(subjectUser, allUsers);
        const messagePayload = buildGameMessage(subjectUser, gameMessage._id.toString(), nameOptions);

        await axios.post(responseUrl, {
            response_type: "ephemeral",
            // Use block kit from payload
            ...messagePayload
        });
        return;
    }

    // No game message exists for this user in this session.
    // That means they were omitted (maybe odd grouping, or joined channel late)
    // Let's create one for them dynamically if there is a game configured.
    const game = await Game.findById(session.gameId).populate("groupId");
    
    if (!game) {
        await sendEphemeralReply(responseUrl, "❌ Could not find the game details.");
        return;
    }

    const usersResponse = await axios.get<ISlackUsersListResponse>("https://slack.com/api/users.list", {
        headers: { Authorization: `Bearer ${workspace.botToken}` }
    });

    if (!usersResponse.data.ok) {
        await sendEphemeralReply(responseUrl, "❌ Cannot fetch game members.");
        return;
    }

    const allUsers = usersResponse.data.members;
    const recipientUser = allUsers.find((u: any) => u.id === slackUserId);

    if (!recipientUser) {
        await sendEphemeralReply(responseUrl, "❌ You don't appear to be active in this workspace.");
        return;
    }

    // Use selectDailyPairs just to find a subject for THIS user
    // We pass all users but we'll override the function to just return one if we mimic the behavior
    // Wait; selectDailyPairs iterates over ALL users. If we pass `[recipientUser]` it will have 0 other users to pick from.
    // Instead we do a quick single-recipient subject picking logic right here.
    
    const groupMemberIds = (game.groupId as any).members || [];
    const validSubjects = allUsers.filter(u => 
        groupMemberIds.includes(u.id) &&
        !u.is_bot &&
        !u.deleted &&
        u.id !== "USLACKBOT" &&
        u.id !== slackUserId
    );

    // Filter out previously seen users for this session
    const seenMessages = await GameMessage.find({
      recipientSlackUserId: slackUserId,
      gameSessionId: session._id
    }).select("subjectSlackUserId");
    
    const seenSubjectIds = new Set(seenMessages.map(msg => msg.subjectSlackUserId));
    
    const availableSubjects = validSubjects.filter(u => !seenSubjectIds.has(u.id));

    if (availableSubjects.length === 0) {
        await sendEphemeralReply(responseUrl, "✅ You have seen everyone in the group today! Check back tomorrow.");
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableSubjects.length);
    const subjectUser = availableSubjects[randomIndex];

    // Create the GameMessage
    const newGameMessage = await GameMessage.create({
        gameSessionId: session._id,
        workspaceId: workspace._id,
        recipientSlackUserId: slackUserId,
        subjectSlackUserId: subjectUser.id,
        slackChannelId: "unknown-slash-command", // Not a real DM channel usually
    });

    const nameOptions = generateNameOptions(subjectUser, allUsers);
    const messagePayload = buildGameMessage(subjectUser, newGameMessage._id.toString(), nameOptions);

    await axios.post(responseUrl, {
        response_type: "ephemeral",
        ...messagePayload
    });
};

const handleStartPracticeCommand = async (
    responseUrl: string,
    workspaceId: string,
    slackUserId: string,
) => {
    const session = await startPracticeSession(workspaceId, slackUserId);

    if (!session) {
        await sendEphemeralReply(
            responseUrl,
            "📭 No previously answered questions were found for practice mode.",
        );
        return;
    }

    const practiceQuestion = await getPracticeQuestion(session);

    if (!practiceQuestion) {
        await sendEphemeralReply(
            responseUrl,
            "📭 No valid practice questions are available right now.",
        );
        return;
    }

    await axios.post(responseUrl, {
        response_type: "ephemeral",
        ...practiceQuestion.messagePayload,
    });
};

const handleEndPracticeCommand = async (
    responseUrl: string,
    workspaceId: string,
    slackUserId: string,
) => {
    const didEndSession = await endPracticeSession(workspaceId, slackUserId);

    await sendEphemeralReply(
        responseUrl,
        didEndSession
            ? "🛑 Practice mode ended."
            : "ℹ️ You do not have an active practice session.",
    );
};

const sendEphemeralReply = async (responseUrl: string, text: string) => {
    return axios.post(responseUrl, {
        response_type: "ephemeral",
        text
    }).catch(error => console.error("Error sending simple ephemeral reply:", error.message));
};
