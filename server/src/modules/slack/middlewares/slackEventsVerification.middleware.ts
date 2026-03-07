import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../../../config/env.config";
import AppError from "../../../utils/appError";

/**
 * Middleware to verify Slack request signature for Events API
 */
export const verifySlackEventsSignature = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const slackSignature = req.headers["x-slack-signature"] as string;
    const timestamp = req.headers["x-slack-request-timestamp"] as string;

    // Must use raw body. Because of express.raw, req.body is a Buffer
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

    // 1. Bypass signature check for url_verification 
    // Slack's initial challenge does not always have valid signatures in older implementations, 
    // or it's just safer to reply to the challenge immediately.
    try {
        const parsedBody = JSON.parse(rawBody || req.body);
        if (parsedBody && parsedBody.type === "url_verification") {
            req.body = parsedBody; // Set parsed body for downstream
            return next();
        }
    } catch (e) {
        // Ignore JSON parse errors here, let the signature check fail later
    }

    if (!slackSignature || !timestamp) {
        throw new AppError("Missing Slack signature headers", 401);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        throw new AppError("Request timestamp too old", 401);
    }

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const mySignature =
        "v0=" +
        crypto
            .createHmac("sha256", env.SLACK_SIGNING_SECRET)
            .update(sigBasestring)
            .digest("hex");

    const slackSigBuffer = Buffer.from(slackSignature);
    const mySigBuffer = Buffer.from(mySignature);

    if (
        slackSigBuffer.length !== mySigBuffer.length ||
        !crypto.timingSafeEqual(slackSigBuffer, mySigBuffer)
    ) {
        console.error("Signature Mismatch!");
        console.error("Raw Body:", rawBody);
        console.error("Slack Headers Sig:", slackSignature);
        console.error("My Computed Sig:", mySignature);

        if (env.NODE_ENV === "development") {
            console.warn("⚠️ Bypassing Slack Signature check in development mode due to mismatch.");
        } else {
            throw new AppError("Invalid Slack signature", 401);
        }
    }

    // Parse the JSON body since Events API sends JSON
    try {
        const parsedBody = JSON.parse(rawBody);
        req.body = parsedBody; // Replace buffer with json
    } catch (error) {
        throw new AppError("Invalid JSON body", 400);
    }

    next();
};
