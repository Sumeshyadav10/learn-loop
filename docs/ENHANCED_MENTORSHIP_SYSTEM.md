# Enhanced Mentorship System - Complete API Documentation

This document covers the enhanced mentorship system that supports both **student-to-student mentoring** and **official professional mentoring** with special handling for 4th year students.

## System Architecture Overview

### 1. **Student-to-Student Mentoring**

- Students from years 1-4 can mentor each other
- Based on strong subjects from previous semesters
- Subject-specific mentoring relationships
- Peers helping peers within the same branch

### 2. **Official Professional Mentoring**

- Industry professionals with high designations
- Available for all students (1st-4th year)
- General career guidance and skill development
- Managed through separate mentor profiles

### 3. **4th Year Student Special Case**

- **Cannot get student mentors** (no seniors above them)
- **Only access to official mentors**
- **Can still mentor junior students** (1st, 2nd, 3rd year)
- **Enhanced official mentor discovery**

---

## API Endpoints Overview

### Student APIs (`/api/student/`)

#### Student-to-Student Mentoring

- `POST /mentoring/request` - Send request to student mentor
- `GET /mentors/subject/:subjectId` - Find student mentors for subject
- `GET /mentoring/mentors` - Get current student mentors
- `GET /mentoring/mentees` - Get current student mentees

#### Official Mentor System

- `GET /official-mentors/available` - Browse official mentors
- `POST /official-mentors/request` - Send request to official mentor
- `GET /official-mentors/current` - Get current official mentors
- `GET /official-mentors/requests` - Get official mentor requests

#### Enhanced Discovery

- `GET /mentors/subject/:subjectId/enhanced` - Smart mentor discovery (handles 4th year)

### Mentor APIs (`/api/mentor/`)

- `GET /requests/incoming` - View incoming requests from students
- `PUT /requests/respond` - Accept/reject student requests
- `GET /mentees` - View current mentees
- `GET /dashboard` - Mentor dashboard
- `PUT /relationship/end` - End mentorship relationship
- `POST /profile/image` - Upload/update profile image
- `PUT /profile` - Update mentor profile
- `GET /profile` - Get mentor profile

---

## Detailed API Documentation

### Enhanced Mentor Discovery

**Endpoint:** `GET /api/student/mentors/subject/:subjectId/enhanced`

**Description:** Smart mentor discovery that automatically handles different student years.

**Response for 1st-3rd Year Students:**

```json
{
  "statusCode": 200,
  "data": {
    "mentors": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Senior Student",
        "year": 3,
        "currentSemester": 5,
        "branch": "Computer",
        "academicInfo": {
          "cgpa": 9.2
        },
        "strongSubjects": [
          {
            "subject_id": {
              "subject_name": "Data Structures",
              "subject_code": "CS201"
            }
          }
        ]
      }
    ],
    "mentorType": "student",
    "subject": {
      "subject_name": "Data Structures",
      "subject_code": "CS201"
    }
  },
  "message": "Student mentors retrieved successfully"
}
```

**Response for 4th Year Students:**

```json
{
  "statusCode": 200,
  "data": {
    "mentors": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "name": "John Doe",
        "profileImage": "https://cloudinary.com/profile-images/john-doe.jpg",
        "designation": "Senior Software Engineer",
        "experience_years": 8,
        "skills": ["React", "Node.js", "System Design"],
        "bio": "Experienced full-stack developer with expertise in modern web technologies."
      }
    ],
    "mentorType": "official",
    "message": "As a 4th year student, you can only connect with official mentors"
  },
  "message": "Official mentors for 4th year student retrieved successfully"
}
```

### Official Mentor Request System

**Endpoint:** `POST /api/student/official-mentors/request`

**Description:** Send mentorship request to an official mentor.

**Request Body:**

```json
{
  "mentorId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "message": "Hi! I'm interested in learning about industry best practices and career guidance."
}
```

**Success Response:**

```json
{
  "statusCode": 201,
  "data": {
    "mentorName": "John Doe",
    "mentorDesignation": "Senior Software Engineer",
    "message": "Official mentorship request sent successfully"
  },
  "message": "Official mentorship request sent successfully"
}
```

### Get Current Official Mentors

**Endpoint:** `GET /api/student/official-mentors/current`

**Success Response:**

