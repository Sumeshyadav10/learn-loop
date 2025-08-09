import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Student from "../models/student.js";
import User from "../models/user.js";
import Mentor from "../models/mentor.js";
import Subject from "../models/subject.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";
import notificationUtils, {
  notifyMentorshipRequest,
  notifyMentorshipResponse,
  notifyNewConnection,
  notifyOfficialMentorRequest,
} from "../utils/notificationUtils.js";
import { sendMentorshipUpdate } from "../utils/socketConfig.js";

// Helper function to fetch subjects from database based on branch and semester
const getSubjectsFromDatabase = async (branch, semester) => {
  try {
    const subjects = await Subject.find({
      branch: branch,
      semester: parseInt(semester),
      isActive: true,
    }).select("subject_name subject_code credits");

    return subjects.map((subject) => ({
      name: subject.subject_name,
      code: subject.subject_code,
      credits: subject.credits,
    }));
  } catch (error) {
    console.error("Error fetching subjects from database:", error);
    return [];
  }
};

// Register a new student (handles step-by-step creation with image upload)
export const registerStudent = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    branch,
    year,
    currentSemester,
    strongSubjects,
    academicInfo,
    isActive,
  } = req.body;
  const userId = req.user.id;

  // Check if user already has a student profile
  const existingStudent = await Student.findOne({ user_id: userId });
  if (existingStudent) {
    throw new ApiError(
      400,
      "Student profile already exists. Use update endpoint instead."
    );
  }

  // Handle image upload if provided
  let profileImageUrl = null;
  if (req.file) {
    try {
      const result = await uploadOnCloudinary(
        req.file.path,
        "students/profile-images"
      );
      if (result) {
        profileImageUrl = result.secure_url;
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      // Continue without image if upload fails
    }
  }

  // Parse academic info if it's a string
  let parsedAcademicInfo = academicInfo;
  if (typeof academicInfo === "string") {
    try {
      parsedAcademicInfo = JSON.parse(academicInfo);
    } catch (error) {
      parsedAcademicInfo = { cgpa: 0, completedSemesters: [] };
    }
  }

  // Parse strong subjects if it's a string
  let parsedStrongSubjects = strongSubjects;
  if (typeof strongSubjects === "string") {
    try {
      parsedStrongSubjects = JSON.parse(strongSubjects);
    } catch (error) {
      parsedStrongSubjects = [];
    }
  }

  // Create student profile with provided data (flexible validation)
  const studentData = {
    user_id: userId,
    name: (name || "").trim(),
    phone: (phone || "").trim(),
    branch: branch || "",
    year: year || 1,
    currentSemester: currentSemester || 1,
    strongSubjects: parsedStrongSubjects || [],
    academicInfo: parsedAcademicInfo || { cgpa: 0, completedSemesters: [] },
    profileImage: profileImageUrl,
    isActive: isActive !== undefined ? isActive : true,
  };

  // Auto-assign subjects based on semester and branch from database if we have both
  if (branch && currentSemester) {
    const subjects = await getSubjectsFromDatabase(branch, currentSemester);
    studentData.subjects = subjects;

    // Validate year-semester consistency only if both are provided
    if (year && currentSemester) {
      const expectedSemesterRange = {
        1: [1, 2],
        2: [3, 4],
        3: [5, 6],
        4: [7, 8],
      };

      if (!expectedSemesterRange[year]?.includes(parseInt(currentSemester))) {
        throw new ApiError(
          400,
          `Semester ${currentSemester} is not valid for year ${year}`
        );
      }
    }
  }

  const student = await Student.create(studentData);

  // Update user profile completion status based on substantial data
  const hasSubstantialData = name && phone && branch && year && currentSemester;
  if (hasSubstantialData) {
    await User.findByIdAndUpdate(userId, {
      role: "student",
      isProfileComplete: true,
    });
  }

  const populatedStudent = await Student.findById(student._id)
    .populate("user_id", "email username")
    .select("-__v");

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        student: populatedStudent,
        message: hasSubstantialData
          ? "Student profile created successfully! You can now connect with mentors."
          : "Student profile created. Complete all sections to start connecting with mentors.",
        profileComplete: hasSubstantialData,
        imageUploaded: !!profileImageUrl,
      },
      "Student profile created successfully"
    )
  );
});

// Get available subjects for strong subject selection (previous semesters only)
export const getAvailableSubjectsForMentoring = asyncHandler(
  async (req, res) => {
    const userId = req.user._id;

    const student = await Student.findOne({ user_id: userId });
    if (!student) {
      throw new ApiError(404, "Student profile not found");
    }

    if (student.currentSemester <= 1) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            [],
            "No previous semesters available for mentoring"
          )
        );
    }

    const availableSemesters = student.getAvailablePreviousSemesters();

    const subjects = await Subject.find({
      branch: student.branch,
      semester: { $in: availableSemesters },
      isActive: true,
    })
      .sort({ semester: 1, subject_name: 1 })
      .select("subject_name subject_code semester credits");

    // Group subjects by semester for better frontend handling
    const subjectsBySemester = subjects.reduce((acc, subject) => {
      if (!acc[subject.semester]) {
        acc[subject.semester] = [];
      }
      acc[subject.semester].push(subject);
      return acc;
    }, {});

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          availableSemesters,
          subjectsBySemester,
          currentSemester: student.currentSemester,
        },
        "Available subjects fetched successfully"
      )
    );
  }
);

