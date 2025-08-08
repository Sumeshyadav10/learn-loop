import Student from "../models/student.js";
import Subject from "../models/subject.js";
import ApiError from "../utils/ApiError.js";

/**
 * Service class for handling mentoring-related operations
 */
class MentoringService {
  /**
   * Get students who can mentor a specific subject in a branch
   * @param {String} subjectId - Subject ObjectId
   * @param {String} branch - Student branch
   * @param {String} excludeUserId - User ID to exclude from results (optional)
   * @param {Object} filters - Additional filters (optional)
   * @returns {Array} Array of mentor students
   */
  static async findMentorsForSubject(
    subjectId,
    branch,
    excludeUserId = null,
    filters = {}
  ) {
    const query = {
      branch,
      "strongSubjects.subject_id": subjectId,
      "mentorPreferences.isAvailableForMentoring": true,
      isActive: true,
      profileCompleted: true,
      ...filters,
    };

    if (excludeUserId) {
      query.user_id = { $ne: excludeUserId };
    }

    return await Student.find(query)
      .populate("user_id", "email username")
      .populate(
        "strongSubjects.subject_id",
        "subject_name subject_code semester"
      )
      .sort({
        "academicInfo.cgpa": -1,
        "strongSubjects.confidenceLevel": -1,
        lastActiveAt: -1,
      })
      .lean();
  }

