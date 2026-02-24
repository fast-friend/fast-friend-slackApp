import mongoose, { Schema, Document } from "mongoose";

export interface IGameMessage extends Document {
    gameSessionId: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    recipientSlackUserId: string;
    subjectSlackUserId: string;
    slackMessageTs?: string; // Optional until message is sent
    slackChannelId: string;
    sentAt: Date;
    responded: boolean;
}

const GameMessageSchema = new Schema<IGameMessage>(
    {
        gameSessionId: {
            type: Schema.Types.ObjectId,
            ref: "GameSession",
            required: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "SlackWorkspace",
            required: true,
        },
        recipientSlackUserId: {
            type: String,
            required: true,
        },
        subjectSlackUserId: {
            type: String,
            required: true,
        },
        slackMessageTs: {
            type: String,
            required: false, // Will be updated after message is sent
        },
        slackChannelId: {
            type: String,
            required: true,
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        responded: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent showing same subject to same recipient twice within the same game session
GameMessageSchema.index(
    { gameSessionId: 1, recipientSlackUserId: 1, subjectSlackUserId: 1 },
    { unique: true }
);

// Query optimization
GameMessageSchema.index({ gameSessionId: 1 });

const GameMessage = mongoose.model<IGameMessage>(
    "GameMessage",
    GameMessageSchema
);

export default GameMessage;
