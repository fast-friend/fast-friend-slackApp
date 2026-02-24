import { Router } from "express";
import {
  getGameTemplates,
  getGameTemplate,
} from "../controllers/gameTemplates.controller";

const router = Router({ mergeParams: true }); // mergeParams to access parent params

// Authentication already applied by parent router (either organization or legacy)

// Get all game templates
router.get("/", getGameTemplates);

// Get a single game template by ID
router.get("/:templateId", getGameTemplate);

export default router;
