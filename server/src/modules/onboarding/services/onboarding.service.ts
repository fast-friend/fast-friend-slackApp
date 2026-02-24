import { nanoid } from "nanoid";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../../config/env.config";
import OnboardingToken from "../models/OnboardingToken.model";
import SlackUser from "../../groups/models/SlackUser.model";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import Organization from "../../organization/models/organization.model";
import AppError from "../../../utils/appError";

// Initialize Cloudinary
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

const TOKEN_EXPIRY_DAYS = 7;
const MAX_PHOTO_BYTES = 1 * 1024 * 1024; // 1 MB
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate (or refresh) an onboarding token for a Slack user.
 * Returns the full URL the user should visit.
 */
export const generateTokenForUser = async (
    slackUserId: string,
    workspaceId: string
): Promise<string> => {
    // Delete any existing token for this user/workspace combo
    await OnboardingToken.deleteMany({ slackUserId, workspaceId });

    const token = nanoid(20);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

    await OnboardingToken.create({ token, slackUserId, workspaceId, expiresAt });

    return `${env.FRONTEND_URL}/onboard/${token}`;
};

/**
 * Verify a token and return it (throws if invalid/expired/used).
 */
export const verifyToken = async (token: string) => {
    const doc = await OnboardingToken.findOne({
        token,
        used: false,
        expiresAt: { $gt: new Date() },
    });

    if (!doc) {
        throw new AppError("This link is invalid or has expired.", 400);
    }

    return doc;
};

/**
 * Mark a token as used (called after successful form submission).
 */
export const markTokenUsed = async (token: string) => {
    await OnboardingToken.updateOne({ token }, { used: true });
};

/**
 * Get the Slack user profile data for pre-filling the form.
 */
export const getPreFillData = async (slackUserId: string, workspaceId: string) => {
    const user = await SlackUser.findOne({ userId: slackUserId, workspaceId }).lean();
    if (!user) {
        throw new AppError("User not found.", 404);
    }

    // Look up organization via the workspace so we can return its roles/departments
    const workspace = await SlackWorkspace.findById(workspaceId).lean();
    let availableRoles: string[] = [];
    let availableDepartments: string[] = [];

    if (workspace?.organizationId) {
        const org = await Organization.findById(workspace.organizationId).lean();
        if (org) {
            availableRoles = org.roles ?? [];
            availableDepartments = org.departments ?? [];
        }
    }

    return {
        name: user.realName || user.userName || "",
        email: user.email || "",
        avatarUrl: user.avatarUrl || null,
        departments: user.departments || [],
        roles: user.roles || [],
        hobbies: user.hobbies || [],
        birthdate: user.birthdate || null,
        photoUrl: user.photoUrl || null,
        onboardingCompleted: user.onboardingCompleted || false,
        availableRoles,
        availableDepartments,
    };
};

/**
 * Upload a photo buffer to Cloudinary.
 * Validates file size (<= 1MB).
 * Returns the secure Cloudinary URL.
 */
export const uploadPhotoToCloudinary = async (
    fileBuffer: Buffer,
    fileSizeBytes: number,
    mimeType: string
): Promise<string> => {
    if (fileSizeBytes > MAX_PHOTO_BYTES) {
        throw new AppError("Photo must be 1 MB or smaller.", 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(mimeType)) {
        throw new AppError("Only JPEG, PNG, and WebP images are allowed.", 400);
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "fast-friends/onboarding",
                resource_type: "image",
                transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
            },
            (error, result) => {
                if (error || !result) {
                    reject(new AppError("Failed to upload image to Cloudinary.", 500));
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        stream.end(fileBuffer);
    });
};

/**
 * Send onboarding DM links to all non-completed Slack users in a workspace.
 * Returns the count of DMs sent.
 */
export const sendOnboardingDMs = async (workspaceId: string): Promise<number> => {
    const workspace = await SlackWorkspace.findById(workspaceId);
    if (!workspace) {
        throw new AppError("Workspace not found.", 404);
    }

    // Fetch all active, non-completed users
    const users = await SlackUser.find({
        workspaceId,
        isActive: true,
        onboardingCompleted: { $ne: true },
    }).lean();

    if (users.length === 0) {
        return 0;
    }

    const axios = (await import("axios")).default;
    let sentCount = 0;

    for (const user of users) {
        try {
            const link = await generateTokenForUser(user.userId, workspaceId);

            // Open DM
            const dmRes = await axios.post(
                "https://slack.com/api/conversations.open",
                { users: user.userId },
                {
                    headers: {
                        Authorization: `Bearer ${workspace.botToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!dmRes.data.ok) continue;

            const channelId = dmRes.data.channel.id;

            // Send message
            const postRes = await axios.post(
                "https://slack.com/api/chat.postMessage",
                {
                    channel: channelId,
                    text: `👋 Hi ${user.realName || user.userName}! Please complete your onboarding profile so your teammates can get to know you better.`,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `👋 Hi *${user.realName || user.userName}*!\n\nPlease take a moment to complete your team profile. It only takes 2 minutes!`,
                            },
                        },
                        {
                            type: "actions",
                            elements: [
                                {
                                    type: "button",
                                    text: { type: "plain_text", text: "Complete My Profile ✏️" },
                                    style: "primary",
                                    url: link,
                                },
                            ],
                        },
                    ],
                },
                {
                    headers: {
                        Authorization: `Bearer ${workspace.botToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            sentCount++;

            // Wait 1.2 seconds to respect Slack's Tier 4 (1 req/sec) limit for chat.postMessage
            await delay(1200);
        } catch (err) {
            console.error(`Failed to send onboarding DM to ${user.userId}:`, err);
        }
    }

    return sentCount;
};
