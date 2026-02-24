import mongoose, { Schema, Document } from "mongoose";

export interface ISlackWorkspace extends Document {
  organizationId: mongoose.Types.ObjectId;
  teamId: string;
  teamName: string;
  botUserId: string;
  botToken: string;
  connectedBy: mongoose.Types.ObjectId;
  connectedAt: Date;
}

const SlackWorkspaceSchema = new Schema<ISlackWorkspace>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    teamId: {
      type: String,
      required: true,
    },
    teamName: {
      type: String,
      required: true,
    },
    botUserId: {
      type: String,
      required: true,
    },
    botToken: {
      type: String,
      required: true,
      // TODO: Encrypt this token before storing
    },
    connectedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: one organization can't connect the same workspace twice
SlackWorkspaceSchema.index({ organizationId: 1, teamId: 1 }, { unique: true });
SlackWorkspaceSchema.index({ organizationId: 1 });

const SlackWorkspace = mongoose.model<ISlackWorkspace>(
  "SlackWorkspace",
  SlackWorkspaceSchema,
);

export default SlackWorkspace;