// Add strong subjects that student can mentor
export const addStrongSubjects = asyncHandler(async (req, res) => {
  const { strongSubjects } = req.body; // Array of { subject_id, confidenceLevel }
  const userId = req.user._id;

  if (!Array.isArray(strongSubjects) || strongSubjects.length === 0) {
    throw new ApiError(400, "Strong subjects array is required");
  }

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const availableSemesters = student.getAvailablePreviousSemesters();
  if (availableSemesters.length === 0) {
    throw new ApiError(400, "No previous semesters available for mentoring");
  }

  // Validate all subject IDs and check they belong to previous semesters
  const subjectIds = strongSubjects.map((s) => s.subject_id);
  const validSubjects = await Subject.find({
    _id: { $in: subjectIds },
    branch: student.branch,
    semester: { $in: availableSemesters },
    isActive: true,
  });

  if (validSubjects.length !== subjectIds.length) {
    throw new ApiError(
      400,
      "Some subjects are invalid or not from previous semesters"
    );
  }

  // Prepare strong subjects with semester information
  const formattedStrongSubjects = strongSubjects.map((s) => {
    const subject = validSubjects.find(
      (vs) => vs._id.toString() === s.subject_id
    );
    return {
      subject_id: s.subject_id,
      semester: subject.semester,
      confidenceLevel: s.confidenceLevel || 3,
    };
  });

  // Remove existing strong subjects and add new ones
  student.strongSubjects = formattedStrongSubjects;
  await student.save();

  const updatedStudent = await Student.findById(student._id)
    .populate(
      "strongSubjects.subject_id",
      "subject_name subject_code semester credits"
    )
    .populate("user_id", "email username")
    .select("-__v");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedStudent,
        "Strong subjects updated successfully"
      )
    );
});

// Update profile image
export const updateProfileImage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    throw new ApiError(400, "Profile image file is required");
  }

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  try {
    // Delete old image from cloudinary if exists
    if (student.profileImage) {
      const oldImagePublicId = extractPublicId(student.profileImage);
      if (oldImagePublicId) {
        await deleteFromCloudinary(oldImagePublicId);
      }
    }

    // Upload new image to cloudinary in students folder
    const imageUploadResult = await uploadOnCloudinary(
      req.file.path,
      "students/profile-images"
    );

    if (!imageUploadResult) {
      throw new ApiError(500, "Failed to upload profile image to cloudinary");
    }

    // Update student profile with new image URL
    student.profileImage = imageUploadResult.secure_url;
    await student.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          profileImage: student.profileImage,
          cloudinaryResponse: {
            public_id: imageUploadResult.public_id,
            secure_url: imageUploadResult.secure_url,
            width: imageUploadResult.width,
            height: imageUploadResult.height,
            format: imageUploadResult.format,
          },
        },
        "Profile image updated successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, `Image upload failed: ${error.message}`);
  }
});

// Get student profile
export const getStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate(
      "strongSubjects.subject_id",
      "subject_name subject_code semester credits"
    )
    .populate("user_id", "email username")
    .select("-__v");

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, student, "Student profile fetched successfully")
    );
});

// Find mentors for a specific subject
export const findMentorsForSubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const userId = req.user._id;

  if (!subjectId) {
    throw new ApiError(400, "Subject ID is required");
  }

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Verify subject exists and is valid for the student's branch
  const subject = await Subject.findOne({
    _id: subjectId,
    branch: student.branch,
    isActive: true,
  });

  if (!subject) {
    throw new ApiError(
      404,
      "Subject not found or not available for your branch"
    );
  }

  // Find mentors who can teach this subject
  const mentors = await Student.findMentorsForSubject(
    subjectId,
    student.branch,
    userId
  );

  const mentorsWithDetails = mentors.map((mentor) => {
    const strongSubject = mentor.strongSubjects.find(
      (s) => s.subject_id._id.toString() === subjectId
    );

    return {
      _id: mentor._id,
      name: mentor.name,
      profileImage: mentor.profileImage,
      year: mentor.year,
      currentSemester: mentor.currentSemester,
      cgpa: mentor.academicInfo?.cgpa,
      user: {
        email: mentor.user_id.email,
        username: mentor.user_id.username,
      },
      mentorPreferences: mentor.mentorPreferences,
      strongSubjectInfo: {
        confidenceLevel: strongSubject?.confidenceLevel,
        addedAt: strongSubject?.addedAt,
      },
      lastActiveAt: mentor.lastActiveAt,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subject: {
          _id: subject._id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          semester: subject.semester,
        },
        mentors: mentorsWithDetails,
        totalMentors: mentorsWithDetails.length,
      },
      "Mentors found successfully"
    )
  );
});

