import User from "../models/user.js";
import Student from "../models/student.js";
import Mentor from "../models/mentor.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Check profile completion status
export const getProfileStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select(
    "role isProfileComplete email fullName"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let profileData = null;

  // If user has a role, fetch their profile
  if (user.role === "mentor") {
    profileData = await Mentor.findOne({ user_id: userId });
  } else if (user.role === "student") {
    profileData = await Student.findOne({ user_id: userId }).populate(
      "subjects.subject_id",
      "subject_name subject_code"
    );
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        profile: profileData,
        needsRoleSelection: !user.role,
        needsProfileCompletion: !user.isProfileComplete,
      },
      "Profile status retrieved successfully"
    )
  );
});

// Set user role (mentor or student)
export const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const userId = req.user._id;

  if (!role || !["mentor", "student"].includes(role)) {
    throw new ApiError(400, "Valid role (mentor or student) is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user already has a role
  if (user.role) {
    throw new ApiError(400, "User role is already set");
  }

  // Update user role
  user.role = role;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, { role }, "User role set successfully"));
});

// Get current user profile (generic)
export const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select(
    "-password -refreshToken -otp -otpExpiry"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let profileData = null;

  if (user.role === "mentor") {
    profileData = await Mentor.findOne({ user_id: userId });
  } else if (user.role === "student") {
    profileData = await Student.findOne({ user_id: userId }).populate(
      "subjects.subject_id",
      "subject_name subject_code credits"
    );
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        profile: profileData,
      },
      "User profile retrieved successfully"
    )
  );
});

// Update basic user info
export const updateUserInfo = asyncHandler(async (req, res) => {
  const { fullName, username } = req.body;
  const userId = req.user._id;

  const updateData = {};
  if (fullName) updateData.fullName = fullName.trim();
  if (username) updateData.username = username.trim();

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken -otp -otpExpiry");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "User information updated successfully"));
});

// Reset user profile (delete mentor/student profile and reset role)
export const resetUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete existing profiles
  if (user.role === "mentor") {
    await Mentor.findOneAndDelete({ user_id: userId });
  } else if (user.role === "student") {
    await Student.findOneAndDelete({ user_id: userId });
  }

  // Reset user role and profile completion
  user.role = null;
  user.isProfileComplete = false;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, {}, "User profile reset successfully"));
});

// Get dashboard data based on user role
export const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select(
    "role isProfileComplete email fullName"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let dashboardData = {
    user,
    stats: {},
  };

  if (user.role === "mentor") {
    const mentor = await Mentor.findOne({ user_id: userId });
    if (mentor) {
      // Add mentor-specific dashboard data
      dashboardData.profile = mentor;
      dashboardData.stats = {
        skills_count: mentor.skills.length,
        experience_years: mentor.experience_years,
        // Add more mentor stats as needed
      };
    }
  } else if (user.role === "student") {
    const student = await Student.findOne({ user_id: userId }).populate(
      "subjects.subject_id",
      "subject_name subject_code"
    );
    if (student) {
      // Add student-specific dashboard data
      dashboardData.profile = student;
      dashboardData.stats = {
        subjects_count: student.subjects.length,
        current_semester: student.semester,
        branch: student.branch,
        // Add more student stats as needed
      };
    }
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dashboardData,
        "Dashboard data retrieved successfully"
      )
    );
});
