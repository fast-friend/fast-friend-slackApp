import mongoose, { Schema } from "mongoose";
import {
  IOrganizationMemberDocument,
  OrganizationRole,
} from "../types/organization.types";

const OrganizationMemberSchema = new Schema<IOrganizationMemberDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: [true, "User ID is required"],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    role: {
      type: String,
      enum: Object.values(OrganizationRole),
      required: [true, "Role is required"],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: one user can have one role per organization
OrganizationMemberSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true },
);

// Index for querying organization members
OrganizationMemberSchema.index({ organizationId: 1, isActive: 1 });

// Index for querying user's organizations
OrganizationMemberSchema.index({ userId: 1, isActive: 1 });

const OrganizationMember = mongoose.model<IOrganizationMemberDocument>(
  "OrganizationMember",
  OrganizationMemberSchema,
);

export default OrganizationMember;
