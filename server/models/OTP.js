import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
otpSchema.index({ email: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired documents

// Pre-save middleware to limit attempts
otpSchema.pre('save', function(next) {
  if (this.attempts >= 3) {
    this.isUsed = true; // Mark as used after 3 failed attempts
  }
  next();
});

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
