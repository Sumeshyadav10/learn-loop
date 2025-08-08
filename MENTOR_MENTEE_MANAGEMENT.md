# Mentor-Mentee Management API

This document outlines the API endpoints for mentors to manage their mentees, including the ability to remove mentees from their list.

## Available Actions for Mentors

### 1. End Mentorship Relationship (Deactivate)

- **Purpose**: Temporarily deactivate mentorship but keep the record
- **Endpoint**: `PUT /api/mentor/relationship/end`
- **Method**: PUT
- **Authentication**: Required (Mentor)

**Request Body:**

```json
{
  "studentId": "student_object_id"
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "message": "Mentorship relationship ended successfully"
}
```

**What it does:**

- Sets `isActive: false` for the mentorship relationship
- Keeps the record in the database for historical purposes
- Student can still see past mentor in their inactive list

---

### 2. Remove Mentee (Complete Removal)

- **Purpose**: Completely remove the mentee from mentor's list
- **Endpoint**: `DELETE /api/mentor/mentees/remove`
- **Method**: DELETE
- **Authentication**: Required (Mentor)

**Request Body:**

```json
{
  "studentId": "student_object_id"
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "removedStudent": {
      "id": "student_object_id",
      "name": "Student Name"
    }
  },
  "message": "Mentee removed from your list successfully"
}
```

**What it does:**

- Completely removes the mentorship record from the student's `officialMentors.activeMentors` array
- No trace of the relationship remains in the database
- Student will not see this mentor in any of their lists

---

## Comparison: End vs Remove

| Feature             | End Relationship               | Remove Mentee      |
| ------------------- | ------------------------------ | ------------------ |
| **Database Record** | Preserved (isActive: false)    | Completely deleted |
| **Historical Data** | Maintained                     | Lost               |
| **Student's View**  | Shows in inactive/past mentors | No trace           |
| **Mentor's View**   | May show in past mentees       | Completely gone    |
| **Reversibility**   | Can be reactivated             | Cannot be undone   |
| **Use Case**        | Temporary pause                | Permanent removal  |

## Implementation Details

### Database Structure

```javascript
// Student Model - officialMentors.activeMentors
{
  mentor_id: ObjectId,
  connectedAt: Date,
  isActive: Boolean,        // Used by endMentorshipRelationship
  lastInteraction: Date,
  mentorshipGoals: []
}
```

### Error Handling

Both endpoints handle the following errors:

- `400`: Missing studentId
- `404`: Mentor profile not found
- `404`: Student not found
- `404`: Mentorship relationship not found

### Authentication

- Both endpoints require mentor authentication
- Uses `protect` middleware to verify JWT token
- Validates that the user has a mentor profile

## Frontend Integration

### Remove Mentee Button

```javascript
// Example frontend implementation
const removeMentee = async (studentId) => {
  try {
    const response = await fetch("/api/mentor/mentees/remove", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId }),
    });

    const data = await response.json();

    if (data.success) {
      // Remove mentee from UI
      setMentees((prev) =>
        prev.filter((mentee) => mentee.student._id !== studentId)
      );
      toast.success(data.message);
    }
  } catch (error) {
    toast.error("Failed to remove mentee");
  }
};
```

### Confirmation Dialog

```javascript
const handleRemoveMentee = (student) => {
  const confirmed = window.confirm(
    `Are you sure you want to remove ${student.name} from your mentee list? This action cannot be undone.`
  );

  if (confirmed) {
    removeMentee(student._id);
  }
};
```

## Security Considerations

1. **Authorization**: Only the mentor can remove their own mentees
2. **Validation**: Student ID is validated before processing
3. **Confirmation**: Frontend should implement confirmation dialogs
4. **Audit Trail**: Consider logging removal actions for administrative purposes

## Best Practices

1. **Use End Relationship** for temporary situations
2. **Use Remove Mentee** only when permanent removal is necessary
3. **Always confirm** with user before removal
4. **Provide feedback** to user about the action taken
5. **Update UI immediately** after successful removal
