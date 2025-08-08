import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const connectDB = asyncHandler(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new ApiError(500, 'MongoDB URI is not defined in environment variables');
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw new ApiError(500, 'Failed to connect to MongoDB');
  }
});

export default connectDB;