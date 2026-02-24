import mongoose, { Schema, Document } from "mongoose";
import { ISlackUser } from "../types/groups.types";

export interface ISlackUserDocument extends ISlackUser, Document {
    createdAt: Date;
    updatedAt: Date;
}

const SlackUserSchema = new Schema<ISlackUserDocument>(
    {
        userId: {
            type: String,
            required: [true, "Slack user ID is required"],
            trim: true,
        },
        workspaceId: {
            type: String,
            required: [true, "Workspace ID is required"],
            ref: "SlackWorkspace",
        },
        userName: {
            type: String,
            required: [true, "User name is required"],
            trim: true,
        },
        realName: {
            type: String,
            required: [true, "Real name is required"],
            trim: true,
        },
        displayName: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        avatarUrl: {
            type: String,
            trim: true,
        },
        // Extended Slack profile fields
        jobTitle: {
            type: String,
            trim: true,
        },
        statusText: {
            type: String,
            trim: true,
        },
        statusEmoji: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        pronouns: {
            type: String,
            trim: true,
        },
        timezone: {
            type: String,
            trim: true,
        },
        tzLabel: {
            type: String,
            trim: true,
        },
        tzOffset: {
            type: Number,
        },
        isOwner: {
            type: Boolean,
            default: false,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        csvImported: {
            type: Boolean,
            default: false,
        },
        groupsJoined: {
            type: [String],
            default: [],
            ref: "Group",
        },
        messagesSent: {
            type: Number,
            default: 0,
            min: 0,
        },
        responsesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastActive: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Onboarding profile fields
        departments: {
            type: [String],
            default: [],
        },
        roles: {
            type: [String],
            default: [],
        },
        hobbies: {
            type: [String],
            default: [],
        },
        birthdate: {
            type: Date,
        },
        photoUrl: {
            type: String,
            trim: true,
        },
        onboardingCompleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index for userId and workspaceId
SlackUserSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

// Index for querying by workspace
SlackUserSchema.index({ workspaceId: 1, isActive: 1 });

const SlackUser = mongoose.model<ISlackUserDocument>(
    "SlackUser",
    SlackUserSchema
);

export default SlackUser;
