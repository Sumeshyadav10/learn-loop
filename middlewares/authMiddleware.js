import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) throw new ApiError(401, 'Not authorized');

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  req.user = decoded;
  next();
});
