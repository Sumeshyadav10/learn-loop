import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Mentorship Request Notifications
        "mentorship_request_received",
        "mentorship_request_accepted",
        "mentorship_request_rejected",
        "official_mentor_request_received",
        "official_mentor_request_accepted",
        "official_mentor_request_rejected",

        // Connection Notifications
        "new_mentor_connection",
        "new_mentee_connection",
        "mentorship_ended",
        "mentee_removed",

        // Rating Notifications
        "rating_received",
        "rating_request",

        // General Notifications
        "profile_update",
        "new_message",
        "system_announcement",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      // Additional data specific to notification type
      mentorshipId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
      rating: {
        score: Number,
        feedback: String,
      },
      // For redirecting to specific pages
      redirectUrl: {
        type: String,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isDeleted: 1 });

// Virtual for checking if notification is recent (within last 24 hours)
notificationSchema.virtual("isRecent").get(function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo;
});

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (
  notificationData
) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification
      .populate("sender", "fullName email")
      .populate("recipient", "fullName email");
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function (
  userId,
  options = {}
) {
  const { page = 1, limit = 20, unreadOnly = false } = options;

  const query = {
    recipient: userId,
    isDeleted: false,
  };

  if (unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .populate("sender", "fullName email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = async function (
  userId,
  notificationIds
) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId,
    },
    { isRead: true }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false,
  });
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
