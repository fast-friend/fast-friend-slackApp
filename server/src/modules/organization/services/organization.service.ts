import Organization from "../models/organization.model";
import OrganizationMember from "../models/organizationMember.model";
import AuthUser from "../../auth/models/authuser.model";
import {
  OrganizationRole,
  ICreateOrganizationRequest,
  IUpdateOrganizationRequest,
  IOrganizationWithRole,
} from "../types/organization.types";
import AppError from "../../../utils/appError";
import mongoose from "mongoose";

/**
 * Generate URL-friendly slug from organization name
 */
const generateSlug = (name: string, suffix?: string): string => {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (suffix) {
    slug = `${slug}-${suffix}`;
  }

  return slug;
};

/**
 * Create a new organization and assign creator as OWNER
 */
export const createOrganization = async (
  userId: string,
  data: ICreateOrganizationRequest,
) => {
  // Generate slug if not provided
  let slug = data.slug || generateSlug(data.name);

  // Ensure slug is unique
  let slugExists = await Organization.findOne({ slug, isActive: true });
  let counter = 1;
  while (slugExists) {
    slug = generateSlug(data.name, counter.toString());
    slugExists = await Organization.findOne({ slug, isActive: true });
    counter++;
  }

  // Create organization
  const organization = await Organization.create({
    ...data,
    slug,
    isActive: true,
  });

  // Create organization member (creator is OWNER)
  await OrganizationMember.create({
    userId,
    organizationId: organization._id,
    role: OrganizationRole.OWNER,
    joinedAt: new Date(),
    isActive: true,
  });

  return organization;
};

/**
 * Get all organizations for a user
 */
export const getUserOrganizations = async (
  userId: string,
): Promise<IOrganizationWithRole[]> => {
  const memberships = await OrganizationMember.find({
    userId,
    isActive: true,
  }).populate<{ organizationId: any }>("organizationId");

  return memberships
    .filter((m) => m.organizationId && m.organizationId.isActive)
    .map((m) => ({
      ...m.organizationId.toObject(),
      userRole: m.role,
    }));
};

/**
 * Get organization by ID
 */
export const getOrganizationById = async (organizationId: string) => {
  const organization = await Organization.findOne({
    _id: organizationId,
    isActive: true,
  });

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  return organization;
};

/**
 * Update organization
 */
export const updateOrganization = async (
  organizationId: string,
  data: IUpdateOrganizationRequest,
) => {
  // If slug is being updated, ensure it's unique
  if (data.slug) {
    const slugExists = await Organization.findOne({
      slug: data.slug,
      _id: { $ne: organizationId },
      isActive: true,
    });

    if (slugExists) {
      throw new AppError("Slug already exists", 400);
    }
  }

  const organization = await Organization.findOneAndUpdate(
    { _id: organizationId, isActive: true },
    data,
    { new: true, runValidators: true },
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  return organization;
};

/**
 * Delete organization (soft delete)
 */
export const deleteOrganization = async (organizationId: string) => {
  const organization = await Organization.findOneAndUpdate(
    { _id: organizationId, isActive: true },
    { isActive: false },
    { new: true },
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  // Soft delete all memberships
  await OrganizationMember.updateMany(
    { organizationId, isActive: true },
    { isActive: false },
  );

  return organization;
};

/**
 * Get user's role in organization
 */
export const getUserRoleInOrganization = async (
  userId: string,
  organizationId: string,
): Promise<OrganizationRole | null> => {
  const membership = await OrganizationMember.findOne({
    userId,
    organizationId,
    isActive: true,
  });

  return membership ? membership.role : null;
};

/**
 * Check if user has access to organization
 */
export const checkOrganizationAccess = async (
  userId: string,
  organizationId: string,
): Promise<boolean> => {
  const membership = await OrganizationMember.findOne({
    userId,
    organizationId,
    isActive: true,
  });

  if (!membership) {
    return false;
  }

  const organization = await Organization.findOne({
    _id: organizationId,
    isActive: true,
  });

  return !!organization;
};
