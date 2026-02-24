import mongoose, { Schema, Document } from "mongoose";
import { IGroup } from "../types/groups.types";

export interface IGroupDocument extends IGroup, Document {
    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new Schema<IGroupDocument>(
    {
        groupName: {
            type: String,
            required: [true, "Group name is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        workspaceId: {
            type: String,
            required: [true, "Workspace ID is required"],
            ref: "SlackWorkspace",
        },
        members: {
            type: [String],
            default: [],
        },
        createdBy: {
            type: String,
            required: [true, "Creator ID is required"],
            ref: "AuthUser",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index for groupName and workspaceId
GroupSchema.index({ workspaceId: 1, groupName: 1 }, { unique: true });

// Index for querying active groups by workspace
GroupSchema.index({ workspaceId: 1, isActive: 1 });

const Group = mongoose.model<IGroupDocument>("Group", GroupSchema);

export default Group;
