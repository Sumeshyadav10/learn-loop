# Real-Time Notifications & Rating System

This document outlines the implementation of real-time notifications using Socket.IO and the rating system for the mentorship platform.

## 🔔 Real-Time Notification System

### Overview

The platform now includes a comprehensive real-time notification system that instantly notifies users about:

- Mentorship requests and responses
- New connections
- Ratings received
- System announcements

### Technology Stack

- **Socket.IO**: Real-time bidirectional communication
- **MongoDB**: Persistent notification storage
- **JWT**: Authentication for socket connections

### Socket.IO Integration

#### Server Setup

```javascript
// server.js
import { createServer } from "http";
import { initializeSocket } from "./utils/socketConfig.js";

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO initialized`);
});
```

#### Client Connection

```javascript
// Frontend implementation
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token"),
  },
});

// Listen for notifications
socket.on("new_notification", (notification) => {
  showNotification(notification);
});

// Listen for mentorship updates
socket.on("mentorship_update", (update) => {
  handleMentorshipUpdate(update);
});

// Listen for rating updates
socket.on("rating_update", (rating) => {
  handleRatingUpdate(rating);
});
```

### Notification Types

#### 1. Mentorship Request Notifications

- **Type**: `mentorship_request_received`
- **Trigger**: When a student sends a mentorship request
- **Recipients**: Target mentor
- **Real-time Event**: `mentorship_update` with type `new_request`

#### 2. Request Response Notifications

- **Type**: `mentorship_request_accepted` / `mentorship_request_rejected`
- **Trigger**: When mentor responds to request
- **Recipients**: Request sender
- **Real-time Event**: `mentorship_update` with type `request_response`

#### 3. Connection Notifications

- **Type**: `new_mentor_connection` / `new_mentee_connection`
- **Trigger**: When mentorship is accepted
- **Recipients**: Both mentor and mentee
- **Real-time Event**: `mentorship_update` with type `new_connection`

#### 4. Rating Notifications

- **Type**: `rating_received`
- **Trigger**: When user receives a rating
- **Recipients**: Rated user
- **Real-time Event**: `rating_update`

### API Endpoints

#### Notification Management

```
GET    /api/notifications                    # Get user notifications
GET    /api/notifications/unread-count       # Get unread count
GET    /api/notifications/stats              # Get notification statistics
GET    /api/notifications/:id                # Get specific notification
PUT    /api/notifications/:id/read           # Mark as read
PUT    /api/notifications/read               # Mark multiple as read
PUT    /api/notifications/read-all           # Mark all as read
DELETE /api/notifications/:id                # Delete notification
DELETE /api/notifications                    # Delete multiple
DELETE /api/notifications/clear-all          # Clear all notifications
```

## ⭐ Rating System

### Overview

The rating system allows users to rate their mentorship experiences on a scale of 1-5 stars with optional feedback.

### Rating Types

#### 1. Student-to-Student Mentorship Ratings

- **Mentee rates Mentor**: Rate the student who provided mentoring
- **Mentor rates Mentee**: Rate the student who received mentoring
- **Requirement**: Connection must be active for at least 7 days

#### 2. Official Mentor Ratings

- **Student rates Official Mentor**: Rate professional mentors
- **Requirement**: Connection must be active for at least 7 days

### Database Schema

#### Student Model Enhancements

```javascript
// Student mentorship connections with ratings
mentorshipConnections: {
  mentors: [{
    mentor_id: ObjectId,
    subject_id: ObjectId,
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: { type: String, maxlength: 500 },
      ratedAt: Date
    }
  }],
  mentees: [{
    mentee_id: ObjectId,
    subject_id: ObjectId,
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: { type: String, maxlength: 500 },
      ratedAt: Date
    }
  }]
},

