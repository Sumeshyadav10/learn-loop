import Mentor from "../models/mentor.js";
import Student from "../models/student.js";
import User from "../models/user.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";
import {
  notifyOfficialMentorResponse,
  notifyNewConnection,
  notifyMentorshipEnded,
  notifyMenteeRemoved,
} from "../utils/notificationUtils.js";
import { sendMentorshipUpdate } from "../utils/socketConfig.js";

// Register a new mentor
export const registerMentor = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    designation,
    skills,
    experience_years,
    bio,
    available_time_slots,
  } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!name || !phone || !designation || !skills || !experience_years || !bio) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already has a mentor profile
  const existingMentor = await Mentor.findOne({ user_id: userId });
  if (existingMentor) {
    throw new ApiError(400, "Mentor profile already exists");
  }

  // Validate skills array
  if (!Array.isArray(skills) || skills.length === 0) {
    throw new ApiError(400, "At least one skill is required");
  }

  // Validate experience years
  if (experience_years < 0) {
    throw new ApiError(400, "Experience years cannot be negative");
  }

  // Create mentor profile
  const mentor = await Mentor.create({
    user_id: userId,
    name: name.trim(),
    phone: phone.trim(),
    designation: designation.trim(),
    skills: skills.map((skill) => skill.trim()),
    experience_years,
    bio: bio.trim(),
    available_time_slots: available_time_slots || [],
  });

  // Update user role and profile completion status
  await User.findByIdAndUpdate(userId, {
    role: "mentor",
    isProfileComplete: true,
  });

  const mentorData = await Mentor.findById(mentor._id).populate(
    "user_id",
    "email fullName"
  );

  res
    .status(201)
    .json(
      new ApiResponse(201, mentorData, "Mentor profile created successfully")
    );
});

// Get mentor profile
export const getMentorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const mentor = await Mentor.findOne({ user_id: userId }).populate(
    "user_id",
    "email fullName"
  );

  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, mentor, "Mentor profile retrieved successfully")
    );
});

// Update mentor profile
export const updateMentorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updateFields = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateFields.user_id;
  delete updateFields._id;

  const mentor = await Mentor.findOneAndUpdate(
    { user_id: userId },
    updateFields,
    { new: true, runValidators: true }
  ).populate("user_id", "email fullName");

  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, mentor, "Mentor profile updated successfully"));
});

// Update mentor profile image
export const updateMentorProfileImage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    throw new ApiError(400, "Profile image file is required");
  }

  // Get current mentor to check for existing image
  const currentMentor = await Mentor.findOne({ user_id: userId });
  if (!currentMentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  try {
    // Delete old image from cloudinary if exists
    if (currentMentor.profileImage) {
      const oldImagePublicId = extractPublicId(currentMentor.profileImage);
      if (oldImagePublicId) {
        await deleteFromCloudinary(oldImagePublicId);
      }
    }

    // Upload new image to cloudinary in mentors folder
    const result = await uploadOnCloudinary(
      req.file.path,
      "mentors/profile-images"
    );

    if (!result) {
      throw new ApiError(500, "Failed to upload image to cloudinary");
    }

    // Update mentor profile with new image URL
    const mentor = await Mentor.findOneAndUpdate(
      { user_id: userId },
      { profileImage: result.secure_url },
      { new: true }
    )
      .populate("user_id", "email username role")
      .select("-__v");

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          profileImage: mentor.profileImage,
          mentor: mentor,
          cloudinaryResponse: {
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
          },
        },
        "Profile image updated successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, `Image upload failed: ${error.message}`);
  }
});

// Delete mentor profile
export const deleteMentorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const mentor = await Mentor.findOneAndDelete({ user_id: userId });

  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Update user role and profile completion status
  await User.findByIdAndUpdate(userId, {
    role: null,
    isProfileComplete: false,
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Mentor profile deleted successfully"));
});

// Get all mentors (for admin or search functionality)
export const getAllMentors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, skills, experience_min } = req.query;

  const query = { isActive: true };

  // Filter by skills if provided
  if (skills) {
    const skillsArray = skills.split(",").map((skill) => skill.trim());
    query.skills = { $in: skillsArray };
  }

  // Filter by minimum experience if provided
  if (experience_min) {
    query.experience_years = { $gte: parseInt(experience_min) };
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    populate: {
      path: "user_id",
      select: "email fullName",
    },
    sort: { createdAt: -1 },
  };

  const mentors = await Mentor.paginate(query, options);

  res
    .status(200)
    .json(new ApiResponse(200, mentors, "Mentors retrieved successfully"));
});

// Get mentor by ID (public)
export const getMentorById = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;

  const mentor = await Mentor.findById(mentorId)
    .populate("user_id", "email fullName")
    .select("-__v");

  if (!mentor) {
    throw new ApiError(404, "Mentor not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, mentor, "Mentor details retrieved successfully")
    );
});

// ============= MENTORSHIP REQUEST MANAGEMENT =============

