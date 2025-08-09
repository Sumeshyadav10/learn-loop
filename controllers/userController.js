import User from "../models/user.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Get current user profile
export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select(
    "-password -refreshToken -otp -otpExpiry"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

// Update user role
export const updateUserRole = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { role } = req.body;

  // Validate role
  if (!role || !["mentor", "student"].includes(role)) {
    throw new ApiError(400, "Role must be either 'mentor' or 'student'");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role: role },
    { new: true, runValidators: true }
  ).select("-password -refreshToken -otp -otpExpiry");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, `Role updated to ${role} successfully`));
});

// Update user basic info
export const updateUserInfo = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { fullName, username } = req.body;

  const updateFields = {};
  if (fullName) updateFields.fullName = fullName.trim();
  if (username) updateFields.username = username.trim();

  // Check if username is already taken by another user
  if (username) {
    const existingUser = await User.findOne({
      username: username.trim(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      throw new ApiError(400, "Username already taken");
    }
  }

  const user = await User.findByIdAndUpdate(userId, updateFields, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken -otp -otpExpiry");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User information updated successfully"));
});

// Get all users (admin functionality)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role } = req.query;

  const query = {};
  if (role && ["mentor", "student"].includes(role)) {
    query.role = role;
  }

  const users = await User.find(query)
    .select("-password -refreshToken -otp -otpExpiry")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
      "Users fetched successfully"
    )
  );
});

// Delete user account
export const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User account deleted successfully"));
});
