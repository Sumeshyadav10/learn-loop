import Mentor from "../models/mentor.js";
import User from "../models/user.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

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
