import Notification from "../models/notification.js";
import asyncHandler from "express-async-handler";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Get user notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20, isRead, type } = req.query;

  const query = {
    recipient: userId,
    isDeleted: false,
  };

  // Filter by read status if specified
  if (isRead !== undefined) {
    query.isRead = isRead === "true";
  }

  // Filter by notification type if specified
  if (type && type !== "all") {
    // Map frontend type names to backend type patterns
    const typePatterns = {
      mentorship: /mentorship|mentor|mentee/i,
      system: /system|announcement/i,
      rating: /rating/i,
    };

    if (typePatterns[type]) {
      query.type = { $regex: typePatterns[type] };
    }
  }

  const notifications = await Notification.find(query)
    .populate("sender", "fullName email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const totalNotifications = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalNotifications / limit),
          totalNotifications,
          hasNextPage: page * limit < totalNotifications,
          hasPreviousPage: page > 1,
        },
        unreadCount,
      },
      "Notifications retrieved successfully"
    )
  );
});

// Get unread notifications count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { unreadCount },
        "Unread count retrieved successfully"
      )
    );
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

// Mark notification as unread
export const markAsUnread = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    { isRead: false },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as unread"));
});

// Mark multiple notifications as read
export const markMultipleAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new ApiError(400, "Notification IDs array is required");
  }

  const result = await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId,
    },
    { isRead: true }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `${result.modifiedCount} notifications marked as read`
      )
    );
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
      isDeleted: false,
    },
    { isRead: true }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `All notifications marked as read`
      )
    );
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    { isDeleted: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Notification deleted successfully"));
});

// Delete multiple notifications
export const deleteMultipleNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw new ApiError(400, "Notification IDs array is required");
  }

  const result = await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId,
    },
    { isDeleted: true }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `${result.modifiedCount} notifications deleted`
      )
    );
});

// Clear all notifications (mark as deleted)
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isDeleted: false,
    },
    { isDeleted: true }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `All notifications cleared`
      )
    );
});

// Delete all read notifications
export const deleteAllRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: true,
      isDeleted: false,
    },
    { isDeleted: true }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `${result.modifiedCount} read notifications deleted`
      )
    );
});

// Get notification by ID
export const getNotificationById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
    isDeleted: false,
  }).populate("sender", "fullName email");

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  // Mark as read when viewed
  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, notification, "Notification retrieved successfully")
    );
});

// Get notification statistics
export const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await Notification.aggregate([
    {
      $match: {
        recipient: userId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        unreadCount: {
          $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
        },
        latestNotification: { $max: "$createdAt" },
      },
    },
  ]);

  const totalStats = {
    total: await Notification.countDocuments({
      recipient: userId,
      isDeleted: false,
    }),
    unread: await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false,
    }),
    today: await Notification.countDocuments({
      recipient: userId,
      isDeleted: false,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    }),
    thisWeek: await Notification.countDocuments({
      recipient: userId,
      isDeleted: false,
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        byType: stats,
        overall: totalStats,
      },
      "Notification statistics retrieved successfully"
    )
  );
});

export default {
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
};