// Get incoming mentorship requests (for mentors)
export const getIncomingMentorshipRequests = asyncHandler(async (req, res) => {
  const { status = "pending" } = req.query;
  const userId = req.user._id;

  // Get mentor profile
  const mentor = await Mentor.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Find all students who have sent requests to this mentor
  const students = await Student.find({
    "officialMentors.outgoingRequests.mentor_id": mentor._id,
    ...(status !== "all" && {
      "officialMentors.outgoingRequests.status": status,
    }),
  })
    .populate("user_id", "email username")
    .select(
      "name profileImage year currentSemester branch academicInfo officialMentors"
    );

  // Extract and format the requests
  const requests = [];
  students.forEach((student) => {
    const relevantRequests = student.officialMentors.outgoingRequests.filter(
      (req) =>
        req.mentor_id.toString() === mentor._id.toString() &&
        (status === "all" || req.status === status)
    );

    relevantRequests.forEach((request) => {
      requests.push({
        _id: request._id,
        student: {
          _id: student._id,
          name: student.name,
          profileImage: student.profileImage,
          year: student.year,
          currentSemester: student.currentSemester,
          branch: student.branch,
          academicInfo: student.academicInfo,
          user_id: student.user_id,
        },
        message: request.message,
        status: request.status,
        requestedAt: request.requestedAt,
        respondedAt: request.respondedAt,
      });
    });
  });

  // Sort by request date (newest first)
  requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        requests,
        totalRequests: requests.length,
      },
      "Incoming mentorship requests retrieved successfully"
    )
  );
});

// Respond to mentorship request (accept/reject)
export const respondToMentorshipRequest = asyncHandler(async (req, res) => {
  const { requestId, response } = req.body; // response: "accepted" or "rejected"
  const userId = req.user._id;

  if (!requestId || !response) {
    throw new ApiError(400, "Request ID and response are required");
  }

  if (!["accepted", "rejected"].includes(response)) {
    throw new ApiError(400, "Response must be 'accepted' or 'rejected'");
  }

  // Get mentor profile
  const mentor = await Mentor.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Find the student who sent the request
  const student = await Student.findOne({
    "officialMentors.outgoingRequests._id": requestId,
  });

  if (!student) {
    throw new ApiError(404, "Request not found");
  }

  // Find the specific request
  const request = student.officialMentors.outgoingRequests.id(requestId);
  if (!request) {
    throw new ApiError(404, "Request not found");
  }

  if (request.status !== "pending") {
    throw new ApiError(400, "Request has already been responded to");
  }

  // Update request status
  request.status = response;
  request.respondedAt = new Date();

  let newConnection = null;
  if (response === "accepted") {
    // Add to active mentorship relationships
    newConnection = {
      mentor_id: mentor._id,
      connectedAt: new Date(),
      isActive: true,
      lastInteraction: new Date(),
      mentorshipGoals: [],
    };
    student.officialMentors.activeMentors.push(newConnection);
  }

  await student.save();

  // Send notification to student about the response
  try {
    await notifyOfficialMentorResponse(
      student.user_id,
      userId,
      mentor.name,
      response,
      requestId
    );

    // Send real-time update to student
    sendMentorshipUpdate(student.user_id, "official_request_response", {
      mentorName: mentor.name,
      response,
      requestId,
    });

    // If accepted, also send connection notification
    if (response === "accepted") {
      await notifyNewConnection(
        student.user_id,
        userId,
        mentor.name,
        "mentor",
        null, // No subject for official mentors
        newConnection._id
      );

      await notifyNewConnection(
        userId,
        student.user_id,
        student.name,
        "mentee",
        null, // No subject for official mentors
        newConnection._id
      );
    }
  } catch (notificationError) {
    console.error("Failed to send notification:", notificationError);
    // Don't fail the main operation if notification fails
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        studentName: student.name,
        response,
      },
      `Mentorship request ${response} successfully`
    )
  );
});

// Get current mentees (for mentors)
export const getCurrentMentees = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get mentor profile
  const mentor = await Mentor.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Find all students who have this mentor as active official mentor
  const students = await Student.find({
    "officialMentors.activeMentors.mentor_id": mentor._id,
    "officialMentors.activeMentors.isActive": true,
  })
    .populate("user_id", "email username")
    .select(
      "name profileImage year currentSemester branch academicInfo officialMentors"
    );

  // Extract and format the mentees
  const mentees = [];
  students.forEach((student) => {
    const activeMentorships = student.officialMentors.activeMentors.filter(
      (mentorRel) =>
        mentorRel.mentor_id.toString() === mentor._id.toString() &&
        mentorRel.isActive
    );

    activeMentorships.forEach((mentorship) => {
      mentees.push({
        _id: mentorship._id,
        student: {
          _id: student._id,
          name: student.name,
          profileImage: student.profileImage,
          year: student.year,
          currentSemester: student.currentSemester,
          branch: student.branch,
          academicInfo: student.academicInfo,
          user_id: student.user_id,
        },
        connectedAt: mentorship.connectedAt,
        lastInteraction: mentorship.lastInteraction,
        mentorshipGoals: mentorship.mentorshipGoals,
      });
    });
  });

  // Sort by connection date (newest first)
  mentees.sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mentees,
        totalMentees: mentees.length,
      },
      "Current mentees retrieved successfully"
    )
  );
});

