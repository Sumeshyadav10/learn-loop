import express from "express";
import {
  getAllSubjects,
  getSubjectsByBranchSemester,
  createSubject,
  updateSubject,
  deleteSubject,
  getBranches,
  getSemestersByBranch,
} from "../controllers/subjectController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Public subject routes
router.get("/", getAllSubjects);
router.get("/branches", getBranches);
router.get("/branches/:branch/semesters", getSemestersByBranch);
router.get("/:branch/:semester", getSubjectsByBranchSemester);

// Admin routes for subject management
router.post("/", createSubject);
router.put("/:subjectId", updateSubject);
router.delete("/:subjectId", deleteSubject);

export default router;
