import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

let io;
const connectedUsers = new Map(); // userId -> socketId

// Initialize Socket.IO server
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected with socket ${socket.id}`);

    // Store user connection
    connectedUsers.set(socket.userId, socket.id);

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Handle joining specific rooms based on user role
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.userId} joined room: ${roomId}`);
    });

    // Handle leaving rooms
    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.userId} left room: ${roomId}`);
    });

    // Handle marking notifications as read
    socket.on("mark_notifications_read", (notificationIds) => {
      // This will be handled by the notification controller
      socket.emit("notifications_marked_read", { notificationIds });
    });

    // Handle user going online/offline status
    socket.on("user_status", (status) => {
      socket.broadcast.emit("user_status_changed", {
        userId: socket.userId,
        status: status, // 'online', 'away', 'busy'
      });
    });

    // Handle typing indicators (for future chat feature)
    socket.on("typing_start", (data) => {
      socket.to(`user_${data.recipientId}`).emit("user_typing", {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      socket.to(`user_${data.recipientId}`).emit("user_typing", {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
      connectedUsers.delete(socket.userId);

      // Notify others that user went offline
      socket.broadcast.emit("user_status_changed", {
        userId: socket.userId,
        status: "offline",
      });
    });
  });

  return io;
};

// Get Socket.IO instance
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

// Check if user is online
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId.toString());
};

// Get user's socket ID
export const getUserSocketId = (userId) => {
  return connectedUsers.get(userId.toString());
};

// Send notification to specific user
export const sendNotificationToUser = (userId, notification) => {
  const io = getIO();
  const userRoom = `user_${userId}`;

  io.to(userRoom).emit("new_notification", {
    ...notification.toObject(),
    timestamp: new Date(),
  });

  console.log(`Notification sent to user ${userId}:`, notification.title);
};

// Send notification to multiple users
export const sendNotificationToUsers = (userIds, notification) => {
  const io = getIO();

  userIds.forEach((userId) => {
    const userRoom = `user_${userId}`;
    io.to(userRoom).emit("new_notification", {
      ...notification.toObject(),
      timestamp: new Date(),
    });
  });

  console.log(
    `Notification sent to ${userIds.length} users:`,
    notification.title
  );
};

// Send real-time update for mentorship status
export const sendMentorshipUpdate = (userId, updateType, data) => {
  const io = getIO();
  const userRoom = `user_${userId}`;

  io.to(userRoom).emit("mentorship_update", {
    type: updateType,
    data,
    timestamp: new Date(),
  });

  console.log(`Mentorship update sent to user ${userId}:`, updateType);
};

// Send rating update notification
export const sendRatingUpdate = (userId, ratingData) => {
  const io = getIO();
  const userRoom = `user_${userId}`;

  io.to(userRoom).emit("rating_update", {
    ...ratingData,
    timestamp: new Date(),
  });

  console.log(`Rating update sent to user ${userId}`);
};

// Broadcast to all connected users (for system announcements)
export const broadcastToAll = (event, data) => {
  const io = getIO();
  io.emit(event, {
    ...data,
    timestamp: new Date(),
  });

  console.log(`Broadcast sent to all users:`, event);
};

// Send to specific role users (students/mentors)
export const sendToRole = (role, event, data) => {
  const io = getIO();

  // Get all connected sockets and filter by role
  const sockets = io.sockets.sockets;
  sockets.forEach((socket) => {
    if (socket.userRole === role) {
      socket.emit(event, {
        ...data,
        timestamp: new Date(),
      });
    }
  });

  console.log(`Event sent to all ${role}s:`, event);
};

export default {
  initializeSocket,
  getIO,
  isUserOnline,
  getUserSocketId,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendMentorshipUpdate,
  sendRatingUpdate,
  broadcastToAll,
  sendToRole,
};
