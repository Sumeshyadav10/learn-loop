import Poll from "../models/poll.js";
import Student from "../models/student.js";
import Subject from "../models/subject.js";
import User from "../models/user.js";
import Mentor from "../models/mentor.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { notifySystemAnnouncement } from "../utils/notificationUtils.js";
import { sendToRole, broadcastToAll } from "../utils/socketConfig.js";

// Create a new poll (Admin/System function)
export const createPoll = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    targetCriteria,
    subjectId,
    pollType = "mentor_session",
    mentorCandidates = [],
    endDate,
    settings = {},
  } = req.body;
  const createdBy = req.user._id;

  if (!title || !targetCriteria || !subjectId || !endDate) {
    throw new ApiError(
      400,
      "Title, target criteria, subject, and end date are required"
    );
  }

  // Validate subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  // Calculate eligible student count
  const eligibleStudents = await Student.countDocuments({
    branch: targetCriteria.branch,
    year: targetCriteria.year,
    isActive: true,
  });

  const poll = new Poll({
    title,
    description,
    targetCriteria,
    subject: subjectId,
    pollType,
    mentorCandidates,
    endDate: new Date(endDate),
    eligibleStudentCount: eligibleStudents,
    createdBy,
    settings: {
      allowMultipleVotes: false,
      showRealTimeResults: true,
      requireComment: false,
      notifyWhenEnded: true,
      ...settings,
    },
    status: "active",
  });

  await poll.save();

  // Populate poll data
  const populatedPoll = await Poll.findById(poll._id)
    .populate("subject", "name code description")
    .populate("createdBy", "fullName email")
    .populate("mentorCandidates.mentor_id", "name profileImage")
    .populate(
      "mentorCandidates.official_mentor_id",
      "name profileImage designation"
    );

  // Get eligible students for notifications
  const students = await Student.find({
    branch: targetCriteria.branch,
    year: targetCriteria.year,
    isActive: true,
  }).populate("user_id", "_id");

  const studentUserIds = students.map((student) => student.user_id._id);

  // Send notifications to eligible students
  if (studentUserIds.length > 0) {
    await notifySystemAnnouncement(
      studentUserIds,
      `New poll created: ${title}. Vote for your preferred mentor for ${subject.name} session!`,
      "medium"
    );
  }

  res
    .status(201)
    .json(new ApiResponse(201, populatedPoll, "Poll created successfully"));
});

// Get active polls for current student
export const getActivePolls = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get student profile
  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Get active polls for this student's branch and year
  const polls = await Poll.find({
    "targetCriteria.branch": student.branch,
    "targetCriteria.year": student.year,
    status: "active",
    startDate: { $lte: new Date() },
    endDate: { $gt: new Date() },
  })
    .populate("subject", "name code description")
    .populate("mentorCandidates.mentor_id", "name profileImage")
    .populate(
      "mentorCandidates.official_mentor_id",
      "name profileImage designation"
    )
    .sort({ createdAt: -1 });

  // Check voting status for each poll
  const pollsWithVotingStatus = await Promise.all(
    polls.map(async (poll) => {
      const hasVoted = poll.mentorCandidates.some((candidate) =>
        candidate.voters.some(
          (voter) => voter.student_id.toString() === student._id.toString()
        )
      );

      return {
        ...poll.toObject(),
        hasVoted,
        timeRemaining: poll.timeRemaining,
        isActive: poll.isActive,
      };
    })
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        pollsWithVotingStatus,
        "Active polls retrieved successfully"
      )
    );
});

// Get poll details by ID
export const getPollById = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user._id;

  const poll = await Poll.findById(pollId)
    .populate("subject", "name code description")
    .populate("createdBy", "fullName email")
    .populate("mentorCandidates.mentor_id", "name profileImage")
    .populate(
      "mentorCandidates.official_mentor_id",
      "name profileImage designation"
    );

  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  // Get student profile to check voting eligibility
  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Check if student is eligible for this poll
  const isEligible =
    poll.targetCriteria.branch === student.branch &&
    poll.targetCriteria.year === student.year;

  if (!isEligible) {
    throw new ApiError(403, "You are not eligible to view this poll");
  }

  // Check if student has voted
  const hasVoted = poll.mentorCandidates.some((candidate) =>
    candidate.voters.some(
      (voter) => voter.student_id.toString() === student._id.toString()
    )
  );

  const pollData = {
    ...poll.toObject(),
    hasVoted,
    timeRemaining: poll.timeRemaining,
    isActive: poll.isActive,
    isEligible,
  };

  res
    .status(200)
    .json(
      new ApiResponse(200, pollData, "Poll details retrieved successfully")
    );
});

