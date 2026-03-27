import axios from "axios";
import mongoose from "mongoose";
import AppError from "../../../utils/appError";
import GameMessage from "../models/GameMessage.model";
import GameResponse from "../models/GameResponse.model";
import PracticeSession, { IPracticeSession } from "../models/PracticeSession.model";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import { buildPracticeQuestionMessage } from "./slackBlockBuilder";
import { generateNameOptions } from "./nameGenerator.service";
import { SlackUser } from "../types/slack.types";

const PRACTICE_SESSION_TTL_MS = 60 * 60 * 1000;

export interface PracticeQuestion {
    session: IPracticeSession;
    questionIndex: number;
    totalQuestions: number;
    sourceGameMessageId: string;
    messagePayload: ReturnType<typeof buildPracticeQuestionMessage>;
}

const getSessionExpiry = (): Date =>
    new Date(Date.now() + PRACTICE_SESSION_TTL_MS);

const getWorkspaceUsers = async (botToken: string): Promise<SlackUser[]> => {
    const response = await axios.get<{ ok: boolean; members: SlackUser[] }>(
        "https://slack.com/api/users.list",
        {
            headers: {
                Authorization: `Bearer ${botToken}`,
            },
        },
    );

    if (!response.data.ok) {
        throw new AppError("Failed to fetch users from Slack", 500);
    }

    return response.data.members.filter((user) => !user.is_bot && !user.deleted);
};

export const startPracticeSession = async (
    workspaceId: string,
    slackUserId: string,
): Promise<IPracticeSession | null> => {
    const answeredQuestionIds = await GameResponse.aggregate<{
        gameMessageId: mongoose.Types.ObjectId;
    }>([
        {
            $match: {
                responderSlackUserId: slackUserId,
            },
        },
        {
            $lookup: {
                from: "gamemessages",
                localField: "gameMessageId",
                foreignField: "_id",
                as: "message",
            },
        },
        {
            $unwind: "$message",
        },
        {
            $match: {
                "message.workspaceId": new mongoose.Types.ObjectId(workspaceId),
            },
        },
        {
            $sort: {
                respondedAt: 1,
                _id: 1,
            },
        },
        {
            $project: {
                _id: 0,
                gameMessageId: 1,
            },
        },
    ]);

    if (answeredQuestionIds.length === 0) {
        await PracticeSession.findOneAndDelete({
            workspaceId,
            slackUserId,
        });
        return null;
    }

    return PracticeSession.findOneAndUpdate(
        { workspaceId, slackUserId },
        {
            workspaceId,
            slackUserId,
            questionMessageIds: answeredQuestionIds.map(
                (item) => item.gameMessageId,
            ),
            currentIndex: 0,
            expiresAt: getSessionExpiry(),
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        },
    );
};

export const endPracticeSession = async (
    workspaceId: string,
    slackUserId: string,
): Promise<boolean> => {
    const deletedSession = await PracticeSession.findOneAndDelete({
        workspaceId,
        slackUserId,
    });

    return !!deletedSession;
};

export const getActivePracticeSession = async (
    workspaceId: string,
    slackUserId: string,
): Promise<IPracticeSession | null> => {
    return PracticeSession.findOne({
        workspaceId,
        slackUserId,
        expiresAt: { $gt: new Date() },
    });
};

export const advancePracticeSession = async (
    sessionId: string,
    workspaceId: string,
    slackUserId: string,
    expectedIndex: number,
): Promise<IPracticeSession | null> => {
    return PracticeSession.findOneAndUpdate(
        {
            _id: sessionId,
            workspaceId,
            slackUserId,
            currentIndex: expectedIndex,
            expiresAt: { $gt: new Date() },
        },
        {
            $set: {
                currentIndex: expectedIndex + 1,
                expiresAt: getSessionExpiry(),
            },
        },
        { new: true },
    );
};

export const getPracticeQuestion = async (
    session: IPracticeSession,
): Promise<PracticeQuestion | null> => {
    const workspace = await SlackWorkspace.findById(session.workspaceId);

    if (!workspace) {
        throw new AppError("Workspace not found", 404);
    }

    const workspaceUsers = await getWorkspaceUsers(workspace.botToken);
    let nextIndex = session.currentIndex;

    while (nextIndex < session.questionMessageIds.length) {
        const sourceMessage = await GameMessage.findById(
            session.questionMessageIds[nextIndex],
        ).lean();

        if (!sourceMessage) {
            nextIndex += 1;
            continue;
        }

        const subjectUser = workspaceUsers.find(
            (user) => user.id === sourceMessage.subjectSlackUserId,
        );

        if (!subjectUser) {
            nextIndex += 1;
            continue;
        }

        if (nextIndex !== session.currentIndex) {
            await PracticeSession.findByIdAndUpdate(session._id, {
                currentIndex: nextIndex,
                expiresAt: getSessionExpiry(),
            });
            session.currentIndex = nextIndex;
        }

        return {
            session,
            questionIndex: nextIndex,
            totalQuestions: session.questionMessageIds.length,
            sourceGameMessageId: sourceMessage._id.toString(),
            messagePayload: buildPracticeQuestionMessage(
                subjectUser,
                session._id.toString(),
                nextIndex,
                session.questionMessageIds.length,
                sourceMessage._id.toString(),
                generateNameOptions(subjectUser, workspaceUsers),
            ),
        };
    }

    await PracticeSession.findByIdAndDelete(session._id);
    return null;
};
