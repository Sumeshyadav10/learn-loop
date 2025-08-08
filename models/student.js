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
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    currentSemester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    profileImage: {
      type: String,
      default: null,
    },
    // Strong subjects from previous semesters that student can teach
    strongSubjects: [
      {
        subject_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        semester: {
          type: Number,
          required: true,
          min: 1,
          max: 8,
        },
        confidenceLevel: {
          type: Number,
          enum: [1, 2, 3, 4, 5], // 1-5 scale for teaching confidence
          default: 3,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Academic performance metrics
    academicInfo: {
      cgpa: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
      },
      completedSemesters: [
        {
          semester: {
            type: Number,
            required: true,
          },
          gpa: {
            type: Number,
            min: 0,
            max: 10,
          },
          completedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    // Mentoring preferences
    mentorPreferences: {
      isAvailableForMentoring: {
        type: Boolean,
        default: true,
      },
      maxMentees: {
        type: Number,
        default: 5,
        min: 1,
        max: 20,
      },
      preferredTeachingMode: {
        type: String,
        enum: ["online", "offline", "both"],
        default: "both",
      },
      availableTimeSlots: [
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
          },
          startTime: String,
          endTime: String,
        },
      ],
    },
    // Profile completion status
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    // Mentor-Mentee Relationships
    mentorshipConnections: {
      // Students who have requested this student as mentor
      incomingRequests: [
        {
          student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
          },
          subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
          },
          message: {
            type: String,
            maxlength: 500,
            default: "",
          },
          status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
          },
          requestedAt: {
            type: Date,
            default: Date.now,
          },
          respondedAt: {
            type: Date,
            default: null,
          },
        },
      ],
      // Students whom this student has requested as mentors
      outgoingRequests: [
        {
          mentor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
          },
          subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
          },
          message: {
            type: String,
            maxlength: 500,
            default: "",
          },
          status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
          },
          requestedAt: {
            type: Date,
            default: Date.now,
          },
          respondedAt: {
            type: Date,
            default: null,
          },
        },
      ],
      // Active mentor relationships (this student is the mentee)
      mentors: [
        {
          mentor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
          },
          subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
          },
          connectedAt: {
            type: Date,
            default: Date.now,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
          lastInteraction: {
            type: Date,
            default: Date.now,
          },
          // Rating system for mentor (given by mentee)
          rating: {
            score: {
              type: Number,
              min: 1,
              max: 5,
              default: null,
            },
            feedback: {
              type: String,
              maxlength: 500,
              default: "",
            },
            ratedAt: {
              type: Date,
              default: null,
            },
          },
        },
      ],
      // Active mentee relationships (this student is the mentor)
      mentees: [
        {
          mentee_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
          },
          subject_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
          },
          connectedAt: {
            type: Date,
            default: Date.now,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
          lastInteraction: {
            type: Date,
            default: Date.now,
          },
          // Rating system for mentee (given by mentor)
          rating: {
            score: {
              type: Number,
              min: 1,
              max: 5,
              default: null,
            },
            feedback: {
              type: String,
              maxlength: 500,
              default: "",
            },
            ratedAt: {
              type: Date,
              default: null,
            },
          },
        },
      ],
    },
    // Official Professional Mentors (separate from student mentors)
    officialMentors: {
      // Requests sent to official mentors
      outgoingRequests: [
        {
          mentor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mentor",
            required: true,
          },
          message: {
            type: String,
            trim: true,
            maxlength: 500,
          },
          status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
          },
          requestedAt: {
            type: Date,
            default: Date.now,
          },
          respondedAt: {
            type: Date,
          },
        },
      ],
      // Active official mentor relationships
      activeMentors: [
        {
          mentor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mentor",
            required: true,
          },
          connectedAt: {
            type: Date,
            default: Date.now,
          },
          isActive: {
            type: Boolean,
            default: true,
          },
          lastInteraction: {
            type: Date,
            default: Date.now,
          },
          mentorshipGoals: [
            {
              type: String,
              trim: true,
            },
          ],
          // Rating system for official mentor (given by student)
          rating: {
            score: {
              type: Number,
              min: 1,
              max: 5,
              default: null,
            },
            feedback: {
              type: String,
              maxlength: 500,
              default: "",
            },
            ratedAt: {
              type: Date,
              default: null,
            },
          },
        },
      ],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
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

// Indexes for performance optimization
studentSchema.index({ user_id: 1 });
studentSchema.index({ branch: 1, currentSemester: 1 });
studentSchema.index({ branch: 1, year: 1 });
studentSchema.index({ "strongSubjects.subject_id": 1 });
studentSchema.index({ "mentorPreferences.isAvailableForMentoring": 1 });
studentSchema.index({ lastActiveAt: -1 });