// Get all subjects with mentor count for student's branch
export const getSubjectsWithMentorCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Get all subjects for the student's branch up to their current semester
  const subjects = await Subject.find({
    branch: student.branch,
    semester: { $lte: student.currentSemester },
    isActive: true,
  }).sort({ semester: 1, subject_name: 1 });

  // Get mentor counts for each subject
  const subjectsWithMentorCount = await Promise.all(
    subjects.map(async (subject) => {
      const mentorCount = await Student.countDocuments({
        branch: student.branch,
        "strongSubjects.subject_id": subject._id,
        "mentorPreferences.isAvailableForMentoring": true,
        isActive: true,
        profileCompleted: true,
        user_id: { $ne: userId }, // Exclude self
      });

      return {
        _id: subject._id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        semester: subject.semester,
        credits: subject.credits,
        mentorCount,
      };
    })
  );

  // Group by semester
  const subjectsBySemester = subjectsWithMentorCount.reduce((acc, subject) => {
    if (!acc[subject.semester]) {
      acc[subject.semester] = [];
    }
    acc[subject.semester].push(subject);
    return acc;
  }, {});

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subjectsBySemester,
        totalSubjects: subjects.length,
        studentInfo: {
          branch: student.branch,
          currentSemester: student.currentSemester,
          year: student.year,
        },
      },
      "Subjects with mentor count fetched successfully"
    )
  );
});

// Update mentor preferences
export const updateMentorPreferences = asyncHandler(async (req, res) => {
  const {
    isAvailableForMentoring,
    maxMentees,
    preferredTeachingMode,
    availableTimeSlots,
  } = req.body;
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Update mentor preferences
  if (isAvailableForMentoring !== undefined) {
    student.mentorPreferences.isAvailableForMentoring = isAvailableForMentoring;
  }
  if (maxMentees !== undefined) {
    student.mentorPreferences.maxMentees = Math.max(
      1,
      Math.min(20, maxMentees)
    );
  }
  if (preferredTeachingMode) {
    student.mentorPreferences.preferredTeachingMode = preferredTeachingMode;
  }
  if (availableTimeSlots) {
    student.mentorPreferences.availableTimeSlots = availableTimeSlots;
  }

  await student.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        student.mentorPreferences,
        "Mentor preferences updated successfully"
      )
    );
});

// Update academic information
export const updateAcademicInfo = asyncHandler(async (req, res) => {
  const { cgpa, completedSemesters } = req.body;
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  if (cgpa !== undefined) {
    student.academicInfo.cgpa = Math.max(0, Math.min(10, cgpa));
  }

  if (completedSemesters && Array.isArray(completedSemesters)) {
    student.academicInfo.completedSemesters = completedSemesters;
  }

  await student.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        student.academicInfo,
        "Academic information updated successfully"
      )
    );
});

// Update student profile
export const updateStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updateFields = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateFields.user_id;
  delete updateFields._id;

  // Clean and sanitize the update fields
  const sanitizedFields = {};
  Object.keys(updateFields).forEach((key) => {
    const value = updateFields[key];
    if (value !== undefined && value !== null) {
      if (typeof value === "string") {
        sanitizedFields[key] = value.trim();
      } else {
        sanitizedFields[key] = value;
      }
    }
  });

  // Handle special fields that need parsing
  if (
    sanitizedFields.academicInfo &&
    typeof sanitizedFields.academicInfo === "string"
  ) {
    try {
      sanitizedFields.academicInfo = JSON.parse(sanitizedFields.academicInfo);
    } catch (error) {
      delete sanitizedFields.academicInfo; // Remove invalid JSON
    }
  }

  if (
    sanitizedFields.strongSubjects &&
    typeof sanitizedFields.strongSubjects === "string"
  ) {
    try {
      sanitizedFields.strongSubjects = JSON.parse(
        sanitizedFields.strongSubjects
      );
    } catch (error) {
      delete sanitizedFields.strongSubjects; // Remove invalid JSON
    }
  }

  // Check if student profile exists
  const existingStudent = await Student.findOne({ user_id: userId });

  if (!existingStudent) {
    throw new ApiError(
      404,
      "Student profile not found. Please create a profile first using the register endpoint."
    );
  }

  // Auto-assign subjects if branch and semester are being updated
  if (sanitizedFields.branch || sanitizedFields.currentSemester) {
    const branch = sanitizedFields.branch || existingStudent.branch;
    const semester =
      sanitizedFields.currentSemester || existingStudent.currentSemester;

    if (branch && semester) {
      const subjects = await getSubjectsFromDatabase(branch, semester);
      sanitizedFields.subjects = subjects;
    }
  }

  // Validate year-semester consistency if both are present
  if (sanitizedFields.year || sanitizedFields.currentSemester) {
    const year = sanitizedFields.year || existingStudent.year;
    const semester =
      sanitizedFields.currentSemester || existingStudent.currentSemester;

    if (year && semester) {
      const expectedSemesterRange = {
        1: [1, 2],
        2: [3, 4],
        3: [5, 6],
        4: [7, 8],
      };

      if (!expectedSemesterRange[year]?.includes(parseInt(semester))) {
        throw new ApiError(
          400,
          `Semester ${semester} is not valid for year ${year}`
        );
      }
    }
  }

  // Update existing student profile with provided fields only
  try {
    const student = await Student.findOneAndUpdate(
      { user_id: userId },
      { $set: sanitizedFields },
      {
        new: true,
        runValidators: false, // Disable validators for partial updates
      }
    ).populate("user_id", "email username");

    // Check if profile is now complete and update user status if needed
    const isComplete =
      student.name &&
      student.phone &&
      student.branch &&
      student.year &&
      student.currentSemester;
    if (isComplete) {
      await User.findByIdAndUpdate(userId, {
        role: "student",
        isProfileComplete: true,
      });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student,
          profileComplete: isComplete,
        },
        "Student profile updated successfully"
      )
    );
  } catch (error) {
    console.error("Error updating student profile:", error);
    throw new ApiError(
      500,
      `Failed to update student profile: ${error.message}`
    );
  }
});