// Vote in a poll
export const voteInPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { candidateIndex } = req.body;
  const userId = req.user._id;

  if (candidateIndex === undefined || candidateIndex < 0) {
    throw new ApiError(400, "Valid candidate index is required");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  // Check if poll is active
  if (!poll.isActive) {
    throw new ApiError(400, "Poll is not active");
  }

  // Get student profile
  const student = await Student.findOne({ user_id: userId });
  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Check if student is eligible
  const isEligible =
    poll.targetCriteria.branch === student.branch &&
    poll.targetCriteria.year === student.year;

  if (!isEligible) {
    throw new ApiError(403, "You are not eligible to vote in this poll");
  }

  // Check if candidate index is valid
  if (candidateIndex >= poll.mentorCandidates.length) {
    throw new ApiError(400, "Invalid candidate index");
  }

  try {
    // Add vote
    await poll.addVote(student._id, candidateIndex);

    // Get updated poll data
    const updatedPoll = await Poll.findById(pollId)
      .populate("subject", "name code description")
      .populate("mentorCandidates.mentor_id", "name profileImage")
      .populate(
        "mentorCandidates.official_mentor_id",
        "name profileImage designation"
      );

    // Send real-time update to other eligible students
    const eligibleStudents = await Student.find({
      branch: poll.targetCriteria.branch,
      year: poll.targetCriteria.year,
      isActive: true,
    }).populate("user_id", "_id");

    const eligibleUserIds = eligibleStudents.map((s) =>
      s.user_id._id.toString()
    );

    // Broadcast poll update
    broadcastToAll("poll_update", {
      pollId: poll._id,
      totalVotes: updatedPoll.totalVotes,
      participationRate: updatedPoll.participationRate,
      candidateVotes: updatedPoll.mentorCandidates.map((c) => ({
        candidateIndex: updatedPoll.mentorCandidates.indexOf(c),
        votesReceived: c.votesReceived,
      })),
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          poll: updatedPoll,
          votedFor: {
            candidateIndex,
            candidate: updatedPoll.mentorCandidates[candidateIndex],
          },
        },
        "Vote cast successfully"
      )
    );
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

// Get poll results
export const getPollResults = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  const poll = await Poll.findById(pollId)
    .populate("subject", "name code description")
    .populate("mentorCandidates.mentor_id", "name profileImage")
    .populate(
      "mentorCandidates.official_mentor_id",
      "name profileImage designation"
    )
    .populate("winner.mentor_id", "name profileImage");

  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  // Sort candidates by votes
  const sortedCandidates = [...poll.mentorCandidates].sort(
    (a, b) => b.votesReceived - a.votesReceived
  );

  const results = {
    poll: {
      _id: poll._id,
      title: poll.title,
      description: poll.description,
      subject: poll.subject,
      status: poll.status,
      totalVotes: poll.totalVotes,
      eligibleStudentCount: poll.eligibleStudentCount,
      participationRate: poll.participationRate,
      startDate: poll.startDate,
      endDate: poll.endDate,
    },
    candidates: sortedCandidates.map((candidate, index) => ({
      rank: index + 1,
      ...candidate.toObject(),
      votePercentage:
        poll.totalVotes > 0
          ? Math.round((candidate.votesReceived / poll.totalVotes) * 100)
          : 0,
    })),
    winner: poll.winner,
    isEnded: poll.status === "ended",
  };

  res
    .status(200)
    .json(new ApiResponse(200, results, "Poll results retrieved successfully"));
});

// End a poll (Admin function)
export const endPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (poll.status !== "active") {
    throw new ApiError(400, "Poll is not active");
  }

  // End the poll and determine winner
  await poll.endPoll();

  // Get updated poll with winner information
  const updatedPoll = await Poll.findById(pollId)
    .populate("subject", "name code description")
    .populate("mentorCandidates.mentor_id", "name profileImage")
    .populate(
      "mentorCandidates.official_mentor_id",
      "name profileImage designation"
    )
    .populate("winner.mentor_id", "name profileImage");

  // Notify all participants about poll end
  if (poll.settings.notifyWhenEnded) {
    const eligibleStudents = await Student.find({
      branch: poll.targetCriteria.branch,
      year: poll.targetCriteria.year,
      isActive: true,
    }).populate("user_id", "_id");

    const studentUserIds = eligibleStudents.map((s) => s.user_id._id);

    if (studentUserIds.length > 0) {
      const winnerName = poll.winner
        ? poll.winner.mentorType === "student"
          ? updatedPoll.mentorCandidates.find(
              (c) =>
                c.mentor_id?._id?.toString() ===
                poll.winner.mentor_id.toString()
            )?.mentor_id?.name
          : updatedPoll.mentorCandidates.find(
              (c) =>
                c.official_mentor_id?._id?.toString() ===
                poll.winner.mentor_id.toString()
            )?.official_mentor_id?.name
        : "No winner";

      await notifySystemAnnouncement(
        studentUserIds,
        `Poll "${poll.title}" has ended. Winner: ${
          winnerName || "No winner determined"
        }`,
        "medium"
      );
    }
  }

  // Broadcast poll end update
  broadcastToAll("poll_ended", {
    pollId: poll._id,
    winner: poll.winner,
    results: updatedPoll,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedPoll, "Poll ended successfully"));
});

