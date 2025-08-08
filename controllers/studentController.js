import Student from "../models/student.js";
import User from "../models/user.js";
import Subject from "../models/subject.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Register a new student profile
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, phone, branch, year, currentSemester } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!name || !phone || !branch || !year || !currentSemester) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already has a student profile
  const existingStudent = await Student.findOne({ user_id: userId });
  if (existingStudent) {
    throw new ApiError(400, "Student profile already exists");
  }

  // Validate branch, year, and semester
  const validBranches = ["Computer", "IT", "AIML", "ECS"];
  if (!validBranches.includes(branch)) {
    throw new ApiError(400, "Invalid branch selected");
  }

  if (year < 1 || year > 4) {
    throw new ApiError(400, "Year must be between 1 and 4");
  }

  if (currentSemester < 1 || currentSemester > 8) {
    throw new ApiError(400, "Semester must be between 1 and 8");
  }

  // Validate year-semester consistency
  const expectedSemesterRange = {
    1: [1, 2],
    2: [3, 4],
    3: [5, 6],
    4: [7, 8],
  };

  if (!expectedSemesterRange[year].includes(currentSemester)) {
    throw new ApiError(
      400,
      `Semester ${currentSemester} is not valid for year ${year}`
    );
  }

  // Create student profile
  const student = await Student.create({
    user_id: userId,
    name: name.trim(),
    phone: phone.trim(),
    branch,
    year,
    currentSemester,
  });

  // Update user role
  await User.findByIdAndUpdate(userId, {
    role: "student",
  });

  const populatedStudent = await Student.findById(student._id)
    .populate("user_id", "email username")
    .select("-__v");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        populatedStudent,
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

  // Upload image to cloudinary
  const imageUploadResult = await uploadOnCloudinary(req.file.path);
  if (!imageUploadResult) {
    throw new ApiError(500, "Failed to upload profile image");
  }

  student.profileImage = imageUploadResult.secure_url;
  await student.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { profileImage: student.profileImage },
        "Profile image updated successfully"
      )
    );
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
  const { name, phone, year, currentSemester } = req.body;

  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Update basic fields
  if (name) student.name = name.trim();
  if (phone) student.phone = phone.trim();
  if (year && year >= 1 && year <= 4) student.year = year;
  if (currentSemester && currentSemester >= 1 && currentSemester <= 8) {
    student.currentSemester = currentSemester;
  }

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

  return res
    .status(200)
    .json(new ApiResponse(200, subjects, "Subjects retrieved successfully"));
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
  student.mentorshipConnections.outgoingRequests.push({
    mentor_id: mentorId,
    subject_id: subjectId,
    message: message || "",
    status: "pending",
    requestedAt: new Date(),
  });

  // Add incoming request to mentor
  mentor.mentorshipConnections.incomingRequests.push({
    student_id: student._id,
    subject_id: subjectId,
    message: message || "",
    status: "pending",
    requestedAt: new Date(),
  });

  await Promise.all([student.save(), mentor.save()]);

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
    mentor.mentorshipConnections.mentees.push({
      mentee_id: student._id,
      subject_id: request.subject_id,
      connectedAt: new Date(),
      isActive: true,
      lastInteraction: new Date(),
    });

    student.mentorshipConnections.mentors.push({
      mentor_id: mentor._id,
      subject_id: request.subject_id,
      connectedAt: new Date(),
      isActive: true,
      lastInteraction: new Date(),
    });
  }

  await Promise.all([mentor.save(), student.save()]);

  const subject = await Subject.findById(request.subject_id);

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
