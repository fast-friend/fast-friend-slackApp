import Game from "../models/Game.model";

interface CreateGameData {
  gameName: string;
  gameTemplateId: string;
  groupId: string;
  workspaceId: string;
  scheduleType: "weekly" | "monthly";
  scheduledDays: number[];
  scheduledTime: string;
  timezone?: string;
  frequencyMinutes?: number;
  createdBy: string;
}

interface UpdateGameData {
  gameName?: string;
  scheduleType?: "weekly" | "monthly";
  scheduledDays?: number[];
  scheduledTime?: string;
  timezone?: string;
  frequencyMinutes?: number;
  status?: "scheduled" | "active" | "completed" | "cancelled";
}

/**
 * Create a new game
 * @param data - Game creation data
 * @returns Created game document
 */
export const createGame = async (data: CreateGameData) => {
  const {
    gameName,
    gameTemplateId,
    groupId,
    workspaceId,
    scheduleType,
    scheduledDays,
    scheduledTime,
    timezone,
    frequencyMinutes,
    createdBy,
  } = data;

  const game = await Game.create({
    gameName,
    gameTemplateId,
    groupId,
    workspaceId,
    scheduleType,
    scheduledDays,
    scheduledTime,
    timezone: timezone || "UTC",
    frequencyMinutes,
    status: "scheduled",
    createdBy,
    isActive: true,
  });

  return game;
};

/**
 * Get all games for a group
 * @param groupId - MongoDB ObjectId of the Group
 * @returns Array of game documents
 */
export const getGamesByGroup = async (groupId: string) => {
  return await Game.find({ groupId, isActive: true }).sort({
    scheduledTime: 1,
    createdAt: -1,
  });
};

/**
 * Get all games for a workspace (across all groups)
 * @param workspaceId - MongoDB ObjectId of the Workspace
 * @returns Array of game documents with group details
 */
export const getGamesByWorkspace = async (workspaceId: string) => {
  return await Game.find({ workspaceId, isActive: true })
    .populate("groupId", "groupName")
    .sort({
      scheduledTime: 1,
      createdAt: -1,
    });
};

/**
 * Get a single game by ID
 * @param gameId - MongoDB ObjectId of the Game
 * @returns Game document
 */
export const getGameById = async (gameId: string) => {
  const game = await Game.findOne({ _id: gameId, isActive: true });

  if (!game) {
    throw new Error("Game not found");
  }

  return game;
};

/**
 * Update a game
 * @param gameId - MongoDB ObjectId of the Game
 * @param data - Update data
 * @returns Updated game document
 */
export const updateGame = async (gameId: string, data: UpdateGameData) => {
  const game = await Game.findOne({ _id: gameId, isActive: true });

  if (!game) {
    throw new Error("Game not found");
  }

  // Remove undefined fields from data payload to prevent overwriting existing values
  const sanitizedData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  // Update game document
  Object.assign(game, sanitizedData);
  await game.save();

  return game;
};

/**
 * Delete a game (soft delete)
 * @param gameId - MongoDB ObjectId of the Game
 */
export const deleteGame = async (gameId: string) => {
  const game = await Game.findOne({ _id: gameId, isActive: true });

  if (!game) {
    throw new Error("Game not found");
  }

  // Soft delete the game
  game.isActive = false;
  await game.save();

  return { message: "Game deleted successfully" };
};
