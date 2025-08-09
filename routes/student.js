import express from "express";
import multer from "multer";
import {
  registerStudent,
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  getAllStudents,
  getStudentById,
  getSubjectsBySemester,
  getAvailableSubjectsForMentoring,
  addStrongSubjects,
  updateProfileImage,
  findMentorsForSubject,
  getSubjectsWithMentorCount,
  updateMentorPreferences,
  updateAcademicInfo,
  sendMentorshipRequest,
  respondToMentorshipRequest,
  getIncomingMentorshipRequests,
  getOutgoingMentorshipRequests,
  getCurrentMentors,
  getCurrentMentees,
  endMentorshipRelationship,
  getMentorshipDashboard,
  sendOfficialMentorRequest,
  getOfficialMentorRequests,
  getCurrentOfficialMentors,
  getAvailableOfficialMentors,
  endOfficialMentorshipRelationship,
  findMentorsForSubjectEnhanced,
} from "../controllers/studentController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  requireCompleteProfile,
  validateStrongSubjects,
  validateMentorPreferences,
  validateAcademicInfo,
  validateSubjectId,
  validateBranch,
  validateSemester,
  validatePagination,
  canAccessMentoring,
  validateProfileImage,
} from "../middlewares/mentoringMiddleware.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Protected routes (require authentication)
router.use(protect);

// Student registration and profile management
router.post("/register", upload.single("profileImage"), registerStudent);
router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);
router.delete("/profile", deleteStudentProfile);

// Profile image management
router.post(
  "/profile/image",
  upload.single("profileImage"),
  validateProfileImage,
  updateProfileImage
);

// Strong subjects and mentoring features (require complete profile and semester > 1)
router.get(
  "/mentoring/available-subjects",
  requireCompleteProfile,
  canAccessMentoring,
  getAvailableSubjectsForMentoring
);

router.post(
  "/mentoring/strong-subjects",
  requireCompleteProfile,
  canAccessMentoring,
  validateStrongSubjects,
  addStrongSubjects
);

router.put(
  "/mentoring/preferences",
  requireCompleteProfile,
  validateMentorPreferences,
  updateMentorPreferences
);

// Academic information
router.put(
  "/academic-info",
  requireCompleteProfile,
  validateAcademicInfo,
  updateAcademicInfo
);

// Subject and mentor discovery
router.get(
  "/subjects/with-mentors",
  requireCompleteProfile,
  getSubjectsWithMentorCount
);

router.get(
  "/mentors/subject/:subjectId",
  requireCompleteProfile,
  validateSubjectId,
  findMentorsForSubject
);

// ============= MENTORSHIP CONNECTION ROUTES =============

// Send mentorship request
router.post(
  "/mentoring/request",
  requireCompleteProfile,
  canAccessMentoring,
  sendMentorshipRequest
);

// Respond to mentorship request (accept/reject)
router.put(
  "/mentoring/request/respond",
  requireCompleteProfile,
  respondToMentorshipRequest
);

// Get incoming mentorship requests (for mentors)
router.get(
  "/mentoring/requests/incoming",
  requireCompleteProfile,
  getIncomingMentorshipRequests
);

// Get outgoing mentorship requests (for students)
router.get(
  "/mentoring/requests/outgoing",
  requireCompleteProfile,
  getOutgoingMentorshipRequests
);

// Get current mentors (for students)
router.get("/mentoring/mentors", requireCompleteProfile, getCurrentMentors);

// Get current mentees (for mentors)
router.get("/mentoring/mentees", requireCompleteProfile, getCurrentMentees);

// End mentorship relationship
router.put(
  "/mentoring/relationship/end",
  requireCompleteProfile,
  endMentorshipRelationship
);

// Get mentorship dashboard
router.get(
  "/mentoring/dashboard",
  requireCompleteProfile,
  getMentorshipDashboard
);

// ============= OFFICIAL MENTOR ROUTES =============

// Get available official mentors
router.get(
  "/official-mentors/available",
  requireCompleteProfile,
  getAvailableOfficialMentors
);

// Send request to official mentor
router.post(
  "/official-mentors/request",
  requireCompleteProfile,
  sendOfficialMentorRequest
);

// Get official mentor requests
router.get(
  "/official-mentors/requests",
  requireCompleteProfile,
  getOfficialMentorRequests
);

// Get current official mentors
router.get(
  "/official-mentors/current",
  requireCompleteProfile,
  getCurrentOfficialMentors
);

// End official mentorship relationship
router.put(
  "/official-mentors/relationship/end",
  requireCompleteProfile,
  endOfficialMentorshipRelationship
);

// Enhanced mentor discovery (handles 4th year students)
router.get(
  "/mentors/subject/:subjectId/enhanced",
  requireCompleteProfile,
  validateSubjectId,
  findMentorsForSubjectEnhanced
);

// Subject-related routes
router.get("/subjects/:semester", validateSemester, getSubjectsBySemester);

// Public student routes (but still require auth for security)
router.get("/all", validatePagination, getAllStudents);
router.get("/:studentId", getStudentById);

export default router;
