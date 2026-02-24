import { Router } from "express";
import {
    getOnboardingData,
    uploadPhoto,
    submitOnboarding,
    upload,
} from "../controllers/onboarding.controller";

const router = Router();

// GET /api/v1/onboard/:token - get pre-fill data
router.get("/:token", getOnboardingData);

// POST /api/v1/onboard/:token/photo - upload profile photo
router.post("/:token/photo", upload.single("photo"), uploadPhoto);

// POST /api/v1/onboard/:token/submit - submit completed form
router.post("/:token/submit", submitOnboarding);

export default router;
