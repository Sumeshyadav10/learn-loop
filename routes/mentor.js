import express from "express";
import {
  registerMentor,
  getMentorProfile,
  updateMentorProfile,
  deleteMentorProfile,
  getAllMentors,
  getMentorById,
} from "../controllers/mentorController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Mentor registration and profile management
router.post("/register", registerMentor);
router.get("/profile", getMentorProfile);
router.put("/profile", updateMentorProfile);
router.delete("/profile", deleteMentorProfile);

// Public mentor routes (but still require auth for security)
router.get("/all", getAllMentors);
router.get("/:mentorId", getMentorById);

export default router;
