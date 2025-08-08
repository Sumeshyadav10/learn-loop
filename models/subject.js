import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      required: true,
      enum: ["Computer", "IT", "AIML", "ECS"],
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    subject_name: {
      type: String,
      required: true,
      trim: true,
    },
    subject_code: {
      type: String,
      trim: true,
    },
    credits: {
      type: Number,
      default: 3,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique subjects per branch and semester
subjectSchema.index(
  { branch: 1, semester: 1, subject_name: 1 },
  { unique: true }
);

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;
