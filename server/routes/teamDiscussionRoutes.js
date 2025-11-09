const express = require("express");
const router = express.Router();
const {
  createDiscussion,
  getAllDiscussions,
  getDiscussionById,
  addReply,
  addReaction,
  markAsAnswer,
  updateDiscussionStatus,
  deleteDiscussion,
} = require("../controllers/teamDiscussionController");
const { protect } = require("../middlewares/authMiddleware");

// All routes require authentication
router.use(protect);

// Discussion CRUD
router.post("/", createDiscussion);
router.get("/", getAllDiscussions);
router.get("/:id", getDiscussionById);
router.delete("/:id", deleteDiscussion);

// Replies
router.post("/:id/reply", addReply);
router.post("/:id/reply/:replyId/reaction", addReaction);
router.put("/:id/reply/:replyId/mark-answer", markAsAnswer);

// Status update
router.put("/:id/status", updateDiscussionStatus);

module.exports = router;
