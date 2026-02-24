import { Request, Response } from "express";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import AuthUser from "../models/authuser.model";
import {
  generateTokens,
  verifyRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCookieNames,
  getRefreshTokenExpiry,
  generateAccessToken,
} from "../utils/jwt.utils";
import {
  ILoginRequest,
  ISignupRequest,
  ISendOtpRequest,
  IVerifyOtpRequest,
} from "../types/auth.types";

// Temporary OTP storage for dev (in production, use Redis or database)
// Store: email -> { otp, expiresAt, password, organizationName }
const otpStore = new Map<
  string,
  { otp: string; expiresAt: Date; password: string; organizationName: string }
>();

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as ILoginRequest;

  // Find user by email with password
  const user = await AuthUser.findOne({ email }).select(
    "+password +refreshTokens",
  );

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError("Account is deactivated. Please contact support.", 403);
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id.toString());

  // Clean up expired refresh tokens and add new one
  const now = new Date();
  const validTokens = user.refreshTokens.filter((rt) => rt.expiresAt > now);

  await AuthUser.findByIdAndUpdate(user._id, {
    refreshTokens: [
      ...validTokens,
      {
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      },
    ],
  });

  // Get cookie names
  const cookieNames = getCookieNames();

  // Set cookies
  res.cookie(
    cookieNames.accessToken,
    accessToken,
    getAccessTokenCookieOptions(),
  );
  res.cookie(
    cookieNames.refreshToken,
    refreshToken,
    getRefreshTokenCookieOptions(),
  );

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
      },
    },
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public (with refresh token cookie)
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const cookieNames = getCookieNames();
    const refreshTokenFromCookie = req.cookies[cookieNames.refreshToken];

    if (!refreshTokenFromCookie) {
      throw new AppError("Refresh token not found", 401);
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshTokenFromCookie);
    if (!payload) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Find user and verify refresh token exists
    const user = await AuthUser.findById(payload.userId).select(
      "+refreshTokens",
    );

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is deactivated", 403);
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === refreshTokenFromCookie && rt.expiresAt > new Date(),
    );

    if (!tokenExists) {
      throw new AppError("Refresh token not found or expired", 401);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id.toString());

    // Set new access token cookie
    res.cookie(
      cookieNames.accessToken,
      newAccessToken,
      getAccessTokenCookieOptions(),
    );

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  },
);

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const cookieNames = getCookieNames();
  const refreshTokenFromCookie = req.cookies[cookieNames.refreshToken];

  // If user is authenticated, remove refresh token from database
  if (refreshTokenFromCookie && req.user) {
    await AuthUser.findByIdAndUpdate(req.user.userId, {
      $pull: {
        refreshTokens: { token: refreshTokenFromCookie },
      },
    });
  }

  // Clear cookies
  res.clearCookie(cookieNames.accessToken, { path: "/" });
  res.clearCookie(cookieNames.refreshToken, { path: "/" });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await AuthUser.findById(req.user?.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          onboardingCompleted: user.onboardingCompleted,
        },
      },
    });
  },
);

/**
 * @desc    Send OTP to email (Step 1: Don't create user yet)
 * @route   POST /api/v1/auth/send-otp
 * @access  Public
 */
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, organizationName } = req.body as ISendOtpRequest;

  if (!email || !password || !organizationName) {
    throw new AppError(
      "Email, password, and organization name are required",
      400,
    );
  }

  // Check if user already exists
  const existingUser = await AuthUser.findOne({ email });
  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  // For dev phase, OTP is always "111111"
  const otp = "111111";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store OTP with password and organization name temporarily
  otpStore.set(email, { otp, expiresAt, password, organizationName });

  // TODO: In production, send email via Resend
  console.log(`OTP for ${email}: ${otp}`);

  res.status(200).json({
    success: true,
    message: "OTP sent successfully to your email",
  });
});

/**
 * @desc    Verify OTP and create user account (Step 2: Create user after OTP verification)
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body as IVerifyOtpRequest;

  if (!email || !otp) {
    throw new AppError("Email and OTP are required", 400);
  }

  // Check stored OTP data
  const storedOtpData = otpStore.get(email);

  if (!storedOtpData) {
    throw new AppError(
      "OTP not found or expired. Please request a new one.",
      400,
    );
  }

  // Check if OTP is expired
  if (new Date() > storedOtpData.expiresAt) {
    otpStore.delete(email);
    throw new AppError("OTP has expired. Please request a new one.", 400);
  }

  // Verify OTP
  if (storedOtpData.otp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  // Check if user already exists (shouldn't happen, but safety check)
  const existingUser = await AuthUser.findOne({
    email,
  });
  if (existingUser) {
    otpStore.delete(email);
    throw new AppError("User already exists", 409);
  }

  // Create new user with verified email
  const user = await AuthUser.create({
    email,
    password: storedOtpData.password,
    emailVerified: true,
    onboardingCompleted: false,
  });

  // Auto-create organization for the user
  const Organization = (
    await import("../../organization/models/organization.model")
  ).default;
  const OrganizationMember = (
    await import("../../organization/models/organizationMember.model")
  ).default;

  const organization = await Organization.create({
    name: storedOtpData.organizationName,
    slug: storedOtpData.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    isActive: true,
  });

  // Make user the OWNER of the organization
  await OrganizationMember.create({
    userId: user._id,
    organizationId: organization._id,
    role: "OWNER",
    joinedAt: new Date(),
    isActive: true,
  });

  // Clear OTP from storage
  otpStore.delete(email);

  // Generate tokens and log user in
  const { accessToken, refreshToken } = generateTokens(user._id.toString());

  // Store refresh token
  await AuthUser.findByIdAndUpdate(user._id, {
    $push: {
      refreshTokens: {
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      },
    },
  });

  // Get cookie names
  const cookieNames = getCookieNames();

  // Set cookies
  res.cookie(
    cookieNames.accessToken,
    accessToken,
    getAccessTokenCookieOptions(),
  );
  res.cookie(
    cookieNames.refreshToken,
    refreshToken,
    getRefreshTokenCookieOptions(),
  );

  res.status(200).json({
    success: true,
    message: "Email verified and account created successfully",
    data: {
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
      },
    },
  });
});

/**
 * @desc    Complete onboarding
 * @route   POST /api/v1/auth/complete-onboarding
 * @access  Private
 */
export const completeOnboarding = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Not authenticated", 401);
    }

    // Update user's onboarding status
    const user = await AuthUser.findByIdAndUpdate(
      req.user.userId,
      { onboardingCompleted: true },
      { new: true },
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
    });
  },
);