```json
{
  "statusCode": 200,
  "data": {
    "mentors": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j3",
        "mentor_id": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
          "name": "John Doe",
          "profileImage": "https://cloudinary.com/profile-images/john-doe.jpg",
          "designation": "Senior Software Engineer",
          "experience_years": 8,
          "skills": ["React", "Node.js", "System Design"],
          "bio": "Experienced full-stack developer...",
          "available_time_slots": [
            {
              "day": "Monday",
              "start_time": "10:00",
              "end_time": "12:00"
            }
          ]
        },
        "connectedAt": "2024-01-15T14:45:00.000Z",
        "isActive": true,
        "lastInteraction": "2024-01-20T09:15:00.000Z",
        "mentorshipGoals": ["Career guidance", "Technical skills"]
      }
    ],
    "totalMentors": 1
  },
  "message": "Current official mentors retrieved successfully"
}
```

### Mentor Dashboard (for Official Mentors)

**Endpoint:** `GET /api/mentor/dashboard`

**Success Response:**

```json
{
  "statusCode": 200,
  "data": {
    "requests": {
      "pending": 5,
      "accepted": 12,
      "rejected": 2,
      "total": 19
    },
    "mentees": {
      "active": 8,
      "recent": [
        {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j4",
          "name": "Alice Johnson",
          "profileImage": "https://cloudinary.com/...",
          "year": 4,
          "currentSemester": 7,
          "connectedAt": "2024-01-20T10:30:00.000Z"
        }
      ]
    },
    "mentor": {
      "name": "John Doe",
      "designation": "Senior Software Engineer",
      "experienceYears": 8,
      "skills": ["React", "Node.js", "System Design"]
    }
  },
  "message": "Mentor dashboard retrieved successfully"
}
```

### Get Incoming Mentorship Requests (for Mentors)

**Endpoint:** `GET /api/mentor/requests/incoming`

**Query Parameters:**

- `status` (optional): Filter by status (`pending`, `accepted`, `rejected`, `all`). Default: `pending`

**Success Response:**

```json
{
  "statusCode": 200,
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7g8h9i0j5",
        "student": {
          "_id": "64f1a2b3c4d5e6f7g8h9i0j6",
          "name": "Alice Johnson",
          "profileImage": "https://cloudinary.com/...",
          "year": 4,
          "currentSemester": 7,
          "branch": "Computer",
          "academicInfo": {
            "cgpa": 8.9,
            "totalCredits": 200
          },
          "user_id": {
            "email": "alice@example.com",
            "username": "alicejohnson"
          }
        },
        "message": "Hi! I'm interested in learning about industry best practices and career guidance.",
        "status": "pending",
        "requestedAt": "2024-01-22T09:30:00.000Z"
      }
    ],
    "totalRequests": 1
  },
  "message": "Incoming mentorship requests retrieved successfully"
}
```

### Respond to Mentorship Request (for Mentors)

**Endpoint:** `PUT /api/mentor/requests/respond`

**Request Body:**

```json
{
  "requestId": "64f1a2b3c4d5e6f7g8h9i0j5",
  "response": "accepted"
}
```

**Success Response:**

```json
{
  "statusCode": 200,
  "data": {
    "studentName": "Alice Johnson",
    "response": "accepted"
  },
  "message": "Mentorship request accepted successfully"
}
```

---

### Mentor Profile Image Upload

**Endpoint:** `POST /api/mentor/profile/image`

**Description:** Upload or update mentor profile image.

**Request Type:** `multipart/form-data`

**Form Data:**

- `profileImage` (file): Image file (JPG, PNG, etc.) - Max 5MB

**Example Request:**

```javascript
const formData = new FormData();
formData.append("profileImage", imageFile);

fetch("/api/mentor/profile/image", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
  body: formData,
});
```

**Success Response (200):**

```json
{
  "statusCode": 200,
  "data": {
    "profileImage": "https://res.cloudinary.com/yourcloud/image/upload/v1234567890/mentors/profile_abc123.jpg",
    "mentor": {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "name": "John Doe",
      "profileImage": "https://res.cloudinary.com/yourcloud/image/upload/v1234567890/mentors/profile_abc123.jpg",
      "designation": "Senior Software Engineer",
      "experience_years": 8,
      "skills": ["React", "Node.js", "System Design"],
      "bio": "Experienced full-stack developer...",
      "user_id": {
        "email": "john@example.com",
        "username": "johndoe"
      }
    }
  },
  "message": "Profile image updated successfully",
  "success": true
}
```

**Validation Rules:**

- File must be an image (image/jpeg, image/png, etc.)
- Maximum file size: 5MB
- Only authenticated mentors can upload
- Previous image is replaced with new one

---

## Business Logic & Rules

### Student Year-Based Access Control

#### 1st Year Students

- ✅ Can request mentorship from: 2nd, 3rd, 4th year students + Official mentors
- ✅ Can mentor: No one (first year, still learning)
- ✅ Subject access: Only current semester subjects for learning

#### 2nd Year Students

