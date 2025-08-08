import express from "express";
import {
  rateStudentMentor,
  rateStudentMentee,
  rateOfficialMentor,
  getGivenRatings,
  getReceivedRatings,
  getPendingRatings,
} from "../controllers/ratingController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All rating routes require authentication
router.use(protect);

// Rate mentors and mentees
router.post("/student-mentor", rateStudentMentor);
router.post("/student-mentee", rateStudentMentee);
router.post("/official-mentor", rateOfficialMentor);

// Get ratings
router.get("/given", getGivenRatings);
router.get("/received", getReceivedRatings);
router.get("/pending", getPendingRatings);

export default router;
