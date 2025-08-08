# Mentorship Connection System API Documentation

This document provides comprehensive API documentation for the mentorship connection system where students can send mentoring requests to seniors and manage mentor-mentee relationships.

## Overview

The mentorship connection system enables:

- Students to send mentorship requests to qualified mentors
- Mentors to accept/reject incoming requests
- Management of active mentor-mentee relationships
- Dashboard for tracking all mentorship activities

## Base URL

```
/api/student/mentoring
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

---

## 1. Send Mentorship Request

**Endpoint:** `POST /request`

**Description:** Send a mentorship request to a senior student for a specific subject.

**Request Body:**

```json
{
  "mentorId": "ObjectId", // Required: ID of the mentor student
  "subjectId": "ObjectId", // Required: ID of the subject
  "message": "string" // Optional: Personal message to mentor
}
```

**Example Request:**

```json
{
  "mentorId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "subjectId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "message": "Hi! I'm struggling with this subject and would really appreciate your guidance."
}
```

**Success Response (201):**

```json
{
  "statusCode": 201,
  "data": {
    "mentorName": "John Doe",
    "subjectName": "Data Structures and Algorithms",
    "message": "Mentorship request sent successfully"
  },
  "message": "Mentorship request sent successfully",
  "success": true
}
```

**Validation Rules:**

- Student must have complete profile
- Student must be in semester > 1
- Mentor must have the subject as a strong subject
- Mentor must be available for mentoring
- Mentor must have capacity for more mentees
- Student cannot already have a mentor for this subject
- Cannot send duplicate requests
- Both students must be from the same branch

---

## 2. Respond to Mentorship Request

**Endpoint:** `PUT /request/respond`

**Description:** Accept or reject an incoming mentorship request (mentor only).

**Request Body:**

```json
{
  "requestId": "ObjectId", // Required: ID of the request
  "response": "accepted" | "rejected" // Required: Response type
}
```

**Example Request:**

```json
{
  "requestId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "response": "accepted"
}
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "studentName": "Jane Smith",
    "subjectName": "Data Structures and Algorithms",
    "response": "accepted"
  },
  "message": "Mentorship request accepted successfully",
  "success": true
}
```

**Effects of Accepting:**

- Creates active mentorship relationship
- Adds student to mentor's mentees list
- Adds mentor to student's mentors list
- Updates both request records to "accepted" status

---

## 3. Get Incoming Mentorship Requests

**Endpoint:** `GET /requests/incoming`

**Description:** Get list of incoming mentorship requests (for mentors).

**Query Parameters:**

- `status` (optional): Filter by status (`pending`, `accepted`, `rejected`, `all`). Default: `pending`

**Example Request:**

```
GET /requests/incoming?status=pending
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
        "student_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j4",
          "name": "Jane Smith",
          "profileImage": "https://cloudinary.com/...",
          "year": 2023,
          "currentSemester": 3,
          "academicInfo": {
            "cgpa": 8.5,
            "totalCredits": 120
          },
          "user_id": {
            "email": "jane@example.com",
            "username": "janesmith"
          }
        },
        "subject_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
          "subject_name": "Data Structures and Algorithms",
          "subject_code": "CS201",
          "semester": 3
        },
        "message": "Hi! I'm struggling with this subject and would really appreciate your guidance.",
        "status": "pending",
        "requestedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "totalRequests": 1
  },
  "message": "Incoming mentorship requests retrieved successfully",
  "success": true
}
```

---

## 4. Get Outgoing Mentorship Requests

**Endpoint:** `GET /requests/outgoing`

**Description:** Get list of outgoing mentorship requests (for students).

**Query Parameters:**

- `status` (optional): Filter by status (`pending`, `accepted`, `rejected`, `all`). Default: `pending`

**Example Request:**

```
GET /requests/outgoing?status=all
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j5",
        "mentor_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "name": "John Doe",
          "profileImage": "https://cloudinary.com/...",
          "year": 2022,
          "currentSemester": 5,
          "user_id": {
            "email": "john@example.com",
            "username": "johndoe"
          }
        },
        "subject_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
          "subject_name": "Data Structures and Algorithms",
          "subject_code": "CS201",
          "semester": 3
        },
        "message": "Hi! I'm struggling with this subject and would really appreciate your guidance.",
        "status": "accepted",
        "requestedAt": "2024-01-15T10:30:00.000Z",
        "respondedAt": "2024-01-15T14:45:00.000Z"
      }
    ],
    "totalRequests": 1
  },
  "message": "Outgoing mentorship requests retrieved successfully",
  "success": true
}
```

---

## 5. Get Current Mentors

**Endpoint:** `GET /mentors`

**Description:** Get list of current active mentors (for students).

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "mentors": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j6",
        "mentor_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "name": "John Doe",
          "profileImage": "https://cloudinary.com/...",
          "year": 2022,
          "currentSemester": 5,
          "academicInfo": {
            "cgpa": 9.2,
            "totalCredits": 200
          },
          "mentorPreferences": {
            "isAvailableForMentoring": true,
            "maxMentees": 5,
            "preferredCommunication": "both"
          },
          "user_id": {
            "email": "john@example.com",
            "username": "johndoe"
          }
        },
        "subject_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
          "subject_name": "Data Structures and Algorithms",
          "subject_code": "CS201",
          "semester": 3
        },
        "connectedAt": "2024-01-15T14:45:00.000Z",
        "isActive": true,
        "lastInteraction": "2024-01-20T09:15:00.000Z"
      }
    ],
    "totalMentors": 1
  },
  "message": "Current mentors retrieved successfully",
  "success": true
}
```

