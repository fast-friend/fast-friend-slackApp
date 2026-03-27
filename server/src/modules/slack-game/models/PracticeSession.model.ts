import mongoose, { Schema, Document } from "mongoose";

export interface IPracticeSession extends Document {
    workspaceId: mongoose.Types.ObjectId;
    slackUserId: string;
    questionMessageIds: mongoose.Types.ObjectId[];
    currentIndex: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PracticeSessionSchema = new Schema<IPracticeSession>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "SlackWorkspace",
            required: true,
        },
        slackUserId: {
            type: String,
            required: true,
            trim: true,
        },
        questionMessageIds: {
            type: [Schema.Types.ObjectId],
            ref: "GameMessage",
            required: true,
            default: [],
        },
        currentIndex: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 },
        },
    },
    {
        timestamps: true,
    },
);

PracticeSessionSchema.index({ workspaceId: 1, slackUserId: 1 }, { unique: true });

const PracticeSession = mongoose.model<IPracticeSession>(
    "PracticeSession",
    PracticeSessionSchema,
);

export default PracticeSession;
