import { Request, Response } from "express";
import multer from "multer";
import asyncHandler from "../../../utils/asyncHandler";
import * as onboardingService from "../services/onboarding.service";
import SlackUser from "../../groups/models/SlackUser.model";

// ─── Multer (memory storage for Cloudinary) ───────────────────────────────────

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // Accept up to 2MB; service validates 1MB
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @desc    Get pre-fill data for the onboarding form
 * @route   GET /api/v1/onboard/:token
 * @access  Public
 */
export const getOnboardingData = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const tokenDoc = await onboardingService.verifyToken(token);
    const preFillData = await onboardingService.getPreFillData(
        tokenDoc.slackUserId,
        tokenDoc.workspaceId
    );

    res.status(200).json({
        success: true,
        data: preFillData,
    });
});

/**
 * @desc    Upload a profile photo to Cloudinary
 * @route   POST /api/v1/onboard/:token/photo
 * @access  Public
 */
export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    // Verify token is still valid
    await onboardingService.verifyToken(token);

    if (!req.file) {
        res.status(400).json({ success: false, message: "No file provided." });
        return;
    }

    const photoUrl = await onboardingService.uploadPhotoToCloudinary(
        req.file.buffer,
        req.file.size,
        req.file.mimetype
    );

    res.status(200).json({
        success: true,
        data: { photoUrl },
    });
});

/**
 * @desc    Submit the onboarding form
 * @route   POST /api/v1/onboard/:token/submit
 * @access  Public
 */
export const submitOnboarding = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { departments, roles, hobbies, birthdate, photoUrl, name, email } = req.body;

    const tokenDoc = await onboardingService.verifyToken(token);

    // Update the SlackUser document
    const updateFields: Record<string, any> = {
        onboardingCompleted: true,
    };

    if (departments) updateFields.departments = departments;
    if (roles) updateFields.roles = roles;
    if (hobbies) updateFields.hobbies = hobbies;
    if (birthdate) updateFields.birthdate = new Date(birthdate);
    if (photoUrl) updateFields.photoUrl = photoUrl;

    // Only update name/email if NOT pre-filled from Slack (i.e., originally empty)
    if (name) updateFields.realName = name;
    if (email) updateFields.email = email;

    await SlackUser.findOneAndUpdate(
        { userId: tokenDoc.slackUserId, workspaceId: tokenDoc.workspaceId },
        { $set: updateFields },
        { new: true }
    );

    // Mark token as used
    await onboardingService.markTokenUsed(token);

    res.status(200).json({
        success: true,
        message: "Profile submitted successfully!",
    });
});

/**
 * @desc    Send onboarding DM links to all non-completed users in a workspace
 * @route   POST /api/v1/workspaces/:workspaceId/send-onboarding
 * @access  Private (JWT)
 */
export const sendOnboardingLinks = asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    const sentCount = await onboardingService.sendOnboardingDMs(workspaceId);

    res.status(200).json({
        success: true,
        message: `Onboarding links sent to ${sentCount} user${sentCount !== 1 ? "s" : ""}.`,
        data: { sentCount },
    });
});
