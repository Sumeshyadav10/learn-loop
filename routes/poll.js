import express from "express";
import {
  createPoll,
  getActivePolls,
  getPollById,
  voteInPoll,
  getPollResults,
  endPoll,
  getAllPolls,
  addMentorCandidate,
  createWeeklyPolls,
} from "../controllers/pollController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All poll routes require authentication
router.use(protect);

// Student routes
router.get("/active", getActivePolls); // Get active polls for current student
router.get("/:pollId", getPollById); // Get specific poll details
router.post("/:pollId/vote", voteInPoll); // Vote in a poll
router.get("/:pollId/results", getPollResults); // Get poll results

// Admin/System routes (you may want to add admin middleware later)
router.post("/create", createPoll); // Create new poll
router.get("/all", getAllPolls); // Get all polls (admin view)
router.post("/:pollId/end", endPoll); // End a poll
router.post("/:pollId/add-candidate", addMentorCandidate); // Add mentor candidate
router.post("/create-weekly", createWeeklyPolls); // Create weekly polls (system)

export default router;
