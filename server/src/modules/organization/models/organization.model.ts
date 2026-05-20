import mongoose, { Schema } from "mongoose";
import { IOrganizationDocument } from "../types/organization.types";
import { PlanType, SubscriptionStatus } from "../../billing/types/billing.types";

const OrganizationSchema = new Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Organization slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase alphanumeric with hyphens only",
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    departments: {
      type: [String],
      default: [],
    },
    roles: {
      type: [String],
      default: [],
    },
    plan: {
      type: String,
      enum: ["free", "pro", "custom"] as PlanType[],
      default: "free",
    },
    stripeCustomerId: {
      type: String,
    },
    stripeSubscriptionId: {
      type: String,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "unpaid", null] as (SubscriptionStatus | null)[],
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ isActive: 1 });
OrganizationSchema.index({ stripeCustomerId: 1 }, { sparse: true });
OrganizationSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });

const Organization = mongoose.model<IOrganizationDocument>(
  "Organization",
  OrganizationSchema,
);

export default Organization;
