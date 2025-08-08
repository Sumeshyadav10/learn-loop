import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  deleteMultipleNotifications,
  clearAllNotifications,
  getNotificationById,
  getNotificationStats,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// Get user notifications
router.get("/", getNotifications);

// Get unread notifications count
router.get("/unread-count", getUnreadCount);

// Get notification statistics
router.get("/stats", getNotificationStats);

// Get specific notification by ID
router.get("/:notificationId", getNotificationById);

// Mark single notification as read
router.put("/:notificationId/read", markAsRead);

// Mark multiple notifications as read
router.put("/read", markMultipleAsRead);

// Mark all notifications as read
router.put("/read-all", markAllAsRead);

// Delete single notification
router.delete("/:notificationId", deleteNotification);

// Delete multiple notifications
router.delete("/", deleteMultipleNotifications);

// Clear all notifications
router.delete("/clear-all", clearAllNotifications);

export default router;
