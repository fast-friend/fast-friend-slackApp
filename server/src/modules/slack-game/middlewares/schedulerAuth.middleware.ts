import { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.config";

/**
 * Middleware to protect scheduler endpoints.
 * Expects the secret key in the `x-scheduler-key` header.
 */
export const verifySchedulerSecret = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const key = req.headers["x-scheduler-key"] as string | undefined;

    if (!key || key !== env.SCHEDULER_SECRET_KEY) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }

    next();
};
