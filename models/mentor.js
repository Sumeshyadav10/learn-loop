import mongoose from "mongoose";

const mentorSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: false, // Made optional for step-by-step profile creation
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      required: false, // Made optional for step-by-step profile creation
      trim: true,
      default: "",
    },
    profileImage: {
      type: String,
      default: null,
    },
    designation: {
      type: String,
      required: false, // Made optional for step-by-step profile creation
      trim: true,
      default: "",
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    experience_years: {
      type: Number,
      required: false, // Made optional for step-by-step profile creation
      min: 0,
      default: 0,
    },
    bio: {
      type: String,
      required: false, // Made optional for step-by-step profile creation
      trim: true,
      maxlength: 500,
      default: "",
    },
    available_time_slots: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          required: false, // Made optional for flexibility
        },
        start_time: {
          type: String,
          required: false, // Made optional for flexibility
        },
        end_time: {
          type: String,
          required: false, // Made optional for flexibility
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
mentorSchema.index({ user_id: 1 });
mentorSchema.index({ skills: 1 });

const Mentor = mongoose.model("Mentor", mentorSchema);
export default Mentor;
