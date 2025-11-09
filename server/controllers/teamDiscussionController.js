const TeamDiscussion = require("../models/TeamDiscussion");
const User = require("../models/User");

// Create new discussion
exports.createDiscussion = async (req, res) => {
  try {
    const { title, content, category, isPrivate, participants, tags } = req.body;
    const userId = req.user._id;

    const discussion = new TeamDiscussion({
      title,
      content,
      category,
      author: userId,
      isPrivate: isPrivate || false,
      participants: isPrivate ? participants : [],
      tags: tags || [],
    });

    await discussion.save();
    await discussion.populate("author", "name email profileImageUrl");

    res.status(201).json({
      success: true,
      message: "Discussion created successfully",
      discussion,
    });
  } catch (error) {
    console.error("Error creating discussion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create discussion",
      error: error.message,
    });
  }
};

// Get all discussions (team-wide or user-specific)
exports.getAllDiscussions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, status, search } = req.query;

    let query = {
      $or: [
        { isPrivate: false }, // Public team discussions
        { participants: userId }, // Private discussions user is part of
        { author: userId }, // Discussions created by user
      ],
    };

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { content: { $regex: search, $options: "i" } },
          ],
        },
      ];
      delete query.$or;
    }

    const discussions = await TeamDiscussion.find(query)
      .populate("author", "name email profileImageUrl")
      .populate("participants", "name email profileImageUrl")
      .populate("replies.author", "name email profileImageUrl")
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      discussions,
    });
  } catch (error) {
    console.error("Error fetching discussions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discussions",
      error: error.message,
    });
  }
};

// Get single discussion
exports.getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const discussion = await TeamDiscussion.findById(id)
      .populate("author", "name email profileImageUrl")
      .populate("participants", "name email profileImageUrl")
      .populate("replies.author", "name email profileImageUrl");

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check access for private discussions
    if (discussion.isPrivate) {
      const hasAccess =
        discussion.author._id.toString() === userId.toString() ||
        discussion.participants.some((p) => p._id.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this discussion",
        });
      }
    }

    // Increment views
    discussion.views += 1;
    await discussion.save();

    res.status(200).json({
      success: true,
      discussion,
    });
  } catch (error) {
    console.error("Error fetching discussion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discussion",
      error: error.message,
    });
  }
};

// Add reply to discussion
exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isAnswer } = req.body;
    const userId = req.user._id;

    const discussion = await TeamDiscussion.findById(id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Check access for private discussions
    if (discussion.isPrivate) {
      const hasAccess =
        discussion.author.toString() === userId.toString() ||
        discussion.participants.some((p) => p.toString() === userId.toString());

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this discussion",
        });
      }
    }

    discussion.replies.push({
      author: userId,
      content,
      isAnswer: isAnswer || false,
    });

    await discussion.save();
    await discussion.populate("replies.author", "name email profileImageUrl");

    res.status(200).json({
      success: true,
      message: "Reply added successfully",
      discussion,
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reply",
      error: error.message,
    });
  }
};

// Add reaction to reply
exports.addReaction = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    const { type } = req.body; // like, love, celebrate, support
    const userId = req.user._id;

    const discussion = await TeamDiscussion.findById(id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    const reply = discussion.replies.id(replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    // Remove existing reaction from this user
    reply.reactions = reply.reactions.filter(
      (r) => r.user.toString() !== userId.toString()
    );

    // Add new reaction
    reply.reactions.push({ user: userId, type });

    await discussion.save();

    res.status(200).json({
      success: true,
      message: "Reaction added successfully",
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reaction",
      error: error.message,
    });
  }
};

// Mark reply as answer
exports.markAsAnswer = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    const userId = req.user._id;

    const discussion = await TeamDiscussion.findById(id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Only author can mark answer
    if (discussion.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only discussion author can mark answers",
      });
    }

    const reply = discussion.replies.id(replyId);

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    // Unmark all other answers
    discussion.replies.forEach((r) => {
      r.isAnswer = false;
    });

    // Mark this as answer
    reply.isAnswer = true;

    await discussion.save();

    res.status(200).json({
      success: true,
      message: "Reply marked as answer",
    });
  } catch (error) {
    console.error("Error marking answer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark answer",
      error: error.message,
    });
  }
};

// Update discussion status
exports.updateDiscussionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const discussion = await TeamDiscussion.findById(id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Only author can update status
    if (discussion.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only discussion author can update status",
      });
    }

    discussion.status = status;
    await discussion.save();

    res.status(200).json({
      success: true,
      message: "Discussion status updated",
      discussion,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// Delete discussion
exports.deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const discussion = await TeamDiscussion.findById(id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: "Discussion not found",
      });
    }

    // Only author can delete
    if (discussion.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only discussion author can delete",
      });
    }

    await discussion.deleteOne();

    res.status(200).json({
      success: true,
      message: "Discussion deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting discussion:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete discussion",
      error: error.message,
    });
  }
};
