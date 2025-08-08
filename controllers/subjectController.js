import Subject from "../models/subject.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Get all subjects
export const getAllSubjects = asyncHandler(async (req, res) => {
  const { branch, semester, page = 1, limit = 50 } = req.query;

  const query = { isActive: true };

  if (branch) query.branch = branch;
  if (semester) query.semester = parseInt(semester);

  const skip = (page - 1) * limit;

  const subjects = await Subject.find(query)
    .sort({ branch: 1, semester: 1, subject_name: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Subject.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        subjects,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          per_page: parseInt(limit),
        },
      },
      "Subjects retrieved successfully"
    )
  );
});

// Get subjects by branch and semester
export const getSubjectsByBranchSemester = asyncHandler(async (req, res) => {
  const { branch, semester } = req.params;

  const subjects = await Subject.find({
    branch,
    semester: parseInt(semester),
    isActive: true,
  }).sort({ subject_name: 1 });

  res
    .status(200)
    .json(new ApiResponse(200, subjects, "Subjects retrieved successfully"));
});

// Create new subject (admin only)
export const createSubject = asyncHandler(async (req, res) => {
  const { branch, semester, subject_name, subject_code, credits } = req.body;

  if (!branch || !semester || !subject_name) {
    throw new ApiError(400, "Branch, semester, and subject name are required");
  }

  // Check if subject already exists
  const existingSubject = await Subject.findOne({
    branch,
    semester,
    subject_name: subject_name.trim(),
  });

  if (existingSubject) {
    throw new ApiError(
      400,
      "Subject already exists for this branch and semester"
    );
  }

  const subject = await Subject.create({
    branch,
    semester: parseInt(semester),
    subject_name: subject_name.trim(),
    subject_code: subject_code?.trim(),
    credits: credits || 3,
  });

  res
    .status(201)
    .json(new ApiResponse(201, subject, "Subject created successfully"));
});

// Update subject (admin only)
export const updateSubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const updateData = req.body;

  const subject = await Subject.findByIdAndUpdate(subjectId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, subject, "Subject updated successfully"));
});

// Delete subject (admin only)
export const deleteSubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;

  const subject = await Subject.findByIdAndDelete(subjectId);

  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Subject deleted successfully"));
});

// Get unique branches
export const getBranches = asyncHandler(async (req, res) => {
  const branches = await Subject.distinct("branch");

  res
    .status(200)
    .json(new ApiResponse(200, branches, "Branches retrieved successfully"));
});

// Get semesters by branch
export const getSemestersByBranch = asyncHandler(async (req, res) => {
  const { branch } = req.params;

  const semesters = await Subject.distinct("semester", {
    branch,
    isActive: true,
  });
  semesters.sort((a, b) => a - b);

  res
    .status(200)
    .json(new ApiResponse(200, semesters, "Semesters retrieved successfully"));
});