// Official mentor ratings
officialMentors: {
  activeMentors: [{
    mentor_id: ObjectId,
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: { type: String, maxlength: 500 },
      ratedAt: Date
    }
  }]
}
```

### Rating API Endpoints

```
POST   /api/ratings/student-mentor          # Rate a student mentor
POST   /api/ratings/student-mentee          # Rate a student mentee
POST   /api/ratings/official-mentor         # Rate an official mentor
GET    /api/ratings/given                   # Get ratings given by user
GET    /api/ratings/received                # Get ratings received by user
GET    /api/ratings/pending                 # Get pending ratings (eligible to rate)
```

### Rating Request Examples

#### Rate Student Mentor

```json
POST /api/ratings/student-mentor
{
  "mentorId": "60d5ecb74f123456789abcde",
  "rating": 5,
  "feedback": "Excellent mentor! Very helpful and patient."
}
```

#### Rate Official Mentor

```json
POST /api/ratings/official-mentor
{
  "mentorId": "60d5ecb74f123456789abcde",
  "rating": 4,
  "feedback": "Great industry insights and guidance."
}
```

### Rating Restrictions

1. **One Rating Per Relationship**: Users can only rate each mentor/mentee once
2. **Minimum Connection Duration**: Must be connected for at least 7 days
3. **Active Relationship Required**: Can only rate active mentorship relationships
4. **Valid Rating Range**: Ratings must be integers between 1-5

### Rating Analytics

#### For Individual Users

```javascript
// Example response from GET /api/ratings/received
{
  "asStudentMentor": [],
  "asOfficialMentor": [],
  "averageRatings": {
    "studentMentor": 4.2,
    "officialMentor": 4.8,
    "overall": 4.5
  },
  "totalRatings": {
    "studentMentor": 5,
    "officialMentor": 3,
    "overall": 8
  }
}
```

## 🚀 Real-Time Features

### Live Updates

- **Instant Notifications**: Users receive notifications immediately
- **Connection Status**: Real-time mentorship status updates
- **Rating Alerts**: Immediate notification when rated
- **Request Updates**: Live request status changes

### User Presence

- **Online Status**: Track user online/offline status
- **Typing Indicators**: Show when users are typing (for future chat)
- **Last Seen**: Track user activity

### Event Broadcasting

- **System Announcements**: Broadcast to all users
- **Role-Based Messages**: Send to specific user roles
- **Targeted Updates**: Send to specific users or groups

## 📱 Frontend Integration Guide

### Socket Connection Setup

```javascript
// utils/socket.js
import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    this.socket = io(process.env.REACT_APP_SERVER_URL, {
      auth: { token },
    });

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("new_notification", this.handleNotification);
    this.socket.on("mentorship_update", this.handleMentorshipUpdate);
    this.socket.on("rating_update", this.handleRatingUpdate);
  }

  handleNotification = (notification) => {
    // Show toast notification
    toast.info(notification.message);

    // Update notification state
    updateNotificationStore(notification);
  };

  handleMentorshipUpdate = (update) => {
    // Update mentorship data
    updateMentorshipStore(update);
  };

  handleRatingUpdate = (rating) => {
    // Show rating notification
    showRatingNotification(rating);
  };

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
```

### Notification Component

```jsx
// components/NotificationCenter.jsx
import React, { useState, useEffect } from "react";
import { getNotifications, markAsRead } from "../api/notifications";

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const response = await getNotifications();
    setNotifications(response.data.notifications);
    setUnreadCount(response.data.unreadCount);
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
    fetchNotifications();
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </div>

      <div className="notification-list">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
};
```

### Rating Component

```jsx
// components/RatingForm.jsx
import React, { useState } from "react";
import { rateStudentMentor } from "../api/ratings";

const RatingForm = ({ mentorId, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await rateStudentMentor({ mentorId, rating, feedback });
      onSubmit();
      toast.success("Rating submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit rating");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rating-form">
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating ? "active" : ""}`}
            onClick={() => setRating(star)}
          >
            ⭐
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Share your feedback (optional)"
        maxLength={500}
      />

      <button type="submit" disabled={rating === 0}>
        Submit Rating
      </button>
    </form>
  );
};
```

## 🔧 Configuration

### Environment Variables

```env
# Socket.IO Configuration
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret

# Database
MONGODB_URI=mongodb://localhost:27017/mentorship_platform
```

### Database Indexes

```javascript
// Notification indexes for performance
db.notifications.createIndex({ recipient: 1, isRead: 1 });
db.notifications.createIndex({ recipient: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1 });

// Rating indexes
db.students.createIndex({ "mentorshipConnections.mentors.rating.score": 1 });
db.students.createIndex({ "officialMentors.activeMentors.rating.score": 1 });
```

## 🎯 Best Practices

### Notification Management

1. **Rate Limiting**: Prevent spam notifications
2. **Batch Processing**: Group similar notifications
3. **Expiration**: Auto-expire old notifications
4. **User Preferences**: Allow notification settings

### Rating System

1. **Validation**: Ensure valid rating ranges
2. **One-Time Rating**: Prevent multiple ratings
3. **Minimum Duration**: Require meaningful connection time
4. **Feedback Moderation**: Monitor feedback content

### Performance

1. **Connection Pooling**: Manage socket connections efficiently
2. **Database Indexing**: Optimize queries with proper indexes
3. **Caching**: Cache frequently accessed data
4. **Error Handling**: Graceful degradation for failed notifications

## 🐛 Troubleshooting

### Common Issues

#### Socket Connection Fails

```javascript
// Check authentication
socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
  // Refresh token and retry
});
```

#### Notifications Not Received

```javascript
// Verify user is in correct room
socket.emit("join_room", `user_${userId}`);

// Check notification creation
const notification = await Notification.findById(notificationId);
console.log("Notification exists:", !!notification);
```

#### Rating Submission Fails

```javascript
// Verify relationship exists and is eligible
const relationship = await Student.findOne({
  "mentorshipConnections.mentors.mentor_id": mentorId,
  "mentorshipConnections.mentors.isActive": true,
});
```

This implementation provides a robust real-time notification system and comprehensive rating functionality for the mentorship platform!
