import Student from "../models/student.js";
import User from "../models/user.js";
import Subject from "../models/subject.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Register a new student
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, phone, branch, semester } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!name || !phone || !branch || !semester) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already has a student profile
  const existingStudent = await Student.findOne({ user_id: userId });
  if (existingStudent) {
    throw new ApiError(400, "Student profile already exists");
  }

  // Validate branch and semester
  const validBranches = ["Computer", "IT", "AIML", "ECS"];
  if (!validBranches.includes(branch)) {
    throw new ApiError(400, "Invalid branch selected");
  }

  if (semester < 1 || semester > 8) {
    throw new ApiError(400, "Semester must be between 1 and 8");
  }

  // Fetch subjects for the selected branch and semester
  const subjects = await Subject.find({
    branch,
    semester,
    isActive: true,
  }).select("_id subject_name subject_code");

  // Create student profile
  const student = await Student.create({
    user_id: userId,
    name: name.trim(),
    phone: phone.trim(),
    branch,
    semester,
    subjects: subjects.map((subject) => ({
      subject_id: subject._id,
      subject_name: subject.subject_name,
    })),
  });

  // Update user role and profile completion status
  await User.findByIdAndUpdate(userId, {
    role: "student",
    isProfileComplete: true,
  });

  const studentData = await Student.findById(student._id).populate(
    "user_id",
    "email fullName"
  );

  res
    .status(201)
    .json(
      new ApiResponse(201, studentData, "Student profile created successfully")
    );
});

// Get student profile
export const getStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate("user_id", "email fullName")
    .populate("subjects.subject_id", "subject_name subject_code credits");

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, student, "Student profile retrieved successfully")
    );
});

// Update student profile
export const updateStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name, phone, branch, semester } = req.body;

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Check if branch or semester is being updated
  let shouldUpdateSubjects = false;
  if (
    (branch && branch !== student.branch) ||
    (semester && semester !== student.semester)
  ) {
    shouldUpdateSubjects = true;
  }

  // Update basic fields
  if (name) student.name = name.trim();
  if (phone) student.phone = phone.trim();
  if (branch) student.branch = branch;
  if (semester) student.semester = semester;

  // If branch or semester changed, update subjects
  if (shouldUpdateSubjects) {
    const subjects = await Subject.find({
      branch: student.branch,
      semester: student.semester,
      isActive: true,
    }).select("_id subject_name subject_code");

    student.subjects = subjects.map((subject) => ({
      subject_id: subject._id,
      subject_name: subject.subject_name,
    }));
  }

  await student.save();

  const updatedStudent = await Student.findById(student._id)
    .populate("user_id", "email fullName")
    .populate("subjects.subject_id", "subject_name subject_code credits");

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedStudent,
        "Student profile updated successfully"
      )
    );
});

// Delete student profile
export const deleteStudentProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOneAndDelete({ user_id: userId });

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Update user role and profile completion status
  await User.findByIdAndUpdate(userId, {
    role: null,
    isProfileComplete: false,
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Student profile deleted successfully"));
});

// Get all students (for admin functionality)
export const getAllStudents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, branch, semester } = req.query;

  const query = { isActive: true };

  // Filter by branch if provided
  if (branch) {
    query.branch = branch;
  }

  // Filter by semester if provided
  if (semester) {
    query.semester = parseInt(semester);
  }

  const skip = (page - 1) * limit;

  const students = await Student.find(query)
    .populate("user_id", "email fullName")
    .populate("subjects.subject_id", "subject_name subject_code")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Student.countDocuments(query);

  res.status(200).json(
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
    .populate("user_id", "email fullName")
    .populate("subjects.subject_id", "subject_name subject_code credits")
    .select("-__v");

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, student, "Student details retrieved successfully")
    );
});

// Get subjects by branch and semester
export const getSubjectsByBranchSemester = asyncHandler(async (req, res) => {
  const { branch, semester } = req.params;

  const subjects = await Subject.find({
    branch,
    semester: parseInt(semester),
    isActive: true,
  })
    .select("subject_name subject_code credits")
    .sort({ subject_name: 1 });

  res
    .status(200)
    .json(new ApiResponse(200, subjects, "Subjects retrieved successfully"));
});
