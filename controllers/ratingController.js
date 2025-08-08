import Student from "../models/student.js";
import Mentor from "../models/mentor.js";
import User from "../models/user.js";
import asyncHandler from "express-async-handler";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { notifyRatingReceived } from "../utils/notificationUtils.js";
import { sendRatingUpdate } from "../utils/socketConfig.js";

// Rate a student mentor (student-to-student mentorship)
export const rateStudentMentor = asyncHandler(async (req, res) => {
  const { mentorId, rating, feedback = "" } = req.body;
  const studentId = req.user._id;

  if (!mentorId || !rating) {
    throw new ApiError(400, "Mentor ID and rating are required");
  }

  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new ApiError(400, "Rating must be an integer between 1 and 5");
  }

  // Find the student who is giving the rating
  const student = await Student.findOne({ user_id: studentId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Find the mentor relationship
  const mentorRelationship = student.mentorshipConnections.mentors.find(
    (mentor) => mentor.mentor_id.toString() === mentorId && mentor.isActive
  );

  if (!mentorRelationship) {
    throw new ApiError(404, "Active mentorship relationship not found");
  }

  // Check if already rated
  if (mentorRelationship.rating.score) {
    throw new ApiError(400, "You have already rated this mentor");
  }

  // Update the rating
  mentorRelationship.rating = {
    score: rating,
    feedback: feedback.trim(),
    ratedAt: new Date(),
  };

  await student.save();

  // Get mentor details for notification
  const mentorStudent = await Student.findById(mentorId).populate(
    "user_id",
    "fullName"
  );
  const raterUser = await User.findById(studentId).select("fullName");

  // Send notification to the mentor
  if (mentorStudent && mentorStudent.user_id) {
    await notifyRatingReceived(
      mentorStudent.user_id._id,
      studentId,
      raterUser.fullName,
      { score: rating, feedback },
      mentorRelationship._id
    );

    // Send real-time update
    sendRatingUpdate(mentorStudent.user_id._id, {
      type: "rating_received",
      rating: { score: rating, feedback },
      raterName: raterUser.fullName,
      mentorshipType: "student",
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        rating: mentorRelationship.rating,
        mentorName: mentorStudent.name,
      },
      "Mentor rated successfully"
    )
  );
});

// Rate a student mentee (student-to-student mentorship)
export const rateStudentMentee = asyncHandler(async (req, res) => {
  const { menteeId, rating, feedback = "" } = req.body;
  const studentId = req.user._id;

  if (!menteeId || !rating) {
    throw new ApiError(400, "Mentee ID and rating are required");
  }

  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new ApiError(400, "Rating must be an integer between 1 and 5");
  }

  // Find the student who is giving the rating (mentor)
  const student = await Student.findOne({ user_id: studentId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Find the mentee relationship
  const menteeRelationship = student.mentorshipConnections.mentees.find(
    (mentee) => mentee.mentee_id.toString() === menteeId && mentee.isActive
  );

  if (!menteeRelationship) {
    throw new ApiError(404, "Active mentorship relationship not found");
  }

  // Check if already rated
  if (menteeRelationship.rating.score) {
    throw new ApiError(400, "You have already rated this mentee");
  }

  // Update the rating
  menteeRelationship.rating = {
    score: rating,
    feedback: feedback.trim(),
    ratedAt: new Date(),
  };

  await student.save();

  // Get mentee details for notification
  const menteeStudent = await Student.findById(menteeId).populate(
    "user_id",
    "fullName"
  );
  const raterUser = await User.findById(studentId).select("fullName");

  // Send notification to the mentee
  if (menteeStudent && menteeStudent.user_id) {
    await notifyRatingReceived(
      menteeStudent.user_id._id,
      studentId,
      raterUser.fullName,
      { score: rating, feedback },
      menteeRelationship._id
    );

    // Send real-time update
    sendRatingUpdate(menteeStudent.user_id._id, {
      type: "rating_received",
      rating: { score: rating, feedback },
      raterName: raterUser.fullName,
      mentorshipType: "student",
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        rating: menteeRelationship.rating,
        menteeName: menteeStudent.name,
      },
      "Mentee rated successfully"
    )
  );
});

// Rate an official mentor
export const rateOfficialMentor = asyncHandler(async (req, res) => {
  const { mentorId, rating, feedback = "" } = req.body;
  const studentId = req.user._id;

  if (!mentorId || !rating) {
    throw new ApiError(400, "Mentor ID and rating are required");
  }

  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new ApiError(400, "Rating must be an integer between 1 and 5");
  }

  // Find the student who is giving the rating
  const student = await Student.findOne({ user_id: studentId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Find the official mentor relationship
  const mentorRelationship = student.officialMentors.activeMentors.find(
    (mentor) => mentor.mentor_id.toString() === mentorId && mentor.isActive
  );

  if (!mentorRelationship) {
    throw new ApiError(
      404,
      "Active official mentorship relationship not found"
    );
  }

  // Check if already rated
  if (mentorRelationship.rating.score) {
    throw new ApiError(400, "You have already rated this mentor");
  }

  // Update the rating
  mentorRelationship.rating = {
    score: rating,
    feedback: feedback.trim(),
    ratedAt: new Date(),
  };

  await student.save();

  // Get mentor details for notification
  const mentor = await Mentor.findById(mentorId).populate(
    "user_id",
    "fullName"
  );
  const raterUser = await User.findById(studentId).select("fullName");

  // Send notification to the mentor
  if (mentor && mentor.user_id) {
    await notifyRatingReceived(
      mentor.user_id._id,
      studentId,
      raterUser.fullName,
      { score: rating, feedback },
      mentorRelationship._id
    );

    // Send real-time update
    sendRatingUpdate(mentor.user_id._id, {
      type: "rating_received",
      rating: { score: rating, feedback },
      raterName: raterUser.fullName,
      mentorshipType: "official",
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        rating: mentorRelationship.rating,
        mentorName: mentor.name,
      },
      "Official mentor rated successfully"
    )
  );
});

// Get ratings given by user
export const getGivenRatings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate("mentorshipConnections.mentors.mentor_id", "name profileImage")
    .populate("mentorshipConnections.mentees.mentee_id", "name profileImage")
    .populate(
      "officialMentors.activeMentors.mentor_id",
      "name profileImage designation"
    );

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const givenRatings = {
    studentMentors: [],
    studentMentees: [],
    officialMentors: [],
  };

  // Student mentors rated by this user
  student.mentorshipConnections.mentors.forEach((mentor) => {
    if (mentor.rating.score) {
      givenRatings.studentMentors.push({
        mentorId: mentor.mentor_id._id,
        mentorName: mentor.mentor_id.name,
        mentorProfileImage: mentor.mentor_id.profileImage,
        rating: mentor.rating,
        connectedAt: mentor.connectedAt,
      });
    }
  });

  // Student mentees rated by this user
  student.mentorshipConnections.mentees.forEach((mentee) => {
    if (mentee.rating.score) {
      givenRatings.studentMentees.push({
        menteeId: mentee.mentee_id._id,
        menteeName: mentee.mentee_id.name,
        menteeProfileImage: mentee.mentee_id.profileImage,
        rating: mentee.rating,
        connectedAt: mentee.connectedAt,
      });
    }
  });

  // Official mentors rated by this user
  student.officialMentors.activeMentors.forEach((mentor) => {
    if (mentor.rating.score) {
      givenRatings.officialMentors.push({
        mentorId: mentor.mentor_id._id,
        mentorName: mentor.mentor_id.name,
        mentorProfileImage: mentor.mentor_id.profileImage,
        mentorDesignation: mentor.mentor_id.designation,
        rating: mentor.rating,
        connectedAt: mentor.connectedAt,
      });
    }
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, givenRatings, "Given ratings retrieved successfully")
    );
});

// Get ratings received by user
export const getReceivedRatings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const receivedRatings = {
    asStudentMentor: [],
    asOfficialMentor: [],
    averageRatings: {
      studentMentor: 0,
      officialMentor: 0,
      overall: 0,
    },
    totalRatings: {
      studentMentor: 0,
      officialMentor: 0,
      overall: 0,
    },
  };

  // Check if user is a student (can receive ratings as student mentor)
  const student = await Student.findOne({ user_id: userId });
  if (student) {
    // Find all students who have this user as their mentor
    const mentees = await Student.find({
      "mentorshipConnections.mentors.mentor_id": student._id,
      "mentorshipConnections.mentors.rating.score": {
        $exists: true,
        $ne: null,
      },
    }).populate("user_id", "fullName");

    mentees.forEach((mentee) => {
      const mentorRelationship = mentee.mentorshipConnections.mentors.find(
        (mentor) =>
          mentor.mentor_id.toString() === student._id.toString() &&
          mentor.rating.score
      );

      if (mentorRelationship) {
        receivedRatings.asStudentMentor.push({
          menteeId: mentee._id,
          menteeName: mentee.name,
          menteeProfileImage: mentee.profileImage,
          rating: mentorRelationship.rating,
          connectedAt: mentorRelationship.connectedAt,
        });
      }
    });

    // Calculate average for student mentor ratings
    if (receivedRatings.asStudentMentor.length > 0) {
      const sum = receivedRatings.asStudentMentor.reduce(
        (acc, curr) => acc + curr.rating.score,
        0
      );
      receivedRatings.averageRatings.studentMentor =
        sum / receivedRatings.asStudentMentor.length;
      receivedRatings.totalRatings.studentMentor =
        receivedRatings.asStudentMentor.length;
    }
  }

  // Check if user is a mentor (can receive ratings as official mentor)
  const mentor = await Mentor.findOne({ user_id: userId });
  if (mentor) {
    // Find all students who have this user as their official mentor
    const mentees = await Student.find({
      "officialMentors.activeMentors.mentor_id": mentor._id,
      "officialMentors.activeMentors.rating.score": {
        $exists: true,
        $ne: null,
      },
    }).populate("user_id", "fullName");

    mentees.forEach((mentee) => {
      const mentorRelationship = mentee.officialMentors.activeMentors.find(
        (m) =>
          m.mentor_id.toString() === mentor._id.toString() && m.rating.score
      );

      if (mentorRelationship) {
        receivedRatings.asOfficialMentor.push({
          menteeId: mentee._id,
          menteeName: mentee.name,
          menteeProfileImage: mentee.profileImage,
          rating: mentorRelationship.rating,
          connectedAt: mentorRelationship.connectedAt,
        });
      }
    });

    // Calculate average for official mentor ratings
    if (receivedRatings.asOfficialMentor.length > 0) {
      const sum = receivedRatings.asOfficialMentor.reduce(
        (acc, curr) => acc + curr.rating.score,
        0
      );
      receivedRatings.averageRatings.officialMentor =
        sum / receivedRatings.asOfficialMentor.length;
      receivedRatings.totalRatings.officialMentor =
        receivedRatings.asOfficialMentor.length;
    }
  }

  // Calculate overall averages
  const totalRatingsCount =
    receivedRatings.totalRatings.studentMentor +
    receivedRatings.totalRatings.officialMentor;
  if (totalRatingsCount > 0) {
    const totalSum =
      receivedRatings.averageRatings.studentMentor *
        receivedRatings.totalRatings.studentMentor +
      receivedRatings.averageRatings.officialMentor *
        receivedRatings.totalRatings.officialMentor;
    receivedRatings.averageRatings.overall = totalSum / totalRatingsCount;
    receivedRatings.totalRatings.overall = totalRatingsCount;
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        receivedRatings,
        "Received ratings retrieved successfully"
      )
    );
});

