# Cloudinary Profile Image Management - Complete Flow Documentation

This document explains the complete flow of profile image management using Cloudinary for both students and mentors in the Learn-Loop platform.

## 🌟 Overview

Our image management system uses **Cloudinary** as the cloud storage service to handle profile images for both students and mentors. Images are uploaded to Cloudinary and only the secure URLs are stored in our MongoDB database.

## 🏗️ Architecture Flow

```
User Upload → Multer (Temp Storage) → Cloudinary Upload → Database URL Storage → Temp File Cleanup
```

### Step-by-Step Process:

1. **Frontend Upload** - User selects image file
2. **Multer Processing** - File temporarily stored in `uploads/` folder
3. **Cloudinary Upload** - File uploaded to cloud with optimization
4. **Database Update** - Only secure URL stored in MongoDB
5. **Cleanup** - Temporary local file deleted
6. **Old Image Deletion** - Previous image removed from Cloudinary

---

## 📁 Cloudinary Folder Structure

Our images are organized in Cloudinary with the following folder structure:

```
learn-loop-cloud/
├── students/
│   └── profile-images/
│       ├── student_123_abc.jpg
│       ├── student_456_def.png
│       └── ...
└── mentors/
    └── profile-images/
        ├── mentor_789_ghi.jpg
        ├── mentor_012_jkl.png
        └── ...
```

## 🔧 Technical Implementation

### Cloudinary Configuration (`utils/cloudinary.js`)

```javascript
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload function with optimization
export const uploadOnCloudinary = async (
  localFilePath,
  folder = "profile-images"
) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Auto-detect file type
      folder: folder, // Organize in folders
      quality: "auto", // Auto-optimize quality
      fetch_format: "auto", // Auto-select best format
    });

    // Cleanup local file after successful upload
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // Cleanup local file if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};
```

### Student Profile Image Upload

**Endpoint:** `POST /api/student/profile/image`

**Flow:**

1. Multer receives file and saves to `uploads/` temporarily
2. Check if student has existing profile image
3. Delete old image from Cloudinary (if exists)
4. Upload new image to `students/profile-images/` folder
5. Update student record with new Cloudinary URL
6. Return success response with image details

**Controller Implementation:**

```javascript
export const updateProfileImage = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user_id: req.user._id });

  // Delete old image if exists
  if (student.profileImage) {
    const oldImagePublicId = extractPublicId(student.profileImage);
    await deleteFromCloudinary(oldImagePublicId);
  }

  // Upload new image
  const imageUploadResult = await uploadOnCloudinary(
    req.file.path,
    "students/profile-images"
  );

  // Update database with URL only
  student.profileImage = imageUploadResult.secure_url;
  await student.save();
});
```

### Mentor Profile Image Upload

**Endpoint:** `POST /api/mentor/profile/image`

**Flow:** Similar to student but uploads to `mentors/profile-images/` folder

**Controller Implementation:**

```javascript
export const updateMentorProfileImage = asyncHandler(async (req, res) => {
  const currentMentor = await Mentor.findOne({ user_id: req.user._id });

  // Delete old image if exists
  if (currentMentor.profileImage) {
    const oldImagePublicId = extractPublicId(currentMentor.profileImage);
    await deleteFromCloudinary(oldImagePublicId);
  }

  // Upload new image to mentors folder
  const result = await uploadOnCloudinary(
    req.file.path,
    "mentors/profile-images"
  );

  // Update database with URL only
  await Mentor.findOneAndUpdate(
    { user_id: req.user._id },
    { profileImage: result.secure_url }
  );
});
```

---

## 🗄️ Database Schema

### Student Model

```javascript
{
  name: String,
  profileImage: String,  // Cloudinary URL: "https://res.cloudinary.com/..."
  // ... other fields
}
```

### Mentor Model

```javascript
{
  name: String,
  profileImage: String,  // Cloudinary URL: "https://res.cloudinary.com/..."
  // ... other fields
}
```

**Key Points:**

- ✅ Only URLs stored in database (not binary data)
- ✅ Default value: `null` (optional field)
- ✅ URLs are fully qualified Cloudinary secure URLs
- ✅ No file size or storage concerns in database

---

## 🌐 API Response Examples

### Successful Student Image Upload

```json
{
  "statusCode": 200,
  "data": {
    "profileImage": "https://res.cloudinary.com/learn-loop/image/upload/v1691234567/students/profile-images/abc123def.jpg",
    "cloudinaryResponse": {
      "public_id": "students/profile-images/abc123def",
      "secure_url": "https://res.cloudinary.com/learn-loop/image/upload/v1691234567/students/profile-images/abc123def.jpg",
      "width": 800,
      "height": 800,
      "format": "jpg"
    }
  },
  "message": "Profile image updated successfully",
  "success": true
}
```

### Successful Mentor Image Upload

