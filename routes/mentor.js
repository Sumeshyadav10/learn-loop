import express from "express";
import multer from "multer";
import {
  registerMentor,
  getMentorProfile,
  updateMentorProfile,
  updateMentorProfileImage,
  deleteMentorProfile,
  getAllMentors,
  getMentorById,
  getIncomingMentorshipRequests,
  respondToMentorshipRequest,
  getCurrentMentees,
  getMentorDashboard,
  endMentorshipRelationship,
} from "../controllers/mentorController.js";
import { protect } from "../middlewares/authMiddleware.js";

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

// Mentor registration and profile management
router.post("/register", registerMentor);
router.get("/profile", getMentorProfile);
router.put("/profile", updateMentorProfile);
router.delete("/profile", deleteMentorProfile);

// Profile image management
router.post(
  "/profile/image",
  upload.single("profileImage"),
  updateMentorProfileImage
);

// ============= MENTORSHIP MANAGEMENT ROUTES =============

// Get incoming mentorship requests
router.get("/requests/incoming", getIncomingMentorshipRequests);

// Respond to mentorship request
router.put("/requests/respond", respondToMentorshipRequest);

// Get current mentees
router.get("/mentees", getCurrentMentees);

// Get mentor dashboard
router.get("/dashboard", getMentorDashboard);

// End mentorship relationship
router.put("/relationship/end", endMentorshipRelationship);

// Public mentor routes (but still require auth for security)
router.get("/all", getAllMentors);
router.get("/:mentorId", getMentorById);

export default router;
