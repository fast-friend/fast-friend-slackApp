import OrganizationMember from "../models/organizationMember.model";
import AuthUser from "../../auth/models/authuser.model";
import {
  OrganizationRole,
  IInviteMemberRequest,
  IUpdateMemberRoleRequest,
} from "../types/organization.types";
import AppError from "../../../utils/appError";

/**
 * Get all members of an organization
 */
export const getOrganizationMembers = async (organizationId: string) => {
  const members = await OrganizationMember.find({
    organizationId,
    isActive: true,
  }).populate("userId", "email firstName lastName avatarUrl createdAt");

  return members;
};

/**
 * Invite a user to organization
 */
export const inviteMember = async (
  organizationId: string,
  invitedBy: string,
  data: IInviteMemberRequest,
) => {
  const { email, role } = data;

  // Find user by email
  const user = await AuthUser.findOne({ email, isActive: true });

  if (!user) {
    throw new AppError("User not found. They need to sign up first.", 404);
  }

  // Check if user is already a member
  const existingMember = await OrganizationMember.findOne({
    userId: user._id,
    organizationId,
    isActive: true,
  });

  if (existingMember) {
    throw new AppError("User is already a member of this organization", 400);
  }

  // Create membership
  const member = await OrganizationMember.create({
    userId: user._id,
    organizationId,
    role,
    invitedBy,
    joinedAt: new Date(),
    isActive: true,
  });

  // Populate user details
  await member.populate("userId", "email firstName lastName avatarUrl");

  return member;
};

/**
 * Update member role
 */
export const updateMemberRole = async (
  organizationId: string,
  userId: string,
  data: IUpdateMemberRoleRequest,
) => {
  const { role } = data;

  // Cannot change role of OWNER
  const member = await OrganizationMember.findOne({
    userId,
    organizationId,
    isActive: true,
  });

  if (!member) {
    throw new AppError("Member not found", 404);
  }

  if (member.role === OrganizationRole.OWNER) {
    throw new AppError("Cannot change role of organization owner", 400);
  }

  member.role = role;
  await member.save();

  await member.populate("userId", "email firstName lastName avatarUrl");

  return member;
};

/**
 * Remove member from organization
 */
export const removeMember = async (organizationId: string, userId: string) => {
  const member = await OrganizationMember.findOne({
    userId,
    organizationId,
    isActive: true,
  });

  if (!member) {
    throw new AppError("Member not found", 404);
  }

  // Cannot remove OWNER
  if (member.role === OrganizationRole.OWNER) {
    throw new AppError("Cannot remove organization owner", 400);
  }

  // Soft delete
  member.isActive = false;
  await member.save();

  return member;
};

/**
 * Get member details
 */
export const getMemberById = async (organizationId: string, userId: string) => {
  const member = await OrganizationMember.findOne({
    userId,
    organizationId,
    isActive: true,
  }).populate("userId", "email firstName lastName avatarUrl createdAt");

  if (!member) {
    throw new AppError("Member not found", 404);
  }

  return member;
};