---

## 6. Get Current Mentees

**Endpoint:** `GET /mentees`

**Description:** Get list of current active mentees (for mentors).

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "mentees": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j7",
        "mentee_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j4",
          "name": "Jane Smith",
          "profileImage": "https://cloudinary.com/...",
          "year": 2023,
          "currentSemester": 3,
          "academicInfo": {
            "cgpa": 8.5,
            "totalCredits": 120
          },
          "user_id": {
            "email": "jane@example.com",
            "username": "janesmith"
          }
        },
        "subject_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
          "subject_name": "Data Structures and Algorithms",
          "subject_code": "CS201",
          "semester": 3
        },
        "connectedAt": "2024-01-15T14:45:00.000Z",
        "isActive": true,
        "lastInteraction": "2024-01-20T09:15:00.000Z"
      }
    ],
    "totalMentees": 1,
    "maxMentees": 5,
    "canAcceptMore": true
  },
  "message": "Current mentees retrieved successfully",
  "success": true
}
```

---

## 7. End Mentorship Relationship

**Endpoint:** `PUT /relationship/end`

**Description:** End an active mentorship relationship (both mentor and mentee can initiate).

**Request Body:**

```json
{
  "relationshipId": "ObjectId", // Required: ID of the relationship
  "relationshipType": "mentor" | "mentee" // Required: Type of relationship to end
}
```

**Example Request:**

```json
{
  "relationshipId": "64f1a2b3c4d5e6f7g8h9i0j6",
  "relationshipType": "mentor"
}
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Mentorship relationship ended successfully",
  "success": true
}
```

**Effects:**

- Sets `isActive` to `false` for both parties
- Relationship remains in records for history
- Does not delete the relationship data

---

## 8. Get Mentorship Dashboard

**Endpoint:** `GET /dashboard`

**Description:** Get comprehensive dashboard data for mentorship activities.

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "mentee": {
      "pendingRequests": 2,
      "activeMentors": 1,
      "rejectedRequests": 0,
      "recentMentors": [
        {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j6",
          "mentor_id": {
            "name": "John Doe",
            "profileImage": "https://cloudinary.com/..."
          },
          "connectedAt": "2024-01-15T14:45:00.000Z"
        }
      ]
    },
    "mentor": {
      "pendingRequests": 3,
      "activeMentees": 2,
      "maxMentees": 5,
      "canAcceptMore": true,
      "recentMentees": [
        {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j7",
          "mentee_id": {
            "name": "Jane Smith",
            "profileImage": "https://cloudinary.com/..."
          },
          "connectedAt": "2024-01-15T14:45:00.000Z"
        }
      ]
    },
    "stats": {
      "totalConnections": 3,
      "strongSubjectsCount": 4,
      "isAvailableForMentoring": true
    }
  },
  "message": "Mentorship dashboard retrieved successfully",
  "success": true
}
```

---

## Error Responses

All endpoints can return the following error responses:

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Specific error message",
  "success": false
}
```

**Common 400 errors:**

- "Mentor ID and Subject ID are required"
- "Response must be 'accepted' or 'rejected'"
- "Mentor doesn't have this subject as strong subject"
- "You already have a mentor for this subject"
- "Request already sent to this mentor for this subject"

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Access denied. Please login to continue",
  "success": false
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Student profile not found",
  "success": false
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "success": false
}
```

---

## Usage Flow Examples

### For Students (Seeking Mentorship):

1. **Discover Mentors:**

   ```
   GET /api/student/mentors/subject/{subjectId}
   ```

2. **Send Request:**

   ```
   POST /api/student/mentoring/request
   ```

3. **Check Request Status:**

   ```
   GET /api/student/mentoring/requests/outgoing
   ```

4. **View Active Mentors:**
   ```
   GET /api/student/mentoring/mentors
   ```

### For Mentors (Providing Mentorship):

1. **Check Incoming Requests:**

   ```
   GET /api/student/mentoring/requests/incoming
   ```

2. **Respond to Request:**

   ```
   PUT /api/student/mentoring/request/respond
   ```

3. **View Active Mentees:**

   ```
   GET /api/student/mentoring/mentees
   ```

4. **Monitor Dashboard:**
   ```
   GET /api/student/mentoring/dashboard
   ```

---

## Business Rules

1. **Request Validation:**

   - Students can only request mentors from the same branch
   - Mentors must have the subject as a strong subject
   - Mentors must be available and have capacity
   - No duplicate requests allowed

2. **Relationship Management:**

   - One mentor per subject per student
   - Mentors can have multiple mentees (up to their limit)
   - Either party can end the relationship
   - Ended relationships are marked inactive, not deleted

3. **Data Integrity:**

   - All operations maintain consistency between both parties
   - Request status changes are synchronized
   - Relationship creation/termination affects both records

4. **Access Control:**
   - Only authenticated users can access endpoints
   - Users can only manage their own relationships
   - Complete profile required for mentoring features