// Get all polls (Admin function)
export const getAllPolls = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, branch, year } = req.query;

  const query = {};
  if (status) query.status = status;
  if (branch) query["targetCriteria.branch"] = branch;
  if (year) query["targetCriteria.year"] = parseInt(year);

  const polls = await Poll.find(query)
    .populate("subject", "name code description")
    .populate("createdBy", "fullName email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const totalPolls = await Poll.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        polls,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPolls / limit),
          totalPolls,
          hasNextPage: page * limit < totalPolls,
          hasPreviousPage: page > 1,
        },
      },
      "Polls retrieved successfully"
    )
  );
});

// Add mentor candidate to existing poll
export const addMentorCandidate = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const {
    mentorId,
    mentorType,
    sessionTitle,
    sessionDescription,
    proposedDateTime,
  } = req.body;

  if (!mentorId || !mentorType || !sessionTitle) {
    throw new ApiError(
      400,
      "Mentor ID, mentor type, and session title are required"
    );
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (poll.status !== "active") {
    throw new ApiError(400, "Cannot add candidates to inactive poll");
  }

  // Verify mentor exists
  if (mentorType === "student") {
    const student = await Student.findById(mentorId);
    if (!student) {
      throw new ApiError(404, "Student mentor not found");
    }
  } else if (mentorType === "official") {
    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
      throw new ApiError(404, "Official mentor not found");
    }
  }

  // Check if mentor is already a candidate
  const existingCandidate = poll.mentorCandidates.find((candidate) => {
    if (mentorType === "student") {
      return candidate.mentor_id?.toString() === mentorId;
    } else {
      return candidate.official_mentor_id?.toString() === mentorId;
    }
  });

  if (existingCandidate) {
    throw new ApiError(400, "Mentor is already a candidate in this poll");
  }

  // Add new candidate
  const newCandidate = {
    mentorType,
    sessionTitle,
    sessionDescription,
    proposedDateTime: proposedDateTime ? new Date(proposedDateTime) : undefined,
    votesReceived: 0,
    voters: [],
  };

  if (mentorType === "student") {
    newCandidate.mentor_id = mentorId;
  } else {
    newCandidate.official_mentor_id = mentorId;
  }

  poll.mentorCandidates.push(newCandidate);
  await poll.save();

  // Get updated poll
  const updatedPoll = await Poll.findById(pollId)
    .populate("subject", "name code description")
    .populate("mentorCandidates.mentor_id", "name profileImage")
    .populate(
      "mentorCandidates.official_mentor_id",
      "name profileImage designation"
    );

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedPoll, "Mentor candidate added successfully")
    );
});

// Create weekly polls automatically (System function)
export const createWeeklyPolls = asyncHandler(async (req, res) => {
  const currentDate = new Date();
  const weekNumber = Math.ceil(currentDate.getDate() / 7);
  const year = currentDate.getFullYear();

  // Get all unique branch-year combinations
  const branchYearCombinations = await Student.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: {
          branch: "$branch",
          year: "$year",
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 5 } } }, // Only create polls for groups with at least 5 students
  ]);

  // Get all subjects
  const subjects = await Subject.find({ isActive: true });

  const createdPolls = [];

  for (const combination of branchYearCombinations) {
    const { branch, year: studentYear } = combination._id;

    for (const subject of subjects) {
      // Check if poll already exists for this week
      const existingPoll = await Poll.findOne({
        "targetCriteria.branch": branch,
        "targetCriteria.year": studentYear,
        subject: subject._id,
        weekNumber,
        year,
        isAutoGenerated: true,
      });

      if (!existingPoll) {
        try {
          const poll = await Poll.createWeeklyPoll(
            branch,
            studentYear,
            subject,
            weekNumber,
            year
          );
          createdPolls.push(poll);
        } catch (error) {
          console.error(
            `Error creating weekly poll for ${branch} Year ${studentYear} - ${subject.name}:`,
            error
          );
        }
      }
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        createdPolls: createdPolls.length,
        weekNumber,
        year,
      },
      `${createdPolls.length} weekly polls created successfully`
    )
  );
});

export default {
  createPoll,
  getActivePolls,
  getPollById,
  voteInPoll,
  getPollResults,
  endPoll,
  getAllPolls,
  addMentorCandidate,
  createWeeklyPolls,
};
