import mongoose, { Schema, Document } from "mongoose";

export interface IOnboardingToken {
    token: string;
    slackUserId: string;
    workspaceId: string;
    used: boolean;
    expiresAt: Date;
}

export interface IOnboardingTokenDocument extends IOnboardingToken, Document {
    createdAt: Date;
    updatedAt: Date;
}

const OnboardingTokenSchema = new Schema<IOnboardingTokenDocument>(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        slackUserId: {
            type: String,
            required: true,
        },
        workspaceId: {
            type: String,
            required: true,
        },
        used: {
            type: Boolean,
            default: false,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 }, // MongoDB TTL index
        },
    },
    {
        timestamps: true,
    }
);

// Index to quickly look up tokens by Slack user + workspace
OnboardingTokenSchema.index({ slackUserId: 1, workspaceId: 1 });

const OnboardingToken = mongoose.model<IOnboardingTokenDocument>(
    "OnboardingToken",
    OnboardingTokenSchema
);

export default OnboardingToken;