// Delete student profile
export const deleteStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOneAndDelete({ user_id: userId });

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Update user role
  await User.findByIdAndUpdate(userId, {
    role: null,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Student profile deleted successfully"));
});

// Get all students (for admin functionality)
export const getAllStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, branch, year, currentSemester } = req.query;

  const query = { isActive: true };

  // Filter by branch if provided
  if (branch) {
    query.branch = branch;
  }

  // Filter by year if provided
  if (year) {
    query.year = parseInt(year);
  }

  // Filter by semester if provided
  if (currentSemester) {
    query.currentSemester = parseInt(currentSemester);
  }

  const skip = (page - 1) * limit;

  const students = await Student.find(query)
    .populate("user_id", "email username")
    .populate("strongSubjects.subject_id", "subject_name subject_code semester")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("-__v");

  const total = await Student.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        students,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          per_page: parseInt(limit),
        },
      },
      "Students retrieved successfully"
    )
  );
});

// Get student by ID (public)
export const getStudentById = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId)
    .populate("user_id", "email username")
    .populate(
      "strongSubjects.subject_id",
      "subject_name subject_code semester credits"
    )
    .select("-__v");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, student, "Student details retrieved successfully")
    );
});

// Get subjects by semester and branch
export const getSubjectsBySemester = asyncHandler(async (req, res) => {
  const { semester } = req.params;
  const { branch } = req.query;

  if (!semester || !branch) {
    throw new ApiError(400, "Semester and branch are required");
  }

  const subjects = await Subject.find({
    branch: branch,
    semester: parseInt(semester),
    isActive: true,
  })
    .select("subject_name subject_code credits")
    .sort({ subject_name: 1 });

  const formattedSubjects = subjects.map((subject) => ({
    name: subject.subject_name,
    code: subject.subject_code,
    credits: subject.credits,
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        semester: parseInt(semester),
        branch,
        subjects: formattedSubjects,
        totalSubjects: formattedSubjects.length,
      },
      "Subjects retrieved successfully"
    )
  );
});

// ============= MENTORSHIP REQUEST SYSTEM =============

