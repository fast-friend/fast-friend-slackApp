import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../../../config/env.config";
import AppError from "../../../utils/appError";

/**
 * Middleware to verify Slack request signature
 * Prevents unauthorized requests and replay attacks
 */
export const verifySlackSignature = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const slackSignature = req.headers["x-slack-signature"] as string;
    const timestamp = req.headers["x-slack-request-timestamp"] as string;

    if (!slackSignature || !timestamp) {
        throw new AppError("Missing Slack signature headers", 401);
    }

    // Prevent replay attacks - reject requests older than 5 minutes
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        throw new AppError("Request timestamp too old", 401);
    }

    // Get raw body (preserved by express.raw middleware)
    const rawBody = req.body.toString("utf8");

    // Compute signature
    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const mySignature =
        "v0=" +
        crypto
            .createHmac("sha256", env.SLACK_SIGNING_SECRET)
            .update(sigBasestring)
            .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const slackSigBuffer = Buffer.from(slackSignature);
    const mySigBuffer = Buffer.from(mySignature);

    if (
        slackSigBuffer.length !== mySigBuffer.length ||
        !crypto.timingSafeEqual(slackSigBuffer, mySigBuffer)
    ) {
        throw new AppError("Invalid Slack signature", 401);
    }

    // Parse the body for the controller
    const parsedBody = new URLSearchParams(rawBody);
    (req as any).body = {
        payload: parsedBody.get("payload") || "",
    };

    next();
};
