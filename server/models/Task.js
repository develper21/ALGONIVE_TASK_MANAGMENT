const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: [true, "Todo text is required"],
    trim: true,
    maxlength: [500, "Todo text cannot exceed 500 characters"]
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
});

const taskSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Task title must be at least 3 characters"],
      maxlength: [200, "Task title cannot exceed 200 characters"]
    },
    description: { 
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    priority: {
      type: String,
      enum: {
        values: ["Low", "Medium", "High"],
        message: "Priority must be Low, Medium, or High"
      },
      default: "Medium",
    },
    status: {
      type: String,
      enum: {
        values: ["Pending", "In Progress", "Completed"],
        message: "Status must be Pending, In Progress, or Completed"
      },
      default: "Pending",
    },
    dueDate: { 
      type: Date, 
      required: [true, "Due date is required"],
      validate: {
        validator: function(value) {
          return value instanceof Date && !isNaN(value);
        },
        message: "Please provide a valid due date"
      }
    },
    assignedTo: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: function(value) {
          return value && value.length > 0;
        },
        message: "At least one user must be assigned to the task"
      }
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: [true, "Task creator is required"]
    },
    attachments: [{ 
      type: String,
      trim: true
    }],
    todoChecklist: [todoSchema],
    progress: { 
      type: Number, 
      default: 0,
      min: [0, "Progress cannot be less than 0"],
      max: [100, "Progress cannot exceed 100"]
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for faster queries
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

// Compound indexes for common queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
