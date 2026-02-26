import { Router } from "express";
import {
  login,
  refreshToken,
  logout,
  getCurrentUser,
  sendOtp,
  verifyOtp,
  completeOnboarding,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/logout", protect(), logout);
router.get("/me", protect(), getCurrentUser);
router.post("/complete-onboarding", protect(), completeOnboarding);

export default router;
