import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as memberService from "../services/organizationMember.service";
import {
  IInviteMemberRequest,
  IUpdateMemberRoleRequest,
} from "../types/organization.types";

/**
 * @desc    Get all members of organization
 * @route   GET /api/v1/organizations/:organizationId/members
 * @access  Private (must be member)
 */
export const getOrganizationMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId } = req.params;

    const members = await memberService.getOrganizationMembers(organizationId);

    res.status(200).json({
      success: true,
      data: members,
    });
  },
);

/**
 * @desc    Invite user to organization
 * @route   POST /api/v1/organizations/:organizationId/members
 * @access  Private (OWNER or ADMIN only)
 */
export const inviteMember = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId } = req.params;
    const invitedBy = req.user!.userId;
    const data: IInviteMemberRequest = req.body;

    const member = await memberService.inviteMember(
      organizationId,
      invitedBy,
      data,
    );

    res.status(201).json({
      success: true,
      data: member,
    });
  },
);

/**
 * @desc    Update member role
 * @route   PATCH /api/v1/organizations/:organizationId/members/:userId
 * @access  Private (OWNER or ADMIN only)
 */
export const updateMemberRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId, userId } = req.params;
    const data: IUpdateMemberRoleRequest = req.body;

    const member = await memberService.updateMemberRole(
      organizationId,
      userId,
      data,
    );

    res.status(200).json({
      success: true,
      data: member,
    });
  },
);

/**
 * @desc    Remove member from organization
 * @route   DELETE /api/v1/organizations/:organizationId/members/:userId
 * @access  Private (OWNER or ADMIN only)
 */
export const removeMember = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId, userId } = req.params;

    await memberService.removeMember(organizationId, userId);

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  },
);
