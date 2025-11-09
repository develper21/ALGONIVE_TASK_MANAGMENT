const mongoose = require("mongoose");

const teamDiscussionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["General", "Help", "Ideas", "Q&A", "Announcements"],
      default: "General",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    isPrivate: {
      type: Boolean,
      default: false, // false = team-wide, true = private between two users
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    replies: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      content: {
        type: String,
        required: true,
        maxlength: 2000,
      },
      reactions: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
          enum: ["like", "love", "celebrate", "support"],
        },
      }],
      isAnswer: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    tags: [String],
    status: {
      type: String,
      enum: ["Open", "Closed", "Resolved"],
      default: "Open",
    },
    views: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
teamDiscussionSchema.index({ author: 1, createdAt: -1 });
teamDiscussionSchema.index({ participants: 1 });
teamDiscussionSchema.index({ status: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model("TeamDiscussion", teamDiscussionSchema);
