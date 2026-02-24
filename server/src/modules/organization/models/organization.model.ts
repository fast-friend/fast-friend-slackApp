import mongoose, { Schema } from "mongoose";
import { IOrganizationDocument } from "../types/organization.types";

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
  },
  {
    timestamps: true,
  },
);

// Indexes
OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ isActive: 1 });

const Organization = mongoose.model<IOrganizationDocument>(
  "Organization",
  OrganizationSchema,
);

export default Organization;