// Send mentorship request to a senior
export const sendMentorshipRequest = asyncHandler(async (req, res) => {
  const { mentorId, subjectId, message } = req.body;
  const userId = req.user._id;

  if (!mentorId || !subjectId) {
    throw new ApiError(400, "Mentor ID and Subject ID are required");
  }

  // Get current student
  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Get mentor student
  const mentor = await Student.findById(mentorId)
    .populate("strongSubjects.subject_id")
    .populate("user_id", "email username");

  if (!mentor) {
    throw new ApiError(404, "Mentor not found");
  }

  // Verify mentor can teach this subject
  if (!mentor.canMentorSubject(subjectId)) {
    throw new ApiError(
      400,
      "Mentor doesn't have this subject as strong subject"
    );
  }

  // Check if mentor is available for mentoring
  if (!mentor.mentorPreferences.isAvailableForMentoring) {
    throw new ApiError(400, "Mentor is not available for mentoring");
  }

  // Check if mentor can accept more mentees
  if (!mentor.canAcceptMoreMentees()) {
    throw new ApiError(400, "Mentor has reached maximum mentee capacity");
  }

  // Check if student already has a mentor for this subject
  if (student.hasMentorForSubject(subjectId)) {
    throw new ApiError(400, "You already have a mentor for this subject");
  }

  // Check if request already exists
  if (student.hasRequestedMentor(mentorId, subjectId)) {
    throw new ApiError(
      400,
      "Request already sent to this mentor for this subject"
    );
  }

  // Verify subject exists and both students are from same branch
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  if (student.branch !== mentor.branch) {
    throw new ApiError(400, "Can only request mentors from same branch");
  }

  // Add outgoing request to student
  const newOutgoingRequest = {
    mentor_id: mentorId,
    subject_id: subjectId,
    message: message || "",
    status: "pending",
    requestedAt: new Date(),
  };
  student.mentorshipConnections.outgoingRequests.push(newOutgoingRequest);

  // Add incoming request to mentor
  const newIncomingRequest = {
    student_id: student._id,
    subject_id: subjectId,
    message: message || "",
    status: "pending",
    requestedAt: new Date(),
  };
  mentor.mentorshipConnections.incomingRequests.push(newIncomingRequest);

  await Promise.all([student.save(), mentor.save()]);

  // Send notification to mentor
  try {
    await notifyMentorshipRequest(
      mentor.user_id._id,
      userId,
      student.name,
      subject.subject_name,
      newIncomingRequest._id,
      subjectId
    );

    // Send real-time update
    sendMentorshipUpdate(mentor.user_id._id, "new_request", {
      studentName: student.name,
      subjectName: subject.subject_name,
      message: message || "",
      requestId: newIncomingRequest._id,
    });
  } catch (notificationError) {
    console.error("Failed to send notification:", notificationError);
    // Don't fail the main operation if notification fails
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        mentorName: mentor.name,
        subjectName: subject.subject_name,
        message: "Mentorship request sent successfully",
      },
      "Mentorship request sent successfully"
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

  // Get mentor student
  const mentor = await Student.findOne({ user_id: userId });
  if (!mentor) {
    throw new ApiError(404, "Student profile not found");
  }

  // Find the incoming request
  const requestIndex = mentor.mentorshipConnections.incomingRequests.findIndex(
    (req) => req._id.toString() === requestId
  );

  if (requestIndex === -1) {
    throw new ApiError(404, "Request not found");
  }

  const request = mentor.mentorshipConnections.incomingRequests[requestIndex];

  if (request.status !== "pending") {
    throw new ApiError(400, "Request has already been responded to");
  }

  // Get the student who sent the request
  const student = await Student.findById(request.student_id);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  // Update request status
  request.status = response;
  request.respondedAt = new Date();

  // Update corresponding outgoing request in student's record
  const studentRequestIndex =
    student.mentorshipConnections.outgoingRequests.findIndex(
      (req) =>
        req.mentor_id.toString() === mentor._id.toString() &&
        req.subject_id.toString() === request.subject_id.toString() &&
        req.status === "pending"
    );

  if (studentRequestIndex !== -1) {
    student.mentorshipConnections.outgoingRequests[studentRequestIndex].status =
      response;
    student.mentorshipConnections.outgoingRequests[
      studentRequestIndex
    ].respondedAt = new Date();
  }

  if (response === "accepted") {
    // Check if mentor can still accept more mentees
    if (!mentor.canAcceptMoreMentees()) {
      throw new ApiError(
        400,
        "Mentor capacity reached. Cannot accept more mentees"
      );
    }

    // Add to active mentorship relationships
    const menteeRelationship = {
      mentee_id: student._id,
      subject_id: request.subject_id,
      connectedAt: new Date(),
      isActive: true,
      lastInteraction: new Date(),
    };
    mentor.mentorshipConnections.mentees.push(menteeRelationship);

    const mentorRelationship = {
      mentor_id: mentor._id,
      subject_id: request.subject_id,
      connectedAt: new Date(),
      isActive: true,
      lastInteraction: new Date(),
    };
    student.mentorshipConnections.mentors.push(mentorRelationship);
  }

  await Promise.all([mentor.save(), student.save()]);

  const subject = await Subject.findById(request.subject_id);

  // Send notification to student about the response
  try {
    await notifyMentorshipResponse(
      student.user_id,
      mentor.user_id,
      mentor.name,
      subject.subject_name,
      response,
      requestId,
      request.subject_id
    );

    // Send real-time update to student
    sendMentorshipUpdate(student.user_id, "request_response", {
      mentorName: mentor.name,
      subjectName: subject.subject_name,
      response,
      requestId,
    });

    // If accepted, also send connection notification
    if (response === "accepted") {
      await notifyNewConnection(
        student.user_id,
        mentor.user_id,
        mentor.name,
        "mentor",
        subject.subject_name,
        mentorRelationship._id
      );

      await notifyNewConnection(
        mentor.user_id,
        student.user_id,
        student.name,
        "mentee",
        subject.subject_name,
        menteeRelationship._id
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
        subjectName: subject.subject_name,
        response,
      },
      `Mentorship request ${response} successfully`
    )
  );
});

