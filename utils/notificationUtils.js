import Notification from "../models/notification.js";
import {
  sendNotificationToUser,
  sendNotificationToUsers,
} from "./socketConfig.js";

// Notification message templates
const NOTIFICATION_TEMPLATES = {
  // Mentorship Requests
  mentorship_request_received: {
    title: "New Mentorship Request",
    getMessage: (senderName, subjectName) =>
      `${senderName} has sent you a mentorship request for ${subjectName}`,
  },
  mentorship_request_accepted: {
    title: "Mentorship Request Accepted",
    getMessage: (senderName, subjectName) =>
      `${senderName} has accepted your mentorship request for ${subjectName}`,
  },
  mentorship_request_rejected: {
    title: "Mentorship Request Declined",
    getMessage: (senderName, subjectName) =>
      `${senderName} has declined your mentorship request for ${subjectName}`,
  },

  // Official Mentor Requests
  official_mentor_request_received: {
    title: "New Professional Mentorship Request",
    getMessage: (senderName) =>
      `${senderName} has sent you a professional mentorship request`,
  },
  official_mentor_request_accepted: {
    title: "Professional Mentorship Request Accepted",
    getMessage: (senderName) =>
      `${senderName} has accepted your professional mentorship request`,
  },
  official_mentor_request_rejected: {
    title: "Professional Mentorship Request Declined",
    getMessage: (senderName) =>
      `${senderName} has declined your professional mentorship request`,
  },

  // Connections
  new_mentor_connection: {
    title: "New Mentor Connected",
    getMessage: (mentorName, subjectName) =>
      `You are now connected with ${mentorName} as your mentor for ${subjectName}`,
  },
  new_mentee_connection: {
    title: "New Mentee Connected",
    getMessage: (menteeName, subjectName) =>
      `${menteeName} is now your mentee for ${subjectName}`,
  },
  mentorship_ended: {
    title: "Mentorship Ended",
    getMessage: (userName) => `Your mentorship with ${userName} has been ended`,
  },
  mentee_removed: {
    title: "Mentee Removed",
    getMessage: (menteeName) =>
      `${menteeName} has been removed from your mentee list`,
  },

  // Ratings
  rating_received: {
    title: "New Rating Received",
    getMessage: (raterName, score) =>
      `${raterName} has rated you ${score}/5 stars`,
  },
  rating_request: {
    title: "Rating Request",
    getMessage: (userName) =>
      `Please rate your mentorship experience with ${userName}`,
  },

  // System
  system_announcement: {
    title: "System Announcement",
    getMessage: (message) => message,
  },
};

// Create and send notification
export const createAndSendNotification = async (notificationData) => {
  try {
    // Create notification in database
    const notification = await Notification.createNotification(
      notificationData
    );

    // Send real-time notification via Socket.IO
    sendNotificationToUser(notificationData.recipient, notification);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Create mentorship request notification
export const notifyMentorshipRequest = async (
  recipientId,
  senderId,
  senderName,
  subjectName,
  requestId,
  subjectId
) => {
  const template = NOTIFICATION_TEMPLATES.mentorship_request_received;

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type: "mentorship_request_received",
    title: template.title,
    message: template.getMessage(senderName, subjectName),
    data: {
      requestId,
      subjectId,
      redirectUrl: "/dashboard/requests",
    },
    priority: "high",
  });
};

// Create mentorship response notification
export const notifyMentorshipResponse = async (
  recipientId,
  senderId,
  senderName,
  subjectName,
  status,
  requestId,
  subjectId
) => {
  const type =
    status === "accepted"
      ? "mentorship_request_accepted"
      : "mentorship_request_rejected";
  const template = NOTIFICATION_TEMPLATES[type];

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type,
    title: template.title,
    message: template.getMessage(senderName, subjectName),
    data: {
      requestId,
      subjectId,
      redirectUrl:
        status === "accepted" ? "/dashboard/mentors" : "/dashboard/requests",
    },
    priority: status === "accepted" ? "high" : "medium",
  });
};

// Create official mentor request notification
export const notifyOfficialMentorRequest = async (
  recipientId,
  senderId,
  senderName,
  requestId
) => {
  const template = NOTIFICATION_TEMPLATES.official_mentor_request_received;

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type: "official_mentor_request_received",
    title: template.title,
    message: template.getMessage(senderName),
    data: {
      requestId,
      redirectUrl: "/mentor/requests",
    },
    priority: "high",
  });
};

