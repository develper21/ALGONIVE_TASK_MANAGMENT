const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: { 
      type: String, 
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: { 
      type: String, 
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"]
    },
    profileImageUrl: { 
      type: String, 
      default: null 
    },
    role: { 
      type: String, 
      enum: {
        values: ["admin", "member"],
        message: "Role must be either admin or member"
      },
      default: "member" 
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for faster queries
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

module.exports = mongoose.model("User", UserSchema);