  /**
   * Get mentor statistics for a subject
   * @param {String} subjectId - Subject ObjectId
   * @param {String} branch - Student branch
   * @returns {Object} Mentor statistics
   */
  static async getMentorStats(subjectId, branch) {
    const totalMentors = await Student.countDocuments({
      branch,
      "strongSubjects.subject_id": subjectId,
      "mentorPreferences.isAvailableForMentoring": true,
      isActive: true,
      profileCompleted: true,
    });

    const availableMentors = await Student.countDocuments({
      branch,
      "strongSubjects.subject_id": subjectId,
      "mentorPreferences.isAvailableForMentoring": true,
      isActive: true,
      profileCompleted: true,
      lastActiveAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Active in last 7 days
    });

    const confidenceLevels = await Student.aggregate([
      {
        $match: {
          branch,
          "strongSubjects.subject_id": subjectId,
          "mentorPreferences.isAvailableForMentoring": true,
          isActive: true,
          profileCompleted: true,
        },
      },
      {
        $unwind: "$strongSubjects",
      },
      {
        $match: {
          "strongSubjects.subject_id": subjectId,
        },
      },
      {
        $group: {
          _id: "$strongSubjects.confidenceLevel",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return {
      totalMentors,
      availableMentors,
      confidenceLevels: confidenceLevels.reduce((acc, level) => {
        acc[level._id] = level.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Get subjects that need mentors (low mentor count)
   * @param {String} branch - Student branch
   * @param {Number} threshold - Minimum mentor count threshold (default: 3)
   * @returns {Array} Subjects needing mentors
   */
  static async getSubjectsNeedingMentors(branch, threshold = 3) {
    const subjects = await Subject.find({ branch, isActive: true });

    const subjectsNeedingMentors = [];

    for (const subject of subjects) {
      const mentorCount = await Student.countDocuments({
        branch,
        "strongSubjects.subject_id": subject._id,
        "mentorPreferences.isAvailableForMentoring": true,
        isActive: true,
        profileCompleted: true,
      });

      if (mentorCount < threshold) {
        subjectsNeedingMentors.push({
          ...subject.toObject(),
          mentorCount,
          mentorsNeeded: threshold - mentorCount,
        });
      }
    }

    return subjectsNeedingMentors.sort((a, b) => a.mentorCount - b.mentorCount);
  }

  /**
   * Get mentoring opportunities for a student (subjects they can help with)
   * @param {String} userId - Student user ID
   * @returns {Array} Available mentoring opportunities
   */
  static async getMentoringOpportunities(userId) {
    const student = await Student.findOne({ user_id: userId }).populate(
      "strongSubjects.subject_id"
    );

    if (!student || !student.strongSubjects.length) {
      return [];
    }

    const opportunities = [];

    for (const strongSubject of student.strongSubjects) {
      // Find juniors who might need help with this subject
      const juniorsNeedingHelp = await Student.countDocuments({
        branch: student.branch,
        currentSemester: { $gte: strongSubject.semester }, // Current or future semesters
        user_id: { $ne: userId },
        isActive: true,
      });

      // Get other mentors for this subject
      const otherMentorsCount = await Student.countDocuments({
        branch: student.branch,
        "strongSubjects.subject_id": strongSubject.subject_id._id,
        "mentorPreferences.isAvailableForMentoring": true,
        user_id: { $ne: userId },
        isActive: true,
        profileCompleted: true,
      });

      opportunities.push({
        subject: strongSubject.subject_id,
        potentialMentees: juniorsNeedingHelp,
        otherMentors: otherMentorsCount,
        yourConfidenceLevel: strongSubject.confidenceLevel,
        priority:
          juniorsNeedingHelp > otherMentorsCount
            ? "high"
            : juniorsNeedingHelp > otherMentorsCount / 2
            ? "medium"
            : "low",
      });
    }

    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get recommended mentors for a student based on their current subjects
   * @param {String} userId - Student user ID
   * @param {Number} limit - Maximum number of recommendations (default: 10)
   * @returns {Array} Recommended mentors
   */
  static async getRecommendedMentors(userId, limit = 10) {
    const student = await Student.findOne({ user_id: userId });

    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    // Get subjects for current semester and previous semesters that student might struggle with
    const relevantSemesters = [];
    for (let i = 1; i <= student.currentSemester; i++) {
      relevantSemesters.push(i);
    }

    const subjects = await Subject.find({
      branch: student.branch,
      semester: { $in: relevantSemesters },
      isActive: true,
    });

    const recommendations = [];

    for (const subject of subjects) {
      const mentors = await this.findMentorsForSubject(
        subject._id,
        student.branch,
        userId,
        {} // No additional filters
      );

      // Score mentors based on multiple factors
      const scoredMentors = mentors.map((mentor) => {
        const strongSubject = mentor.strongSubjects.find(
          (s) => s.subject_id._id.toString() === subject._id.toString()
        );

        let score = 0;

        // Confidence level score (1-5 scale)
        score += strongSubject.confidenceLevel * 2;

        // CGPA score (if available)
        if (mentor.academicInfo?.cgpa) {
          score += mentor.academicInfo.cgpa;
        }

        // Year difference bonus (seniors get preference)
        const yearDiff = mentor.year - student.year;
        if (yearDiff > 0) {
          score += yearDiff * 3;
        }

        // Recent activity bonus
        const daysSinceActive =
          (Date.now() - new Date(mentor.lastActiveAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceActive < 7) {
          score += 5;
        } else if (daysSinceActive < 30) {
          score += 2;
        }

        return {
          ...mentor,
          subject: subject,
          matchScore: score,
          strongSubjectInfo: strongSubject,
        };
      });

      recommendations.push(...scoredMentors);
    }

    // Sort by score and remove duplicates
    const uniqueMentors = recommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .filter(
        (mentor, index, self) =>
          index ===
          self.findIndex((m) => m._id.toString() === mentor._id.toString())
      )
      .slice(0, limit);

    return uniqueMentors;
  }

  /**
   * Validate strong subjects before adding to student profile
   * @param {Array} strongSubjects - Array of strong subjects
   * @param {Object} student - Student object
   * @returns {Object} Validation result
   */
  static async validateStrongSubjects(strongSubjects, student) {
    const errors = [];
    const validSubjects = [];

    const availableSemesters = [];
    for (let i = 1; i < student.currentSemester; i++) {
      availableSemesters.push(i);
    }

    if (availableSemesters.length === 0) {
      return {
        isValid: false,
        errors: ["No previous semesters available for mentoring"],
        validSubjects: [],
      };
    }

    for (const strongSubject of strongSubjects) {
      const subject = await Subject.findOne({
        _id: strongSubject.subject_id,
        branch: student.branch,
        semester: { $in: availableSemesters },
        isActive: true,
      });

      if (!subject) {
        errors.push(
          `Subject ${strongSubject.subject_id} is not valid or not from previous semesters`
        );
      } else {
        validSubjects.push({
          subject_id: strongSubject.subject_id,
          semester: subject.semester,
          confidenceLevel: strongSubject.confidenceLevel || 3,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validSubjects,
    };
  }

  /**
   * Get mentor dashboard statistics
   * @param {String} userId - Student user ID
   * @returns {Object} Dashboard statistics
   */
  static async getMentorDashboard(userId) {
    const student = await Student.findOne({ user_id: userId }).populate(
      "strongSubjects.subject_id"
    );

    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    const dashboard = {
      profileCompleteness: this.calculateProfileCompleteness(student),
      mentoringStats: {
        strongSubjectsCount: student.strongSubjects.length,
        isAvailableForMentoring:
          student.mentorPreferences.isAvailableForMentoring,
        maxMentees: student.mentorPreferences.maxMentees,
      },
      opportunities: await this.getMentoringOpportunities(userId),
      subjectsNeedingMentors: await this.getSubjectsNeedingMentors(
        student.branch
      ),
    };

    return dashboard;
  }

  /**
   * Calculate profile completeness percentage
   * @param {Object} student - Student object
   * @returns {Number} Completeness percentage
   */
  static calculateProfileCompleteness(student) {
    let score = 0;
    const maxScore = 10;

    // Basic info (3 points)
    if (student.name) score += 1;
    if (student.phone) score += 1;
    if (student.profileImage) score += 1;

    // Academic info (3 points)
    if (student.academicInfo?.cgpa) score += 1;
    if (student.academicInfo?.completedSemesters?.length > 0) score += 1;
    if (student.year && student.currentSemester) score += 1;

    // Mentoring setup (4 points)
    if (student.strongSubjects?.length > 0) score += 2;
    if (student.mentorPreferences?.preferredTeachingMode) score += 1;
    if (student.mentorPreferences?.availableTimeSlots?.length > 0) score += 1;

    return Math.round((score / maxScore) * 100);
  }
}

export default MentoringService;