// Get mentor dashboard
export const getMentorDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get mentor profile
  const mentor = await Mentor.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Get dashboard statistics
  const [pendingRequests, acceptedRequests, rejectedRequests, activeMentees] =
    await Promise.all([
      Student.countDocuments({
        "officialMentors.outgoingRequests.mentor_id": mentor._id,
        "officialMentors.outgoingRequests.status": "pending",
      }),
      Student.countDocuments({
        "officialMentors.outgoingRequests.mentor_id": mentor._id,
        "officialMentors.outgoingRequests.status": "accepted",
      }),
      Student.countDocuments({
        "officialMentors.outgoingRequests.mentor_id": mentor._id,
        "officialMentors.outgoingRequests.status": "rejected",
      }),
      Student.countDocuments({
        "officialMentors.activeMentors.mentor_id": mentor._id,
        "officialMentors.activeMentors.isActive": true,
      }),
    ]);

  // Get recent mentees (last 5)
  const recentMentees = await Student.find({
    "officialMentors.activeMentors.mentor_id": mentor._id,
    "officialMentors.activeMentors.isActive": true,
  })
    .select("name profileImage year currentSemester officialMentors")
    .limit(5)
    .sort({ "officialMentors.activeMentors.connectedAt": -1 });

  const dashboard = {
    requests: {
      pending: pendingRequests,
      accepted: acceptedRequests,
      rejected: rejectedRequests,
      total: pendingRequests + acceptedRequests + rejectedRequests,
    },
    mentees: {
      active: activeMentees,
      recent: recentMentees.map((student) => {
        const activeMentorship = student.officialMentors.activeMentors.find(
          (m) => m.mentor_id.toString() === mentor._id.toString() && m.isActive
        );
        return {
          _id: student._id,
          name: student.name,
          profileImage: student.profileImage,
          year: student.year,
          currentSemester: student.currentSemester,
          connectedAt: activeMentorship?.connectedAt,
        };
      }),
    },
    mentor: {
      name: mentor.name,
      designation: mentor.designation,
      experienceYears: mentor.experience_years,
      skills: mentor.skills,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, dashboard, "Mentor dashboard retrieved successfully")
    );
});

// End mentorship relationship (mentor side)
export const endMentorshipRelationship = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const userId = req.user._id;

  if (!studentId) {
    throw new ApiError(400, "Student ID is required");
  }

  // Get mentor profile
  const mentor = await Mentor.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Find and update the student's mentorship record
  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Find the active mentorship relationship
  const mentorshipIndex = student.officialMentors.activeMentors.findIndex(
    (mentorRel) =>
      mentorRel.mentor_id.toString() === mentor._id.toString() &&
      mentorRel.isActive
  );

  if (mentorshipIndex === -1) {
    throw new ApiError(404, "Active mentorship relationship not found");
  }

  // End the relationship
  student.officialMentors.activeMentors[mentorshipIndex].isActive = false;
  await student.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Mentorship relationship ended successfully")
    );
});

// Remove mentee from mentor's list (complete removal)
export const removeMentee = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const userId = req.user._id;

  if (!studentId) {
    throw new ApiError(400, "Student ID is required");
  }

  // Get mentor profile
  const mentor = await Mentor.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Mentor profile not found");
  }

  // Find and update the student's mentorship record
  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Find the mentorship relationship
  const mentorshipIndex = student.officialMentors.activeMentors.findIndex(
    (mentorRel) => mentorRel.mentor_id.toString() === mentor._id.toString()
  );

  if (mentorshipIndex === -1) {
    throw new ApiError(404, "Mentorship relationship not found");
  }

  // Get student name for response
  const studentName = student.name;
  const mentorshipId =
    student.officialMentors.activeMentors[mentorshipIndex]._id;

  // Completely remove the mentorship relationship
  student.officialMentors.activeMentors.splice(mentorshipIndex, 1);
  await student.save();

  // Send notification to student about removal
  try {
    await notifyMenteeRemoved(
      student.user_id,
      userId,
      studentName,
      mentorshipId
    );

    // Send real-time update to student
    sendMentorshipUpdate(student.user_id, "mentee_removed", {
      mentorName: mentor.name,
      message: "You have been removed from the mentor's list",
    });
  } catch (notificationError) {
    console.error("Failed to send notification:", notificationError);
    // Don't fail the main operation if notification fails
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        removedStudent: {
          id: studentId,
          name: studentName,
        },
      },
      "Mentee removed from your list successfully"
    )
  );
});
