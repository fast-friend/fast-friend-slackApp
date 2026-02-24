import mongoose, { Schema, Document } from "mongoose";

export interface IGameResponse extends Document {
    gameMessageId: mongoose.Types.ObjectId;
    responderSlackUserId: string;
    actionId: string;
    optionText: string;
    points: number;
    respondedAt: Date;
}

const GameResponseSchema = new Schema<IGameResponse>(
    {
        gameMessageId: {
            type: Schema.Types.ObjectId,
            ref: "GameMessage",
            required: true,
        },
        responderSlackUserId: {
            type: String,
            required: true,
        },
        actionId: {
            type: String,
            required: true,
            enum: ["correct", "incorrect"],
        },
        optionText: {
            type: String,
            required: true,
        },
        points: {
            type: Number,
            required: true,
        },
        respondedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure single response per user per message
GameResponseSchema.index(
    { gameMessageId: 1, responderSlackUserId: 1 },
    { unique: true }
);

const GameResponse = mongoose.model<IGameResponse>(
    "GameResponse",
    GameResponseSchema
);

export default GameResponse;
