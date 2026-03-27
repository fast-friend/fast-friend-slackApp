import jwt from "jsonwebtoken";
import { env } from "../../../config/env.config";
import { ITokenPayload, IAuthTokens } from "../types/auth.types";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate access token
 */
export const generateAccessToken = (userId: string): string => {
  const payload: ITokenPayload = { userId };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  const payload: ITokenPayload = { userId };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokens = (userId: string): IAuthTokens => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): ITokenPayload | null => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as ITokenPayload;
  } catch {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): ITokenPayload | null => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as ITokenPayload;
  } catch {
    return null;
  }
};

/**
 * Get refresh token expiry date
 */
export const getRefreshTokenExpiry = (): Date => {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
};

const isProduction = env.NODE_ENV === "production";

/**
 * Get cookie options for access token
 */
export const getAccessTokenCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction, // HTTPS only in production; HTTP works in local dev
  sameSite: isProduction ? ("none" as const) : ("lax" as const), // 'none' requires secure=true
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
});

/**
 * Get cookie options for refresh token
 */
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: "/",
});

/**
 * Get cookie clear options (must match the options used when setting the cookie)
 */
export const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
});

/**
 * Get cookie names
 */
export const getCookieNames = () => ({
  accessToken: "accessToken",
  refreshToken: "refreshToken",
});
