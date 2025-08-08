import Student from "../models/student.js";
import Subject from "../models/subject.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Middleware to validate if user has a complete student profile
 */
export const requireCompleteProfile = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ user_id: req.user._id });

  if (!student) {
    throw new ApiError(
      404,
      "Student profile not found. Please create your profile first."
    );
  }

  if (!student.profileCompleted) {
    throw new ApiError(
      400,
      "Please complete your profile before accessing this feature."
    );
  }

  req.student = student; // Attach student to request for use in controllers
  next();
});

/**
 * Middleware to validate strong subjects data
 */
export const validateStrongSubjects = asyncHandler(async (req, res, next) => {
  const { strongSubjects } = req.body;

  if (!Array.isArray(strongSubjects)) {
    throw new ApiError(400, "Strong subjects must be an array");
  }

  if (strongSubjects.length === 0) {
    throw new ApiError(400, "At least one strong subject is required");
  }

  // Validate each strong subject
  for (const subject of strongSubjects) {
    if (!subject.subject_id) {
      throw new ApiError(400, "Subject ID is required for each strong subject");
    }

    if (
      subject.confidenceLevel &&
      (subject.confidenceLevel < 1 || subject.confidenceLevel > 5)
    ) {
      throw new ApiError(400, "Confidence level must be between 1 and 5");
    }
  }

  next();
});

/**
 * Middleware to validate mentor preferences
 */
export const validateMentorPreferences = asyncHandler(
  async (req, res, next) => {
    const {
      isAvailableForMentoring,
      maxMentees,
      preferredTeachingMode,
      availableTimeSlots,
    } = req.body;

    if (
      isAvailableForMentoring !== undefined &&
      typeof isAvailableForMentoring !== "boolean"
    ) {
      throw new ApiError(400, "isAvailableForMentoring must be a boolean");
    }

    if (maxMentees !== undefined) {
      if (!Number.isInteger(maxMentees) || maxMentees < 1 || maxMentees > 20) {
        throw new ApiError(
          400,
          "maxMentees must be an integer between 1 and 20"
        );
      }
    }

    if (
      preferredTeachingMode &&
      !["online", "offline", "both"].includes(preferredTeachingMode)
    ) {
      throw new ApiError(
        400,
        "preferredTeachingMode must be 'online', 'offline', or 'both'"
      );
    }

    if (availableTimeSlots && Array.isArray(availableTimeSlots)) {
      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      for (const slot of availableTimeSlots) {
        if (!slot.day || !validDays.includes(slot.day)) {
          throw new ApiError(400, "Invalid day in available time slots");
        }

        if (!slot.startTime || !slot.endTime) {
          throw new ApiError(
            400,
            "Start time and end time are required for each time slot"
          );
        }

        // Basic time format validation (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
          throw new ApiError(
            400,
            "Time format should be HH:MM (24-hour format)"
          );
        }
      }
    }

    next();
  }
);

/**
 * Middleware to validate academic information
 */
export const validateAcademicInfo = asyncHandler(async (req, res, next) => {
  const { cgpa, completedSemesters } = req.body;

  if (cgpa !== undefined) {
    if (typeof cgpa !== "number" || cgpa < 0 || cgpa > 10) {
      throw new ApiError(400, "CGPA must be a number between 0 and 10");
    }
  }

  if (completedSemesters !== undefined) {
    if (!Array.isArray(completedSemesters)) {
      throw new ApiError(400, "Completed semesters must be an array");
    }

    for (const semester of completedSemesters) {
      if (
        !semester.semester ||
        !Number.isInteger(semester.semester) ||
        semester.semester < 1 ||
        semester.semester > 8
      ) {
        throw new ApiError(
          400,
          "Invalid semester number in completed semesters"
        );
      }

      if (
        semester.gpa !== undefined &&
        (typeof semester.gpa !== "number" ||
          semester.gpa < 0 ||
          semester.gpa > 10)
      ) {
        throw new ApiError(400, "GPA must be a number between 0 and 10");
      }
    }
  }

  next();
});

/**
 * Middleware to validate subject ID parameter
 */
export const validateSubjectId = asyncHandler(async (req, res, next) => {
  const { subjectId } = req.params;

  if (!subjectId) {
    throw new ApiError(400, "Subject ID is required");
  }

  // Check if it's a valid MongoDB ObjectId
  if (!subjectId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid subject ID format");
  }

  // Check if subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  req.subject = subject; // Attach subject to request
  next();
});

/**
 * Middleware to validate branch parameter
 */
export const validateBranch = asyncHandler(async (req, res, next) => {
  const { branch } = req.params;
  const validBranches = ["Computer", "IT", "AIML", "ECS"];

  if (branch && !validBranches.includes(branch)) {
    throw new ApiError(
      400,
      `Invalid branch. Must be one of: ${validBranches.join(", ")}`
    );
  }

  next();
});

/**
 * Middleware to validate semester parameter
 */
export const validateSemester = asyncHandler(async (req, res, next) => {
  const { semester } = req.params;

  if (semester) {
    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      throw new ApiError(400, "Semester must be a number between 1 and 8");
    }
  }

  next();
});

/**
 * Middleware to validate pagination parameters
 */
export const validatePagination = asyncHandler(async (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ApiError(400, "Page must be a positive integer");
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new ApiError(
        400,
        "Limit must be a positive integer between 1 and 100"
      );
    }
  }

  next();
});

/**
 * Middleware to check if student can access mentoring features
 */
export const canAccessMentoring = asyncHandler(async (req, res, next) => {
  const student =
    req.student || (await Student.findOne({ user_id: req.user._id }));

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  if (student.currentSemester <= 1) {
    throw new ApiError(
      400,
      "Mentoring features are available from 2nd semester onwards"
    );
  }

  if (!req.student) {
    req.student = student;
  }

  next();
});

/**
 * Middleware to validate file upload for profile image
 */
export const validateProfileImage = (req, res, next) => {
  if (!req.file) {
    throw new ApiError(400, "Profile image is required");
  }

  // Check file size (5MB max)
  if (req.file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, "Profile image must be less than 5MB");
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedTypes.includes(req.file.mimetype)) {
    throw new ApiError(
      400,
      "Profile image must be a valid image file (JPEG, PNG, GIF, WebP)"
    );
  }

  next();
};
