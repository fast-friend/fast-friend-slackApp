import { Request, Response } from "express";
import {
  getAllGameTemplates,
  getGameTemplateById,
} from "../services/gameTemplate.service";

/**
 * GET /api/v1/game-templates
 * Get all active game templates
 */
export const getGameTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await getAllGameTemplates();

    res.status(200).json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch game templates",
    });
  }
};

/**
 * GET /api/v1/game-templates/:templateId
 * Get a single game template by ID
 */
export const getGameTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const template = await getGameTemplateById(templateId);

    res.status(200).json({
      success: true,
      data: { template },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Game template not found",
    });
  }
};