// Mentorship-specific indexes
studentSchema.index({ "mentorshipConnections.incomingRequests.student_id": 1 });
studentSchema.index({ "mentorshipConnections.outgoingRequests.mentor_id": 1 });
studentSchema.index({ "mentorshipConnections.mentors.mentor_id": 1 });
studentSchema.index({ "mentorshipConnections.mentees.mentee_id": 1 });
studentSchema.index({ "officialMentors.outgoingRequests.mentor_id": 1 });
studentSchema.index({ "officialMentors.activeMentors.mentor_id": 1 });

// Compound index for efficient mentor discovery
studentSchema.index({
  branch: 1,
  "strongSubjects.subject_id": 1,
  "mentorPreferences.isAvailableForMentoring": 1,
  isActive: 1,
});

// Pre-save middleware to update profile completion status
studentSchema.pre("save", function (next) {
  // Check if profile is completed
  const hasBasicInfo =
    this.name && this.phone && this.branch && this.year && this.currentSemester;
  const hasStrongSubjects =
    this.strongSubjects && this.strongSubjects.length > 0;

  this.profileCompleted = hasBasicInfo && hasStrongSubjects;
  this.lastActiveAt = new Date();

  next();
});

// Instance method to get available previous semesters for strong subject selection
studentSchema.methods.getAvailablePreviousSemesters = function () {
  const availableSemesters = [];
  const maxSemester = this.currentSemester - 1;

  for (let i = 1; i <= maxSemester; i++) {
    availableSemesters.push(i);
  }

  return availableSemesters;
};

// Instance method to check if student can mentor a specific subject
studentSchema.methods.canMentorSubject = function (subjectId) {
  return this.strongSubjects.some(
    (subject) => subject.subject_id.toString() === subjectId.toString()
  );
};

// Instance method to check if student has already requested a mentor for a subject
studentSchema.methods.hasRequestedMentor = function (mentorId, subjectId) {
  return this.mentorshipConnections.outgoingRequests.some(
    (request) =>
      request.mentor_id.toString() === mentorId.toString() &&
      request.subject_id.toString() === subjectId.toString() &&
      request.status === "pending"
  );
};

// Instance method to check if student has a mentor for a subject
studentSchema.methods.hasMentorForSubject = function (subjectId) {
  return this.mentorshipConnections.mentors.some(
    (mentor) =>
      mentor.subject_id.toString() === subjectId.toString() && mentor.isActive
  );
};

// Instance method to get current mentee count
studentSchema.methods.getCurrentMenteeCount = function () {
  return this.mentorshipConnections.mentees.filter((mentee) => mentee.isActive)
    .length;
};

// Instance method to check if can accept more mentees
studentSchema.methods.canAcceptMoreMentees = function () {
  const currentCount = this.getCurrentMenteeCount();
  return (
    currentCount < this.mentorPreferences.maxMentees &&
    this.mentorPreferences.isAvailableForMentoring
  );
};

// Instance method to check if student has already requested an official mentor
studentSchema.methods.hasRequestedOfficialMentor = function (mentorId) {
  return this.officialMentors.outgoingRequests.some(
    (request) =>
      request.mentor_id.toString() === mentorId.toString() &&
      request.status === "pending"
  );
};

// Instance method to check if student has an active official mentor
studentSchema.methods.hasActiveOfficialMentor = function (mentorId) {
  return this.officialMentors.activeMentors.some(
    (mentor) =>
      mentor.mentor_id.toString() === mentorId.toString() && mentor.isActive
  );
};

// Instance method to check if 4th year student (can only get official mentors, no student mentors)
studentSchema.methods.isFourthYear = function () {
  return this.year === 4;
};

// Instance method to get eligible mentor types based on year
studentSchema.methods.getEligibleMentorTypes = function () {
  if (this.year === 4) {
    return ["official"]; // 4th year can only get official mentors
  }
  return ["student", "official"]; // Others can get both student and official mentors
};

// Static method to find mentors for a specific subject
studentSchema.statics.findMentorsForSubject = function (
  subjectId,
  branch,
  excludeUserId = null
) {
  const query = {
    branch,
    "strongSubjects.subject_id": subjectId,
    "mentorPreferences.isAvailableForMentoring": true,
    isActive: true,
    profileCompleted: true,
  };

  if (excludeUserId) {
    query.user_id = { $ne: excludeUserId };
  }

  return this.find(query)
    .populate("user_id", "email username")
    .populate("strongSubjects.subject_id", "subject_name subject_code semester")
    .sort({ "academicInfo.cgpa": -1, lastActiveAt: -1 });
};

const Student = mongoose.model("Student", studentSchema);
export default Student;
