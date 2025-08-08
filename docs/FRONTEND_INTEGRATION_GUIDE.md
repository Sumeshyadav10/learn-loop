# Frontend Integration Guide - Mentorship Connection System

This guide shows how to integrate the mentorship connection system APIs into your frontend application.

## Overview

The mentorship connection system provides a complete workflow for students to:

1. **Find mentors** for specific subjects
2. **Send mentorship requests** to qualified seniors
3. **Manage incoming/outgoing requests**
4. **Track active mentor-mentee relationships**

## Setup

### Base Configuration

```javascript
const API_BASE_URL = "http://localhost:5000/api";
const STUDENT_API = `${API_BASE_URL}/student`;

// Get auth token from localStorage or your auth system
const getAuthToken = () => localStorage.getItem("authToken");

// Common headers for API requests
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});
```

---

## Core Components Implementation

### 1. Mentor Discovery Component

```javascript
// Find available mentors for a subject
const findMentorsForSubject = async (subjectId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 10,
      sortBy: filters.sortBy || "cgpa",
      sortOrder: filters.sortOrder || "desc",
    });

    const response = await fetch(
      `${STUDENT_API}/mentors/subject/${subjectId}?${queryParams}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    if (data.success) {
      return data.data.mentors;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error finding mentors:", error);
    throw error;
  }
};