// Get incoming mentorship requests (for mentors)
export const getIncomingMentorshipRequests = asyncHandler(async (req, res) => {
  const { status = "pending" } = req.query;
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate({
      path: "mentorshipConnections.incomingRequests.student_id",
      select: "name profileImage year currentSemester academicInfo user_id",
      populate: {
        path: "user_id",
        select: "email username",
      },
    })
    .populate(
      "mentorshipConnections.incomingRequests.subject_id",
      "subject_name subject_code semester"
    );

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Filter requests by status
  const filteredRequests =
    student.mentorshipConnections.incomingRequests.filter(
      (request) => status === "all" || request.status === status
    );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        requests: filteredRequests,
        totalRequests: filteredRequests.length,
      },
      "Incoming mentorship requests retrieved successfully"
    )
  );
});

// Get outgoing mentorship requests (for students)
export const getOutgoingMentorshipRequests = asyncHandler(async (req, res) => {
  const { status = "pending" } = req.query;
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate({
      path: "mentorshipConnections.outgoingRequests.mentor_id",
      select: "name profileImage year currentSemester academicInfo user_id",
      populate: {
        path: "user_id",
        select: "email username",
      },
    })
    .populate(
      "mentorshipConnections.outgoingRequests.subject_id",
      "subject_name subject_code semester"
    );

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Filter requests by status
  const filteredRequests =
    student.mentorshipConnections.outgoingRequests.filter(
      (request) => status === "all" || request.status === status
    );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        requests: filteredRequests,
        totalRequests: filteredRequests.length,
      },
      "Outgoing mentorship requests retrieved successfully"
    )
  );
});

// Get current mentors (for students)
export const getCurrentMentors = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate({
      path: "mentorshipConnections.mentors.mentor_id",
      select:
        "name profileImage year currentSemester academicInfo mentorPreferences user_id",
      populate: {
        path: "user_id",
        select: "email username",
      },
    })
    .populate(
      "mentorshipConnections.mentors.subject_id",
      "subject_name subject_code semester"
    );

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const activeMentors = student.mentorshipConnections.mentors.filter(
    (mentor) => mentor.isActive
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mentors: activeMentors,
        totalMentors: activeMentors.length,
      },
      "Current mentors retrieved successfully"
    )
  );
});

// Get current mentees (for mentors)
export const getCurrentMentees = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate({
      path: "mentorshipConnections.mentees.mentee_id",
      select: "name profileImage year currentSemester academicInfo user_id",
      populate: {
        path: "user_id",
        select: "email username",
      },
    })
    .populate(
      "mentorshipConnections.mentees.subject_id",
      "subject_name subject_code semester"
    );

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const activeMentees = student.mentorshipConnections.mentees.filter(
    (mentee) => mentee.isActive
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mentees: activeMentees,
        totalMentees: activeMentees.length,
        maxMentees: student.mentorPreferences.maxMentees,
        canAcceptMore: student.canAcceptMoreMentees(),
      },
      "Current mentees retrieved successfully"
    )
  );
});

// End mentorship relationship
export const endMentorshipRelationship = asyncHandler(async (req, res) => {
  const { relationshipId, relationshipType } = req.body; // relationshipType: "mentor" or "mentee"
  const userId = req.user._id;

  if (!relationshipId || !relationshipType) {
    throw new ApiError(400, "Relationship ID and type are required");
  }

  if (!["mentor", "mentee"].includes(relationshipType)) {
    throw new ApiError(400, "Relationship type must be 'mentor' or 'mentee'");
  }

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  let relationshipIndex = -1;
  let otherPartyId = null;
  let subjectId = null;

  if (relationshipType === "mentor") {
    // Student is ending relationship with their mentor
    relationshipIndex = student.mentorshipConnections.mentors.findIndex(
      (rel) => rel._id.toString() === relationshipId
    );

    if (relationshipIndex !== -1) {
      const relationship =
        student.mentorshipConnections.mentors[relationshipIndex];
      otherPartyId = relationship.mentor_id;
      subjectId = relationship.subject_id;
      student.mentorshipConnections.mentors[relationshipIndex].isActive = false;
    }
  } else {
    // Student is ending relationship with their mentee
    relationshipIndex = student.mentorshipConnections.mentees.findIndex(
      (rel) => rel._id.toString() === relationshipId
    );

    if (relationshipIndex !== -1) {
      const relationship =
        student.mentorshipConnections.mentees[relationshipIndex];
      otherPartyId = relationship.mentee_id;
      subjectId = relationship.subject_id;
      student.mentorshipConnections.mentees[relationshipIndex].isActive = false;
    }
  }

  if (relationshipIndex === -1) {
    throw new ApiError(404, "Relationship not found");
  }

  // Update the other party's relationship record
  const otherParty = await Student.findById(otherPartyId);
  if (otherParty) {
    if (relationshipType === "mentor") {
      // Find corresponding mentee relationship in mentor's record
      const menteeIndex = otherParty.mentorshipConnections.mentees.findIndex(
        (rel) =>
          rel.mentee_id.toString() === student._id.toString() &&
          rel.subject_id.toString() === subjectId.toString()
      );
      if (menteeIndex !== -1) {
        otherParty.mentorshipConnections.mentees[menteeIndex].isActive = false;
      }
    } else {
      // Find corresponding mentor relationship in mentee's record
      const mentorIndex = otherParty.mentorshipConnections.mentors.findIndex(
        (rel) =>
          rel.mentor_id.toString() === student._id.toString() &&
          rel.subject_id.toString() === subjectId.toString()
      );
      if (mentorIndex !== -1) {
        otherParty.mentorshipConnections.mentors[mentorIndex].isActive = false;
      }
    }
    await otherParty.save();
  }

  await student.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Mentorship relationship ended successfully")
    );
});

