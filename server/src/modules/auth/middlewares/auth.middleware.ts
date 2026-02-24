import { Request, Response, NextFunction } from "express";
import AppError from "../../../utils/appError";
import { verifyAccessToken, getCookieNames } from "../utils/jwt.utils";
import { ITokenPayload } from "../types/auth.types";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

/**
 * Middleware to protect routes - requires valid access token
 */
export const protect = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let token: string | undefined;

      // Get cookie names
      const cookieNames = getCookieNames();

      // Check for token in cookies
      token = req.cookies[cookieNames.accessToken];

      // Also check Authorization header as fallback
      if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Not authorized - No token provided",
        });
      }

      // Verify token
      const decoded = verifyAccessToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: "Not authorized - Invalid or expired token",
        });
      }

      // Attach user to request
      req.user = decoded;

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    }
  };
};

/**
 * Middleware to optionally authenticate user
 * Does not throw error if no token, just attaches user if valid token exists
 */
export const optionalAuth = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Get cookie names
    const cookieNames = getCookieNames();

    // Check for token in cookies
    token = req.cookies[cookieNames.accessToken];

    // Also check Authorization header as fallback
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token, just continue without auth
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // If valid, attach user to request
    if (decoded) {
      req.user = decoded;
    }

    next();
  };
};