```json
{
  "statusCode": 200,
  "data": {
    "profileImage": "https://res.cloudinary.com/learn-loop/image/upload/v1691234567/mentors/profile-images/xyz789ghi.jpg",
    "mentor": {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "John Doe",
      "profileImage": "https://res.cloudinary.com/learn-loop/image/upload/v1691234567/mentors/profile-images/xyz789ghi.jpg",
      "designation": "Senior Software Engineer"
    },
    "cloudinaryResponse": {
      "public_id": "mentors/profile-images/xyz789ghi",
      "secure_url": "https://res.cloudinary.com/learn-loop/image/upload/v1691234567/mentors/profile-images/xyz789ghi.jpg",
      "width": 1000,
      "height": 1000,
      "format": "jpg"
    }
  },
  "message": "Profile image updated successfully",
  "success": true
}
```

---

## 🔒 Security & Validation

### File Upload Validation

```javascript
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // Accept image files only
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});
```

### Security Features:

- ✅ **File Type Validation** - Only image files accepted
- ✅ **Size Limits** - Maximum 5MB per image
- ✅ **Authentication Required** - Only logged-in users can upload
- ✅ **User Ownership** - Users can only update their own profiles
- ✅ **Temporary Storage** - Local files cleaned up immediately
- ✅ **Old Image Cleanup** - Previous images deleted from cloud

---

## 🚀 Frontend Integration

### React Upload Component Example

```javascript
const ProfileImageUpload = ({ userType }) => {
  // 'student' or 'mentor'
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const handleImageUpload = async (file) => {
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("profileImage", file);

      const endpoint =
        userType === "student"
          ? "/api/student/profile/image"
          : "/api/mentor/profile/image";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setProfileImage(data.data.profileImage);
        alert("Profile image updated successfully!");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-image-upload">
      <div className="current-image">
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="profile-preview" />
        ) : (
          <div className="no-image-placeholder">No Image</div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e.target.files[0])}
        disabled={uploading}
        className="file-input"
      />

      {uploading && <div className="upload-progress">Uploading...</div>}
    </div>
  );
};
```

### Display Profile Images

```javascript
// In mentor/student cards, profiles, etc.
const ProfileImage = ({ imageUrl, name, size = "medium" }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-16 h-16",
    large: "w-32 h-32",
  };

  return (
    <div className={`profile-image ${sizeClasses[size]}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${name}'s profile`}
          className="rounded-full object-cover w-full h-full"
          loading="lazy"
        />
      ) : (
        <div className="default-avatar rounded-full bg-gray-300 flex items-center justify-center">
          {name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
};
```

---

## 🔄 Image Management Best Practices

### 1. Cloudinary Optimizations

- **Auto Quality**: Cloudinary automatically optimizes image quality
- **Auto Format**: Serves best format (WebP, AVIF) based on browser support
- **Responsive Images**: Can generate different sizes on-demand
- **CDN Delivery**: Fast global delivery via Cloudinary's CDN

### 2. URL Transformations

```javascript
// Original: https://res.cloudinary.com/learn-loop/image/upload/v1691234567/students/profile-images/abc123.jpg

// Thumbnail (100x100):
// https://res.cloudinary.com/learn-loop/image/upload/c_thumb,w_100,h_100/v1691234567/students/profile-images/abc123.jpg

// Optimized quality:
// https://res.cloudinary.com/learn-loop/image/upload/q_auto,f_auto/v1691234567/students/profile-images/abc123.jpg
```

### 3. Error Handling

```javascript
// Handle missing images gracefully
const ImageWithFallback = ({ src, alt, fallback }) => {
  const [imageSrc, setImageSrc] = useState(src);

  return <img src={imageSrc} alt={alt} onError={() => setImageSrc(fallback)} />;
};
```

---

## 📊 Monitoring & Analytics

### Cloudinary Dashboard Metrics:

- **Storage Usage**: Track total storage consumption
- **Bandwidth Usage**: Monitor image delivery traffic
- **Transformations**: Count of image optimizations
- **API Calls**: Upload/delete operation counts

### Database Considerations:

- **Profile Completion**: Track users with/without profile images
- **Storage Efficiency**: Only URLs stored (no blob data)
- **Query Performance**: Fast lookups with indexed URLs

---

## 🔧 Environment Configuration

### Required Environment Variables:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Cloudinary Upload Folder Prefix
CLOUDINARY_FOLDER_PREFIX=learn-loop-prod
```

### Development vs Production:

```javascript
// Use different folders for different environments
const getUploadFolder = (baseFolder) => {
  const prefix = process.env.NODE_ENV === "production" ? "prod" : "dev";
  return `${prefix}/${baseFolder}`;
};

// Usage:
uploadOnCloudinary(filePath, getUploadFolder("students/profile-images"));
```

This comprehensive system ensures efficient, secure, and scalable profile image management for both students and mentors! 🎯✨