// Get mentorship dashboard data
export const getMentorshipDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate(
      "mentorshipConnections.incomingRequests.student_id",
      "name profileImage"
    )
    .populate(
      "mentorshipConnections.outgoingRequests.mentor_id",
      "name profileImage"
    )
    .populate("mentorshipConnections.mentors.mentor_id", "name profileImage")
    .populate("mentorshipConnections.mentees.mentee_id", "name profileImage");

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const dashboard = {
    // As a potential mentee
    mentee: {
      pendingRequests: student.mentorshipConnections.outgoingRequests.filter(
        (req) => req.status === "pending"
      ).length,
      activeMentors: student.mentorshipConnections.mentors.filter(
        (mentor) => mentor.isActive
      ).length,
      rejectedRequests: student.mentorshipConnections.outgoingRequests.filter(
        (req) => req.status === "rejected"
      ).length,
      recentMentors: student.mentorshipConnections.mentors
        .filter((mentor) => mentor.isActive)
        .slice(0, 3),
    },

    // As a potential mentor
    mentor: {
      pendingRequests: student.mentorshipConnections.incomingRequests.filter(
        (req) => req.status === "pending"
      ).length,
      activeMentees: student.mentorshipConnections.mentees.filter(
        (mentee) => mentee.isActive
      ).length,
      maxMentees: student.mentorPreferences.maxMentees,
      canAcceptMore: student.canAcceptMoreMentees(),
      recentMentees: student.mentorshipConnections.mentees
        .filter((mentee) => mentee.isActive)
        .slice(0, 3),
    },

    // Overall stats
    stats: {
      totalConnections:
        student.mentorshipConnections.mentors.filter((m) => m.isActive).length +
        student.mentorshipConnections.mentees.filter((m) => m.isActive).length,
      strongSubjectsCount: student.strongSubjects.length,
      isAvailableForMentoring:
        student.mentorPreferences.isAvailableForMentoring,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dashboard,
        "Mentorship dashboard retrieved successfully"
      )
    );
});

// ============= OFFICIAL MENTOR FUNCTIONS =============

// Get available official mentors
export const getAvailableOfficialMentors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    skills,
    designation,
    experience_min,
    experience_max,
    sortBy = "experience_years",
    sortOrder = "desc",
  } = req.query;

  const query = { isActive: true };

  // Filter by skills
  if (skills) {
    const skillsArray = skills.split(",").map((skill) => skill.trim());
    query.skills = { $in: skillsArray };
  }

  // Filter by designation
  if (designation) {
    query.designation = { $regex: designation, $options: "i" };
  }

  // Filter by experience range
  if (experience_min || experience_max) {
    query.experience_years = {};
    if (experience_min) query.experience_years.$gte = parseInt(experience_min);
    if (experience_max) query.experience_years.$lte = parseInt(experience_max);
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

  const mentors = await Mentor.find(query)
    .populate("user_id", "email username")
    .select("-__v")
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const totalMentors = await Mentor.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mentors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMentors / parseInt(limit)),
          totalMentors,
          hasNextPage:
            parseInt(page) < Math.ceil(totalMentors / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
      },
      "Official mentors retrieved successfully"
    )
  );
});

// Send request to official mentor
export const sendOfficialMentorRequest = asyncHandler(async (req, res) => {
  const { mentorId, message } = req.body;
  const userId = req.user._id;

  if (!mentorId) {
    throw new ApiError(400, "Mentor ID is required");
  }

  // Get current student
  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Get mentor
  const mentor = await Mentor.findById(mentorId).populate(
    "user_id",
    "email username"
  );

  if (!mentor) {
    throw new ApiError(404, "Mentor not found");
  }

  if (!mentor.isActive) {
    throw new ApiError(400, "Mentor is not currently active");
  }

  // Check if student already has a request pending with this mentor
  if (student.hasRequestedOfficialMentor(mentorId)) {
    throw new ApiError(400, "Request already sent to this mentor");
  }

  // Check if student already has this mentor as active
  if (student.hasActiveOfficialMentor(mentorId)) {
    throw new ApiError(
      400,
      "You already have this mentor as active official mentor"
    );
  }

  // Add outgoing request to student
  const newRequest = {
    mentor_id: mentorId,
    message: message || "",
    status: "pending",
    requestedAt: new Date(),
  };
  student.officialMentors.outgoingRequests.push(newRequest);

  await student.save();

  // Send notification to official mentor
  try {
    await notifyOfficialMentorRequest(
      mentor.user_id._id,
      userId,
      student.name,
      newRequest._id
    );

    // Send real-time update
    sendMentorshipUpdate(mentor.user_id._id, "new_official_request", {
      studentName: student.name,
      message: message || "",
      requestId: newRequest._id,
    });
  } catch (notificationError) {
    console.error("Failed to send notification:", notificationError);
    // Don't fail the main operation if notification fails
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        mentorName: mentor.name,
        mentorDesignation: mentor.designation,
        message: "Official mentorship request sent successfully",
      },
      "Official mentorship request sent successfully"
    )
  );
});

