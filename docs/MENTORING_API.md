# Student Mentoring System API Documentation

## Overview

This documentation covers the backend API for the student mentoring system. The system allows students to:

1. Register with their year and current semester
2. Select strong subjects from previous semesters they can mentor
3. Find mentors for subjects they need help with
4. Manage their mentoring preferences and profile

## Core Concept

- **Strong Subjects**: Subjects from previous semesters that a student excels in and can teach to juniors
- **Mentoring Flow**: Students in semester 3 can select strong subjects from semesters 1-2, students in semester 5 can select from semesters 1-4, etc.
- **Mentor Discovery**: Students can find seniors who have marked specific subjects as their strong subjects

## API Endpoints

### Student Registration and Profile

#### POST `/api/students/register`

Register a new student profile.

**Request Body:**

```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "branch": "Computer",
  "year": 2,
  "currentSemester": 3
}
```

**Validation Rules:**

- `year`: 1-4
- `currentSemester`: 1-8
- `branch`: "Computer", "IT", "AIML", "ECS"
- Year-semester consistency enforced

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "student_id",
    "user_id": "user_id",
    "name": "John Doe",
    "phone": "+1234567890",
    "branch": "Computer",
    "year": 2,
    "currentSemester": 3,
    "profileCompleted": false,
    "strongSubjects": [],
    "mentorPreferences": {
      "isAvailableForMentoring": true,
      "maxMentees": 5,
      "preferredTeachingMode": "both"
    }
  },
  "message": "Student profile created successfully"
}
```

#### GET `/api/students/profile`

Get current student's profile.

#### PUT `/api/students/profile`

Update student profile (basic information).

#### DELETE `/api/students/profile`

Delete student profile.

### Profile Image Management

#### POST `/api/students/profile/image`

Upload profile image.

**Content-Type:** `multipart/form-data`
**Field:** `profileImage` (image file, max 5MB)

**Supported formats:** JPEG, PNG, GIF, WebP

### Mentoring Features

#### GET `/api/students/mentoring/available-subjects`

Get subjects from previous semesters that student can mark as strong subjects.

**Requirements:**

- Complete profile
- Current semester > 1

**Response:**

```json
{
  "success": true,
  "data": {
    "availableSemesters": [1, 2],
    "currentSemester": 3,
    "subjectsBySemester": {
      "1": [
        {
          "_id": "subject_id",
          "subject_name": "Mathematics-I",
          "subject_code": "MATH101",
          "semester": 1,
          "credits": 4
        }
      ],
      "2": [...]
    }
  },
  "message": "Available subjects fetched successfully"
}
```

#### POST `/api/students/mentoring/strong-subjects`

Add/update strong subjects that student can mentor.

**Request Body:**

```json
{
  "strongSubjects": [
    {
      "subject_id": "subject_id_1",
      "confidenceLevel": 4
    },
    {
      "subject_id": "subject_id_2",
      "confidenceLevel": 5
    }
  ]
}
```

**Validation:**

- All subjects must be from previous semesters
- `confidenceLevel`: 1-5 (optional, default: 3)
- Subjects must belong to student's branch

#### PUT `/api/students/mentoring/preferences`

Update mentoring preferences.

**Request Body:**

```json
{
  "isAvailableForMentoring": true,
  "maxMentees": 8,
  "preferredTeachingMode": "online",
  "availableTimeSlots": [
    {
      "day": "Monday",
      "startTime": "14:00",
      "endTime": "16:00"
    },
    {
      "day": "Wednesday",
      "startTime": "10:00",
      "endTime": "12:00"
    }
  ]
}
```

**Validation:**

- `maxMentees`: 1-20
- `preferredTeachingMode`: "online", "offline", "both"
- `availableTimeSlots`: Array of time slots with day, startTime, endTime

### Subject and Mentor Discovery

#### GET `/api/students/subjects/with-mentors`

Get all subjects for student's branch with mentor count.

**Response:**

```json
{
  "success": true,
  "data": {
    "subjectsBySemester": {
      "1": [
        {
          "_id": "subject_id",
          "subject_name": "Mathematics-I",
          "subject_code": "MATH101",
          "semester": 1,
          "credits": 4,
          "mentorCount": 12
        }
      ]
    },
    "totalSubjects": 25,
    "studentInfo": {
      "branch": "Computer",
      "currentSemester": 3,
      "year": 2
    }
  }
}
```

#### GET `/api/students/mentors/subject/:subjectId`

Find mentors for a specific subject.

**Response:**

```json
{
  "success": true,
  "data": {
    "subject": {
      "_id": "subject_id",
      "subject_name": "Mathematics-I",
      "subject_code": "MATH101",
      "semester": 1
    },
    "mentors": [
      {
        "_id": "mentor_id",
        "name": "Senior Student",
        "profileImage": "image_url",
        "year": 3,
        "currentSemester": 5,
        "cgpa": 8.5,
        "user": {
          "email": "mentor@example.com",
          "username": "mentor_username"
        },
        "mentorPreferences": {
          "preferredTeachingMode": "both",
          "availableTimeSlots": [...]
        },
        "strongSubjectInfo": {
          "confidenceLevel": 4,
          "addedAt": "2024-01-15T10:30:00Z"
        },
        "lastActiveAt": "2024-01-20T15:45:00Z"
      }
    ],
    "totalMentors": 8
  }
}
```

### Academic Information

#### PUT `/api/students/academic-info`

Update academic information.

**Request Body:**

```json
{
  "cgpa": 8.5,
  "completedSemesters": [
    {
      "semester": 1,
      "gpa": 8.2,
      "completedAt": "2023-12-15T00:00:00Z"
    },
    {
      "semester": 2,
      "gpa": 8.8,
      "completedAt": "2024-05-15T00:00:00Z"
    }
  ]
}
```

### Additional Endpoints

#### GET `/api/students/subjects/:branch/:semester`

Get subjects for a specific branch and semester.

#### GET `/api/students/all`

Get all students (with pagination and filters).

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `branch`: Filter by branch
- `year`: Filter by year
- `currentSemester`: Filter by current semester

#### GET `/api/students/:studentId`

Get student details by ID.

## Data Models

### Student Model Structure

```javascript
{
  user_id: ObjectId, // Reference to User
  name: String,
  phone: String,
  branch: String, // "Computer", "IT", "AIML", "ECS"
  year: Number, // 1-4
  currentSemester: Number, // 1-8
  profileImage: String, // Cloudinary URL

  strongSubjects: [
    {
      subject_id: ObjectId, // Reference to Subject
      semester: Number,
      confidenceLevel: Number, // 1-5
      addedAt: Date
    }
  ],

  academicInfo: {
    cgpa: Number, // 0-10
    completedSemesters: [
      {
        semester: Number,
        gpa: Number,
        completedAt: Date
      }
    ]
  },

  mentorPreferences: {
    isAvailableForMentoring: Boolean,
    maxMentees: Number, // 1-20
    preferredTeachingMode: String, // "online", "offline", "both"
    availableTimeSlots: [
      {
        day: String, // "Monday", "Tuesday", etc.
        startTime: String, // "HH:MM"
        endTime: String // "HH:MM"
      }
    ]
  },

  profileCompleted: Boolean,
  lastActiveAt: Date,
  isActive: Boolean
}
```

### Subject Model Structure

```javascript
{
  branch: String, // "Computer", "IT", "AIML", "ECS"
  semester: Number, // 1-8
  subject_name: String,
  subject_code: String,
  credits: Number,
  isActive: Boolean
}
```

## Key Business Rules

1. **Semester Progression**: Students can only select strong subjects from semesters they have completed
2. **Branch Restriction**: Students can only mentor subjects from their own branch
3. **Profile Completion**: Mentoring features require complete profile (basic info + strong subjects)
4. **Mentor Discovery**: Mentors are sorted by CGPA, confidence level, and recent activity
5. **Year Validation**: Semester must be consistent with year (Year 1: Sem 1-2, Year 2: Sem 3-4, etc.)

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

Common status codes:

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Authentication

All endpoints require authentication via JWT token in:

- Header: `Authorization: Bearer <token>`
- Cookie: `token=<jwt_token>`

## Performance Optimizations

1. **Database Indexes**: Optimized indexes for mentor discovery queries
2. **Pagination**: All list endpoints support pagination
3. **Selective Population**: Only necessary fields are populated in responses
4. **Caching**: Profile completeness and mentor counts can be cached
5. **Compound Queries**: Efficient aggregation for mentor statistics

## Future Enhancements

1. **Mentor-Mentee Matching**: Automatic pairing based on preferences
2. **Session Management**: Booking and scheduling mentoring sessions
3. **Rating System**: Student ratings for mentors
4. **Notifications**: Real-time updates for mentor requests
5. **Analytics**: Mentoring effectiveness tracking