// Usage in React component
const MentorDiscovery = ({ subjectId }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMentors = async () => {
      try {
        const mentorList = await findMentorsForSubject(subjectId);
        setMentors(mentorList);
      } catch (error) {
        console.error("Failed to load mentors:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMentors();
  }, [subjectId]);

  return (
    <div className="mentor-discovery">
      <h3>Available Mentors</h3>
      {loading ? (
        <div>Loading mentors...</div>
      ) : (
        <div className="mentor-list">
          {mentors.map((mentor) => (
            <MentorCard
              key={mentor._id}
              mentor={mentor}
              subjectId={subjectId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 2. Send Mentorship Request

```javascript
// Send mentorship request
const sendMentorshipRequest = async (mentorId, subjectId, message = "") => {
  try {
    const response = await fetch(`${STUDENT_API}/mentoring/request`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        mentorId,
        subjectId,
        message,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error sending request:", error);
    throw error;
  }
};

// Request form component
const MentorRequestForm = ({ mentorId, subjectId, onSuccess, onCancel }) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      const result = await sendMentorshipRequest(mentorId, subjectId, message);
      alert(`Request sent to ${result.mentorName} successfully!`);
      onSuccess();
    } catch (error) {
      alert(`Failed to send request: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mentor-request-form">
      <h4>Send Mentorship Request</h4>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a message to your potential mentor..."
        rows={4}
        maxLength={500}
      />
      <div className="form-actions">
        <button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send Request"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};
```

### 3. Request Management Dashboard

```javascript
// Get dashboard data
const getMentorshipDashboard = async () => {
  try {
    const response = await fetch(`${STUDENT_API}/mentoring/dashboard`, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    throw error;
  }
};

// Dashboard component
const MentorshipDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await getMentorshipDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="mentorship-dashboard">
      <h2>Mentorship Dashboard</h2>

      {/* Student Section */}
      <div className="dashboard-section">
        <h3>As a Student</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Pending Requests</h4>
            <span className="stat-number">
              {dashboardData.mentee.pendingRequests}
            </span>
          </div>
          <div className="stat-card">
            <h4>Active Mentors</h4>
            <span className="stat-number">
              {dashboardData.mentee.activeMentors}
            </span>
          </div>
        </div>
      </div>

      {/* Mentor Section */}
      <div className="dashboard-section">
        <h3>As a Mentor</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Pending Requests</h4>
            <span className="stat-number">
              {dashboardData.mentor.pendingRequests}
            </span>
          </div>
          <div className="stat-card">
            <h4>Active Mentees</h4>
            <span className="stat-number">
              {dashboardData.mentor.activeMentees}/
              {dashboardData.mentor.maxMentees}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4. Incoming Requests Management

```javascript
// Get incoming requests
const getIncomingRequests = async (status = "pending") => {
  try {
    const response = await fetch(
      `${STUDENT_API}/mentoring/requests/incoming?status=${status}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    const data = await response.json();

    if (data.success) {
      return data.data.requests;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error loading incoming requests:", error);
    throw error;
  }
};

// Respond to request
const respondToRequest = async (requestId, response) => {
  try {
    const res = await fetch(`${STUDENT_API}/mentoring/request/respond`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        requestId,
        response,
      }),
    });

    const data = await res.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error responding to request:", error);
    throw error;
  }
};

// Incoming requests component
const IncomingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      const requestList = await getIncomingRequests();
      setRequests(requestList);
    } catch (error) {
      console.error("Failed to load requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleResponse = async (requestId, response) => {
    try {
      const result = await respondToRequest(requestId, response);
      alert(`Request ${response} successfully!`);
      loadRequests(); // Reload requests
    } catch (error) {
      alert(`Failed to ${response} request: ${error.message}`);
    }
  };

  return (
    <div className="incoming-requests">
      <h3>Incoming Mentorship Requests</h3>
      {loading ? (
        <div>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div>No pending requests</div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="student-info">
                <img src={request.student_id.profileImage} alt="Student" />
                <div>
                  <h4>{request.student_id.name}</h4>
                  <p>
                    Year: {request.student_id.year}, Semester:{" "}
                    {request.student_id.currentSemester}
                  </p>
                  <p>CGPA: {request.student_id.academicInfo.cgpa}</p>
                </div>
              </div>

              <div className="subject-info">
                <h5>{request.subject_id.subject_name}</h5>
                <p>Code: {request.subject_id.subject_code}</p>
              </div>

              {request.message && (
                <div className="message">
                  <p>
                    <strong>Message:</strong> {request.message}
                  </p>
                </div>
              )}

              <div className="request-actions">
                <button
                  onClick={() => handleResponse(request._id, "accepted")}
                  className="accept-btn"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleResponse(request._id, "rejected")}
                  className="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 5. My Mentors/Mentees View

```javascript
// Get current mentors
const getCurrentMentors = async () => {
  try {
    const response = await fetch(`${STUDENT_API}/mentoring/mentors`, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (data.success) {
      return data.data.mentors;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error loading mentors:", error);
    throw error;
  }
};

// Get current mentees
const getCurrentMentees = async () => {
  try {
    const response = await fetch(`${STUDENT_API}/mentoring/mentees`, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await response.json();

    if (data.success) {
      return data.data.mentees;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error loading mentees:", error);
    throw error;
  }
};

// Combined component for mentors and mentees
const MyConnections = () => {
  const [mentors, setMentors] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [activeTab, setActiveTab] = useState("mentors");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const [mentorList, menteeList] = await Promise.all([
          getCurrentMentors(),
          getCurrentMentees(),
        ]);
        setMentors(mentorList);
        setMentees(menteeList);
      } catch (error) {
        console.error("Failed to load connections:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConnections();
  }, []);

  if (loading) return <div>Loading connections...</div>;

  return (
    <div className="my-connections">
      <div className="tabs">
        <button
          className={activeTab === "mentors" ? "active" : ""}
          onClick={() => setActiveTab("mentors")}
        >
          My Mentors ({mentors.length})
        </button>
        <button
          className={activeTab === "mentees" ? "active" : ""}
          onClick={() => setActiveTab("mentees")}
        >
          My Mentees ({mentees.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "mentors" ? (
          <div className="mentors-list">
            {mentors.length === 0 ? (
              <div>No active mentors</div>
            ) : (
              mentors.map((connection) => (
                <ConnectionCard
                  key={connection._id}
                  connection={connection}
                  type="mentor"
                />
              ))
            )}
          </div>
        ) : (
          <div className="mentees-list">
            {mentees.length === 0 ? (
              <div>No active mentees</div>
            ) : (
              mentees.map((connection) => (
                <ConnectionCard
                  key={connection._id}
                  connection={connection}
                  type="mentee"
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Connection card component
const ConnectionCard = ({ connection, type }) => {
  const person =
    type === "mentor" ? connection.mentor_id : connection.mentee_id;

  return (
    <div className="connection-card">
      <div className="person-info">
        <img src={person.profileImage} alt={person.name} />
        <div>
          <h4>{person.name}</h4>
          <p>
            Year: {person.year}, Semester: {person.currentSemester}
          </p>
          <p>CGPA: {person.academicInfo.cgpa}</p>
        </div>
      </div>

      <div className="subject-info">
        <h5>{connection.subject_id.subject_name}</h5>
        <p>
          Connected: {new Date(connection.connectedAt).toLocaleDateString()}
        </p>
        <p>
          Last interaction:{" "}
          {new Date(connection.lastInteraction).toLocaleDateString()}
        </p>
      </div>

      <div className="connection-actions">
        <button className="contact-btn">Contact</button>
        <button className="end-btn">End Connection</button>
      </div>
    </div>
  );
};
```

---

## CSS Styling Examples

```css
/* Dashboard styles */
.mentorship-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-section {
  margin-bottom: 30px;
  padding: 20px;
  border-radius: 8px;
  background: #f8f9fa;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 15px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 2em;
  font-weight: bold;
  color: #007bff;
}

/* Request cards */
.request-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.student-info {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.student-info img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 15px;
}

.request-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.accept-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.reject-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 20px;
}

.tabs button {
  background: none;
  border: none;
  padding: 12px 24px;
  cursor: pointer;
  font-size: 16px;
}

.tabs button.active {
  border-bottom: 2px solid #007bff;
  color: #007bff;
}
```

---

## Error Handling

```javascript
// Centralized error handling
const handleApiError = (error, fallbackMessage = "An error occurred") => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || fallbackMessage;
    return message;
  } else if (error.request) {
    // Request was made but no response
    return "Network error. Please check your connection.";
  } else {
    // Something else happened
    return error.message || fallbackMessage;
  }
};

// Usage in components
try {
  await sendMentorshipRequest(mentorId, subjectId, message);
} catch (error) {
  const errorMessage = handleApiError(
    error,
    "Failed to send mentorship request"
  );
  setError(errorMessage);
}
```

This integration guide provides a complete frontend implementation for the mentorship connection system. The components are designed to be modular and can be easily integrated into any React-based frontend application.
