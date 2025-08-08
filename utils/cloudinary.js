import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

console.log(
  "Cloudinary config:",
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export const uploadOnCloudinary = async (
  localFilePath,
  folder = "profile-images"
) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folder, // Organize images in folders
      quality: "auto",
      fetch_format: "auto",
    });

    // File has been uploaded successfully
    console.log(
      "File uploaded to cloudinary successfully:",
      response.secure_url
    );

    // Remove the locally saved temporary file after successful upload
    try {
      fs.unlinkSync(localFilePath);
    } catch (error) {
      console.error("Error removing local file:", error);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Remove the locally saved temporary file if upload failed
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (unlinkError) {
      console.error(
        "Error removing local file after failed upload:",
        unlinkError
      );
    }

    return null;
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    const response = await cloudinary.uploader.destroy(publicId);
    console.log("File deleted from cloudinary:", response);
    return response;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};

// Extract public ID from Cloudinary URL
export const extractPublicId = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;

  try {
    // Extract public ID from URL like: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const parts = cloudinaryUrl.split("/");
    const filename = parts[parts.length - 1];
    const filenameWithoutExtension = filename.split(".")[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${filenameWithoutExtension}`;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};

export default cloudinary;
