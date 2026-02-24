import { Router } from "express";
import {
  createGameHandler,
  getGamesHandler,
  getGameHandler,
  updateGameHandler,
  deleteGameHandler,
} from "../controllers/games.controller";

const router = Router({ mergeParams: true }); // mergeParams to access parent params

// Authentication already applied by parent router (either organization or legacy /groups)

// Create a new game
router.post("/", createGameHandler);

// Get all games for a group
router.get("/", getGamesHandler);

// Get a single game by ID
router.get("/:gameId", getGameHandler);

// Update a game
router.put("/:gameId", updateGameHandler);

// Delete a game
router.delete("/:gameId", deleteGameHandler);

export default router;
