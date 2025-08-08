import express from "express";
import {
  registerStudent,
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  getAllStudents,
  getStudentById,
  getSubjectsByBranchSemester,
} from "../controllers/studentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Student registration and profile management
router.post("/register", registerStudent);
router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);
router.delete("/profile", deleteStudentProfile);

// Subject-related routes
router.get("/subjects/:branch/:semester", getSubjectsByBranchSemester);

// Public student routes (but still require auth for security)
router.get("/all", getAllStudents);
router.get("/:studentId", getStudentById);

export default router;
