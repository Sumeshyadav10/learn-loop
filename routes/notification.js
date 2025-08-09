import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markMultipleAsRead,
  markAllAsRead,
  deleteNotification,
  deleteMultipleNotifications,
  clearAllNotifications,
  deleteAllRead,
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
router.get("/statistics", getNotificationStats);

// Get specific notification by ID
router.get("/:notificationId", getNotificationById);

// Mark single notification as read
router.put("/:notificationId/mark-read", markAsRead);

// Mark single notification as unread
router.put("/:notificationId/mark-unread", markAsUnread);

// Mark multiple notifications as read
router.put("/mark-read", markMultipleAsRead);

// Mark all notifications as read
router.put("/mark-all-read", markAllAsRead);

// Delete single notification
router.delete("/:notificationId", deleteNotification);

// Delete multiple notifications
router.delete("/", deleteMultipleNotifications);

// Delete all read notifications
router.delete("/delete-all-read", deleteAllRead);

// Clear all notifications
router.delete("/clear-all", clearAllNotifications);

export default router;
