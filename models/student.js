import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
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
    subjects: [
      {
        subject_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
        },
        subject_name: {
          type: String,
          trim: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
studentSchema.index({ user_id: 1 });
studentSchema.index({ branch: 1, semester: 1 });

const Student = mongoose.model("Student", studentSchema);
export default Student;
