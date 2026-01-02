import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for secure storage
export const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(otp, salt);
};

// Verify OTP against hash
export const verifyOTP = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};

// Generate secure token for email verification links
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate OTP format
export const validateOTP = (otp) => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

// Check if OTP is expired
export const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};