// Get pending ratings (relationships that can be rated)
export const getPendingRatings = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const student = await Student.findOne({ user_id: userId })
    .populate("mentorshipConnections.mentors.mentor_id", "name profileImage")
    .populate("mentorshipConnections.mentees.mentee_id", "name profileImage")
    .populate(
      "officialMentors.activeMentors.mentor_id",
      "name profileImage designation"
    );

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  const pendingRatings = {
    studentMentors: [],
    studentMentees: [],
    officialMentors: [],
  };

  // Student mentors that can be rated
  student.mentorshipConnections.mentors.forEach((mentor) => {
    if (mentor.isActive && !mentor.rating.score) {
      // Only show mentors connected for at least 7 days
      const daysSinceConnection =
        (Date.now() - mentor.connectedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceConnection >= 7) {
        pendingRatings.studentMentors.push({
          mentorId: mentor.mentor_id._id,
          mentorName: mentor.mentor_id.name,
          mentorProfileImage: mentor.mentor_id.profileImage,
          connectedAt: mentor.connectedAt,
          daysSinceConnection: Math.floor(daysSinceConnection),
        });
      }
    }
  });

  // Student mentees that can be rated
  student.mentorshipConnections.mentees.forEach((mentee) => {
    if (mentee.isActive && !mentee.rating.score) {
      // Only show mentees connected for at least 7 days
      const daysSinceConnection =
        (Date.now() - mentee.connectedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceConnection >= 7) {
        pendingRatings.studentMentees.push({
          menteeId: mentee.mentee_id._id,
          menteeName: mentee.mentee_id.name,
          menteeProfileImage: mentee.mentee_id.profileImage,
          connectedAt: mentee.connectedAt,
          daysSinceConnection: Math.floor(daysSinceConnection),
        });
      }
    }
  });

  // Official mentors that can be rated
  student.officialMentors.activeMentors.forEach((mentor) => {
    if (mentor.isActive && !mentor.rating.score) {
      // Only show mentors connected for at least 7 days
      const daysSinceConnection =
        (Date.now() - mentor.connectedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceConnection >= 7) {
        pendingRatings.officialMentors.push({
          mentorId: mentor.mentor_id._id,
          mentorName: mentor.mentor_id.name,
          mentorProfileImage: mentor.mentor_id.profileImage,
          mentorDesignation: mentor.mentor_id.designation,
          connectedAt: mentor.connectedAt,
          daysSinceConnection: Math.floor(daysSinceConnection),
        });
      }
    }
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        pendingRatings,
        "Pending ratings retrieved successfully"
      )
    );
});

export default {
  rateStudentMentor,
  rateStudentMentee,
  rateOfficialMentor,
  getGivenRatings,
  getReceivedRatings,
  getPendingRatings,
};