// Create official mentor response notification
export const notifyOfficialMentorResponse = async (
  recipientId,
  senderId,
  senderName,
  status,
  requestId
) => {
  const type =
    status === "accepted"
      ? "official_mentor_request_accepted"
      : "official_mentor_request_rejected";
  const template = NOTIFICATION_TEMPLATES[type];

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type,
    title: template.title,
    message: template.getMessage(senderName),
    data: {
      requestId,
      redirectUrl:
        status === "accepted"
          ? "/dashboard/official-mentors"
          : "/dashboard/requests",
    },
    priority: status === "accepted" ? "high" : "medium",
  });
};

// Create new connection notification
export const notifyNewConnection = async (
  recipientId,
  senderId,
  senderName,
  connectionType,
  subjectName = null,
  mentorshipId
) => {
  const type =
    connectionType === "mentor"
      ? "new_mentor_connection"
      : "new_mentee_connection";
  const template = NOTIFICATION_TEMPLATES[type];

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type,
    title: template.title,
    message: subjectName
      ? template.getMessage(senderName, subjectName)
      : template.getMessage(senderName),
    data: {
      mentorshipId,
      redirectUrl:
        connectionType === "mentor"
          ? "/dashboard/mentors"
          : "/dashboard/mentees",
    },
    priority: "high",
  });
};

// Create mentorship ended notification
export const notifyMentorshipEnded = async (
  recipientId,
  senderId,
  senderName,
  mentorshipId
) => {
  const template = NOTIFICATION_TEMPLATES.mentorship_ended;

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type: "mentorship_ended",
    title: template.title,
    message: template.getMessage(senderName),
    data: {
      mentorshipId,
      redirectUrl: "/dashboard",
    },
    priority: "medium",
  });
};

// Create mentee removed notification
export const notifyMenteeRemoved = async (
  recipientId,
  senderId,
  menteeName,
  mentorshipId
) => {
  const template = NOTIFICATION_TEMPLATES.mentee_removed;

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type: "mentee_removed",
    title: template.title,
    message: template.getMessage(menteeName),
    data: {
      mentorshipId,
      redirectUrl: "/dashboard",
    },
    priority: "low",
  });
};

// Create rating received notification
export const notifyRatingReceived = async (
  recipientId,
  senderId,
  raterName,
  rating,
  mentorshipId
) => {
  const template = NOTIFICATION_TEMPLATES.rating_received;

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type: "rating_received",
    title: template.title,
    message: template.getMessage(raterName, rating.score),
    data: {
      mentorshipId,
      rating,
      redirectUrl: "/dashboard/ratings",
    },
    priority: "medium",
  });
};

// Create rating request notification
export const notifyRatingRequest = async (
  recipientId,
  senderId,
  userName,
  mentorshipId
) => {
  const template = NOTIFICATION_TEMPLATES.rating_request;

  return createAndSendNotification({
    recipient: recipientId,
    sender: senderId,
    type: "rating_request",
    title: template.title,
    message: template.getMessage(userName),
    data: {
      mentorshipId,
      redirectUrl: "/dashboard/rate",
    },
    priority: "low",
  });
};

// Create system announcement
export const notifySystemAnnouncement = async (
  userIds,
  message,
  priority = "medium"
) => {
  const template = NOTIFICATION_TEMPLATES.system_announcement;

  const notifications = await Promise.all(
    userIds.map((userId) =>
      createAndSendNotification({
        recipient: userId,
        sender: null, // System notifications don't have a sender
        type: "system_announcement",
        title: template.title,
        message: template.getMessage(message),
        data: {
          redirectUrl: "/dashboard",
        },
        priority,
      })
    )
  );

  return notifications;
};

// Bulk notification utilities
export const notifyMultipleUsers = async (userIds, notificationData) => {
  try {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        Notification.createNotification({
          ...notificationData,
          recipient: userId,
        })
      )
    );

    // Send real-time notifications
    sendNotificationToUsers(userIds, notifications[0]);

    return notifications;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw error;
  }
};

export default {
  createAndSendNotification,
  notifyMentorshipRequest,
  notifyMentorshipResponse,
  notifyOfficialMentorRequest,
  notifyOfficialMentorResponse,
  notifyNewConnection,
  notifyMentorshipEnded,
  notifyMenteeRemoved,
  notifyRatingReceived,
  notifyRatingRequest,
  notifySystemAnnouncement,
  notifyMultipleUsers,
};
