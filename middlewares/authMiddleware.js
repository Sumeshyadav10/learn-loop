import jwt from "jsonwebtoken";
import User from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateAccessToken, setAuthCookies } from "../utils/generateToken.js";

export const protect = asyncHandler(async (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken && !refreshToken) {
    throw new ApiError(401, "Not authorized - No tokens provided");
  }

  try {
    // Try to verify the access token first
    if (accessToken) {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
      return next();
    }
  } catch (error) {
    // Access token is expired or invalid, try to refresh
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      if (!refreshToken) {
        throw new ApiError(
          401,
          "Not authorized - Access token expired and no refresh token"
        );
      }

      try {
        // Verify refresh token
        const refreshPayload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findById(refreshPayload.id);

        if (!user || user.refreshToken !== refreshToken) {
          throw new ApiError(401, "Invalid refresh token");
        }

        // Generate new access token
        const userPayload = {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
        };

        const newAccessToken = generateAccessToken(userPayload);

        // Set new cookies
        setAuthCookies(res, newAccessToken, refreshToken);

        // Set user in request
        req.user = userPayload;
        return next();
      } catch (refreshError) {
        throw new ApiError(401, "Not authorized - Invalid refresh token");
      }
    } else {
      throw new ApiError(401, "Not authorized - Invalid access token");
    }
  }
});