// Get outgoing official mentor requests
export const getOfficialMentorRequests = asyncHandler(async (req, res) => {
  const { status = "pending" } = req.query;
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId }).populate({
    path: "officialMentors.outgoingRequests.mentor_id",
    select: "name designation experience_years skills bio user_id",
    populate: {
      path: "user_id",
      select: "email username",
    },
  });

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Filter requests by status
  const filteredRequests = student.officialMentors.outgoingRequests.filter(
    (request) => status === "all" || request.status === status
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        requests: filteredRequests,
        totalRequests: filteredRequests.length,
      },
      "Official mentor requests retrieved successfully"
    )
  );
});

// Get current official mentors
export const getCurrentOfficialMentors = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId }).populate({
    path: "officialMentors.activeMentors.mentor_id",
    select:
      "name designation experience_years skills bio available_time_slots user_id",
    populate: {
      path: "user_id",
      select: "email username",
    },
  });

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const activeMentors = student.officialMentors.activeMentors.filter(
    (mentor) => mentor.isActive
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        mentors: activeMentors,
        totalMentors: activeMentors.length,
      },
      "Current official mentors retrieved successfully"
    )
  );
});

// End official mentorship relationship
export const endOfficialMentorshipRelationship = asyncHandler(
  async (req, res) => {
    const { relationshipId } = req.body;
    const userId = req.user._id;

    if (!relationshipId) {
      throw new ApiError(400, "Relationship ID is required");
    }

    const student = await Student.findOne({ user_id: userId });
    if (!student) {
      throw new ApiError(404, "Student profile not found");
    }

    // Find the relationship
    const relationshipIndex = student.officialMentors.activeMentors.findIndex(
      (rel) => rel._id.toString() === relationshipId
    );

    if (relationshipIndex === -1) {
      throw new ApiError(404, "Relationship not found");
    }

    // End the relationship
    student.officialMentors.activeMentors[relationshipIndex].isActive = false;
    await student.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Official mentorship relationship ended successfully"
        )
      );
  }
);

// Enhanced mentor discovery that considers 4th year students
export const findMentorsForSubjectEnhanced = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "cgpa",
    sortOrder = "desc",
  } = req.query;
  const userId = req.user._id;

  if (!subjectId) {
    throw new ApiError(400, "Subject ID is required");
  }

  // Get current student to check their year
  const currentStudent = await Student.findOne({ user_id: userId });
  if (!currentStudent) {
    throw new ApiError(404, "Student profile not found");
  }

  // Get subject details
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  let mentors = [];
  let totalMentors = 0;

  // If 4th year student, only show official mentors
  if (currentStudent.isFourthYear()) {
    const query = { isActive: true };

    // For 4th year, we don't filter by subject as official mentors can help with general guidance
    mentors = await Mentor.find(query)
      .populate("user_id", "email username")
      .select("-__v")
      .sort({ experience_years: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    totalMentors = await Mentor.countDocuments(query);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          mentors,
          mentorType: "official",
          message:
            "As a 4th year student, you can only connect with official mentors",
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalMentors / parseInt(limit)),
            totalMentors,
            hasNextPage:
              parseInt(page) < Math.ceil(totalMentors / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
          },
        },
        "Official mentors for 4th year student retrieved successfully"
      )
    );
  } else {
    // For other students, show student mentors for the specific subject
    const query = {
      branch: currentStudent.branch,
      "strongSubjects.subject_id": subjectId,
      "mentorPreferences.isAvailableForMentoring": true,
      isActive: true,
      profileCompleted: true,
      user_id: { $ne: userId }, // Exclude current user
      year: { $gt: currentStudent.year }, // Only show seniors
    };

    const sortOptions = {};
    if (sortBy === "cgpa") {
      sortOptions["academicInfo.cgpa"] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    mentors = await Student.find(query)
      .populate("user_id", "email username")
      .populate(
        "strongSubjects.subject_id",
        "subject_name subject_code semester"
      )
      .select("-__v -mentorshipConnections")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    totalMentors = await Student.countDocuments(query);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          mentors,
          mentorType: "student",
          subject: subject,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalMentors / parseInt(limit)),
            totalMentors,
            hasNextPage:
              parseInt(page) < Math.ceil(totalMentors / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
          },
        },
        "Student mentors retrieved successfully"
      )
    );
  }
});