- ✅ Can request mentorship from: 3rd, 4th year students + Official mentors
- ✅ Can mentor: 1st year students
- ✅ Subject access: Previous semester subjects as strong subjects

#### 3rd Year Students

- ✅ Can request mentorship from: 4th year students + Official mentors
- ✅ Can mentor: 1st, 2nd year students
- ✅ Subject access: Previous semester subjects as strong subjects

#### 4th Year Students (**Special Case**)

- ❌ **Cannot request student mentors** (no seniors above them)
- ✅ **Can only request official mentors**
- ✅ Can mentor: 1st, 2nd, 3rd year students
- ✅ Subject access: All previous semester subjects

### Official Mentors (Professional)

- ✅ Available for **all student years**
- ✅ **No subject limitations** (general guidance)
- ✅ Industry professionals with high designations
- ✅ **Separate from student mentoring system**

### Data Relationships

#### Student Model Enhancement

```javascript
{
  // Student-to-Student Mentoring
  mentorshipConnections: {
    incomingRequests: [...],  // Students requesting this student
    outgoingRequests: [...],  // This student's requests to other students
    mentors: [...],           // This student's current student mentors
    mentees: [...]            // This student's current student mentees
  },

  // Official Professional Mentoring
  officialMentors: {
    outgoingRequests: [...],  // Requests sent to official mentors
    activeMentors: [...]      // Current official mentors
  }
}
```

#### Mentor Model (Official)

```javascript
{
  user_id: ObjectId,
  name: String,
  designation: String,      // "Senior Software Engineer", "Tech Lead", etc.
  experience_years: Number,
  skills: [String],
  bio: String,
  available_time_slots: [...],
  isActive: Boolean
}
```

---

## Frontend Integration Examples

### Smart Mentor Discovery Component

```javascript
const MentorDiscovery = ({ subjectId }) => {
  const [mentors, setMentors] = useState([]);
  const [mentorType, setMentorType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch(
          `/api/student/mentors/subject/${subjectId}/enhanced`,
          {
            headers: { Authorization: `Bearer ${getAuthToken()}` },
          }
        );

        const data = await response.json();

        if (data.success) {
          setMentors(data.data.mentors);
          setMentorType(data.data.mentorType);
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, [subjectId]);

  if (loading) return <div>Loading mentors...</div>;

  return (
    <div className="mentor-discovery">
      <h3>
        {mentorType === "official"
          ? "Official Professional Mentors"
          : "Student Mentors"}
      </h3>

      {mentorType === "official" && (
        <div className="info-banner">
          <p>
            As a 4th year student, you can connect with our official industry
            mentors for career guidance.
          </p>
        </div>
      )}

      <div className="mentor-grid">
        {mentors.map((mentor) => (
          <MentorCard
            key={mentor._id}
            mentor={mentor}
            mentorType={mentorType}
            subjectId={subjectId}
          />
        ))}
      </div>
    </div>
  );
};
```

### Official Mentor Request Component

```javascript
const OfficialMentorRequest = ({ mentorId, onSuccess }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      const response = await fetch("/api/student/official-mentors/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          mentorId,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Request sent to ${data.data.mentorName} successfully!`);
        onSuccess();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      alert(`Failed to send request: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="official-mentor-request">
      <h4>Request Professional Mentorship</h4>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Introduce yourself and mention what kind of guidance you're looking for..."
        rows={5}
        required
      />
      <button type="submit" disabled={sending}>
        {sending ? "Sending Request..." : "Send Request"}
      </button>
    </form>
  );
};
```

---

## Error Handling

### Common Error Scenarios

#### 4th Year Student Trying to Get Student Mentors

```json
{
  "statusCode": 400,
  "message": "4th year students can only connect with official mentors",
  "success": false
}
```

#### Duplicate Official Mentor Request

```json
{
  "statusCode": 400,
  "message": "Request already sent to this mentor",
  "success": false
}
```

#### Mentor Not Active

```json
{
  "statusCode": 400,
  "message": "Mentor is not currently active",
  "success": false
}
```

---

## Database Indexes

For optimal performance, ensure these indexes exist:

```javascript
// Student Collection
db.students.createIndex({ "officialMentors.outgoingRequests.mentor_id": 1 });
db.students.createIndex({ "officialMentors.activeMentors.mentor_id": 1 });
db.students.createIndex({ year: 1, branch: 1 });

// Mentor Collection
db.mentors.createIndex({ isActive: 1 });
db.mentors.createIndex({ skills: 1 });
db.mentors.createIndex({ experience_years: -1 });
```

This enhanced system provides a complete mentorship ecosystem that adapts to student needs based on their academic year while maintaining clear separation between peer mentoring and professional guidance!
