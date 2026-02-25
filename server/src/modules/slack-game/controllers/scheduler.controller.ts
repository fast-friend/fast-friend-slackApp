import { Request, Response } from "express";
import { runDailyGame } from "../jobs/dailyGame.job";

/**
 * POST /api/v1/scheduler/run-daily-game
 * Manually trigger the daily game cycle via an external scheduler.
 */
export const triggerDailyGame = async (_req: Request, res: Response) => {
    try {
        console.log("🎮 [scheduler] Manual trigger received — running daily game…");
        await runDailyGame();
        res.status(200).json({ success: true, message: "Daily game executed successfully" });
    } catch (error: any) {
        console.error("❌ [scheduler] Error running daily game:", error.message);
        res.status(500).json({ success: false, message: "Failed to run daily game" });
    }
};
