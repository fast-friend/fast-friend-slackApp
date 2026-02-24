import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import * as organizationService from "../services/organization.service";
import {
  ICreateOrganizationRequest,
  IUpdateOrganizationRequest,
} from "../types/organization.types";

/**
 * @desc    Create new organization
 * @route   POST /api/v1/organizations
 * @access  Private
 */
export const createOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data: ICreateOrganizationRequest = req.body;

    const organization = await organizationService.createOrganization(
      userId,
      data,
    );

    res.status(201).json({
      success: true,
      data: organization,
    });
  },
);

/**
 * @desc    Get all organizations for current user
 * @route   GET /api/v1/organizations
 * @access  Private
 */
export const getUserOrganizations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const organizations =
      await organizationService.getUserOrganizations(userId);

    res.status(200).json({
      success: true,
      data: organizations,
    });
  },
);

/**
 * @desc    Get organization by ID
 * @route   GET /api/v1/organizations/:organizationId
 * @access  Private (must be member)
 */
export const getOrganizationById = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId } = req.params;

    const organization =
      await organizationService.getOrganizationById(organizationId);

    res.status(200).json({
      success: true,
      data: organization,
    });
  },
);

/**
 * @desc    Update organization
 * @route   PATCH /api/v1/organizations/:organizationId
 * @access  Private (OWNER or ADMIN only)
 */
export const updateOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId } = req.params;
    const data: IUpdateOrganizationRequest = req.body;

    const organization = await organizationService.updateOrganization(
      organizationId,
      data,
    );

    res.status(200).json({
      success: true,
      data: organization,
    });
  },
);

/**
 * @desc    Delete organization
 * @route   DELETE /api/v1/organizations/:organizationId
 * @access  Private (OWNER only)
 */
export const deleteOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    const { organizationId } = req.params;

    await organizationService.deleteOrganization(organizationId);

    res.status(200).json({
      success: true,
      message: "Organization deleted successfully",
    });
  },
);
