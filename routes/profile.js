import express from "express";
import {
  getProfileStatus,
  setUserRole,
  getCurrentUserProfile,
  updateUserInfo,
  resetUserProfile,
  getDashboardData,
} from "../controllers/profileController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Profile status and role management
router.get("/status", getProfileStatus);
router.post("/role", setUserRole);
router.get("/me", getCurrentUserProfile);
router.put("/me", updateUserInfo);
router.delete("/reset", resetUserProfile);
router.get("/dashboard", getDashboardData);

export default router;
