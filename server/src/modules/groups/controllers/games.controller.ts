import { Request, Response } from "express";
import {
  createGame,
  getGamesByGroup,
  getGamesByWorkspace,
  getGameById,
  updateGame,
  deleteGame,
} from "../services/game.service";

/**
 * POST /api/v1/groups/:groupId/games
 * Create a new game
 */
export const createGameHandler = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const {
      gameName,
      gameTemplateId,
      scheduleType,
      scheduledDays,
      scheduledTime,
      timezone,
      frequencyMinutes,
    } = req.body;
    const createdBy = (req as any).user.userId; // From auth middleware

    // Validate required fields
    if (
      !gameName ||
      !gameTemplateId ||
      !scheduleType ||
      !scheduledDays ||
      !scheduledTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Game name, template ID, schedule type, scheduled days, and time are required",
      });
    }

    // Validate scheduleType
    if (!["weekly", "monthly"].includes(scheduleType)) {
      return res.status(400).json({
        success: false,
        message: "Schedule type must be 'weekly' or 'monthly'",
      });
    }

    // Validate scheduledDays array
    if (!Array.isArray(scheduledDays) || scheduledDays.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one scheduled day is required",
      });
    }

    // Validate scheduledTime format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduledTime)) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in HH:mm format (e.g., 09:00)",
      });
    }

    // Get group to find workspaceId
    const { getGroupById } = await import("../services/group.service");
    const group = await getGroupById(groupId);

    const game = await createGame({
      gameName,
      gameTemplateId,
      groupId,
      workspaceId: group.workspaceId,
      scheduleType,
      scheduledDays,
      scheduledTime,
      timezone,
      frequencyMinutes,
      createdBy,
    });

    res.status(201).json({
      success: true,
      data: { game },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create game",
    });
  }
};

/**
 * GET /api/v1/groups/:groupId/games
 * Get all games for a group
 */
export const getGamesHandler = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const games = await getGamesByGroup(groupId);

    res.status(200).json({
      success: true,
      data: { games },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch games",
    });
  }
};

/**
 * GET /api/v1/groups/:groupId/games/:gameId
 * Get a single game by ID
 */
export const getGameHandler = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const game = await getGameById(gameId);

    res.status(200).json({
      success: true,
      data: { game },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Game not found",
    });
  }
};

/**
 * PUT /api/v1/groups/:groupId/games/:gameId
 * Update a game
 */
export const updateGameHandler = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const {
      gameName,
      scheduleType,
      scheduledDays,
      scheduledTime,
      timezone,
      status,
      frequencyMinutes
    } = req.body;

    const game = await updateGame(gameId, {
      gameName,
      scheduleType,
      scheduledDays,
      scheduledTime,
      timezone,
      status,
      frequencyMinutes,
    });

    res.status(200).json({
      success: true,
      data: { game },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update game",
    });
  }
};

/**
 * DELETE /api/v1/groups/:groupId/games/:gameId
 * Delete a game (soft delete)
 */
export const deleteGameHandler = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const result = await deleteGame(gameId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete game",
    });
  }
};

/**
 * GET /api/v1/workspaces/:workspaceId/games
 * Get all games across all groups in a workspace
 */
export const getAllGamesHandler = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const games = await getGamesByWorkspace(workspaceId);

    // Transform to include groupName and groupId at top level
    const transformedGames = games.map((game: any) => ({
      ...game.toObject(),
      groupName: game.groupId?.groupName || "Unknown Group",
      groupId: game.groupId?._id || game.groupId,
    }));

    res.status(200).json({
      success: true,
      data: { games: transformedGames },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch games",
    });
  }
};
