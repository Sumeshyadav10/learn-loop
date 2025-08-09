import express from "express";
import {
  getCurrentUser,
  updateUserRole,
  updateUserInfo,
  getAllUsers,
  deleteUser,
} from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Get current user profile
router.get("/profile", getCurrentUser);

// Update user role
router.patch("/role", updateUserRole);

// Update user basic info
router.patch("/info", updateUserInfo);

// Get all users (for admin purposes)
router.get("/all", getAllUsers);

// Delete user account
router.delete("/account", deleteUser);

export default router;
