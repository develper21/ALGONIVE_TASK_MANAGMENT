import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import { authMiddleware } from '../utils/authMiddleware.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { validate, schemas } from '../utils/validation.js';
import { strictLimiter } from '../utils/rateLimiter.js';
import { AuditLogger } from '../utils/auditLogger.js';
import logger from '../utils/logger.js';
import cache, { cacheKeys, cacheInvalidation } from '../utils/cache.js';
import { sendEmail, emailTemplates } from '../utils/emailService.js';
import { generateOTP, hashOTP, verifyOTP, validateOTP, isOTPExpired } from '../utils/otpUtils.js';

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', 
  strictLimiter,
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, adminInviteToken } = req.body;

    // Check if user exists in cache first
    const cacheKey = `user:email:${email.toLowerCase()}`;
    const existingUser = await cache.get(cacheKey) || 
                       await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      await AuditLogger.logSecurityEvent('SECURITY_LOGIN_FAILED', req, {
        email,
        reason: 'User already exists',
        attempt: 'signup'
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Validate admin invite token if role is admin
    if (role === 'admin') {
      if (!adminInviteToken || adminInviteToken !== process.env.ADMIN_INVITE_TOKEN) {
        await AuditLogger.logSecurityEvent('SECURITY_UNAUTHORIZED_ACCESS', req, {
          email,
          role,
          reason: 'Invalid admin invite token'
        });
        
        return res.status(403).json({
          success: false,
          message: 'Invalid admin invite token'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(12); // Increased salt rounds
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'member'
    });

    await user.save();

    // Cache the new user
    await cache.set(cacheKey, user, 3600);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful registration
    await AuditLogger.logUserAction(user._id, 'USER_REGISTER', req, {
      role: user.role,
      email: user.email
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', 
  strictLimiter,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check cache first for failed attempts
    const failedAttemptsKey = `login_failed:${email.toLowerCase()}`;
    const failedAttempts = await cache.get(failedAttemptsKey) || 0;
    
    if (failedAttempts >= 5) {
      await AuditLogger.logSecurityEvent('SECURITY_RATE_LIMIT_EXCEEDED', req, {
        email,
        failedAttempts,
        reason: 'Too many failed login attempts'
      });
      
      return res.status(429).json({
        success: false,
        message: 'Account locked due to too many failed attempts. Try again later.'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Increment failed attempts
      await cache.incr(failedAttemptsKey, 900); // 15 minutes TTL
      
      await AuditLogger.logSecurityEvent('SECURITY_LOGIN_FAILED', req, {
        email,
        reason: 'User not found',
        failedAttempts: failedAttempts + 1
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      await cache.incr(failedAttemptsKey, 900); // 15 minutes TTL
      
      await AuditLogger.logSecurityEvent('SECURITY_LOGIN_FAILED', req, {
        email,
        userId: user._id,
        reason: 'Invalid password',
        failedAttempts: failedAttempts + 1
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Clear failed attempts on successful login
    await cache.del(failedAttemptsKey);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful login
    await AuditLogger.logUserAction(user._id, 'USER_LOGIN', req, {
      email: user.email
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  })
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', 
  authMiddleware,
  asyncHandler(async (req, res) => {
    const cacheKey = cacheKeys.user(req.user._id);
    
    // Try to get from cache first
    let user = await cache.get(cacheKey);
    
    if (!user) {
      user = await User.findById(req.user._id)
        .select('-passwordHash')
        .populate('teams', 'name color');
      
      // Cache for 30 minutes
      if (user) {
        await cache.set(cacheKey, user, 1800);
      }
    }
    
    res.json({
      success: true,
      user
    });
  })
);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile',
  authMiddleware,
  validate(schemas.updateProfile),
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const userId = req.user._id;
    
    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash').populate('teams', 'name color');
    
    // Invalidate cache
    await cacheInvalidation.invalidateUser(userId);
    
    // Log profile update
    await AuditLogger.logUserAction(userId, 'USER_PROFILE_UPDATE', req, updateData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  })
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    // Log logout
    await AuditLogger.logUserAction(userId, 'USER_LOGOUT', req);
    
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post('/forgot-password',
  strictLimiter,
  validate(schemas.forgotPassword),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset OTP has been sent.'
      });
    }

    // Check rate limiting for OTP requests
    const otpRateLimitKey = `otp_request:${email.toLowerCase()}`;
    const lastRequest = await cache.get(otpRateLimitKey);
    
    if (lastRequest) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP. Try again in a few minutes.'
      });
    }

    // Generate and hash OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    // Delete any existing unused OTPs for this email
    await OTP.deleteMany({ 
      email: email.toLowerCase(), 
      isUsed: false 
    });

    // Store new OTP
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await otpDoc.save();

    // Send OTP email
    const emailSent = await sendEmail(
      email,
      'Reset Your Password - Algonive',
      emailTemplates.passwordResetOTP(otp)
    );

    if (!emailSent.success) {
      logger.error(`Failed to send OTP email to ${email}: ${emailSent.error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      });
    }

    // Set rate limiting
    await cache.set(otpRateLimitKey, Date.now(), 300); // 5 minutes

    // Log OTP request
    await AuditLogger.logUserAction(user._id, 'PASSWORD_RESET_REQUESTED', req, {
      email: email.toLowerCase()
    });

    logger.info(`Password reset OTP sent to ${email}`);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset OTP has been sent.'
    });
  })
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp',
  strictLimiter,
  validate(schemas.verifyOTP),
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    if (!validateOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format. Must be 6 digits.'
      });
    }

    // Find valid OTP
    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      isUsed: false
    }).sort({ createdAt: -1 }); // Get most recent OTP

    if (!otpDoc) {
      await AuditLogger.logSecurityEvent('SECURITY_OTP_INVALID', req, {
        email: email.toLowerCase(),
        reason: 'No OTP found'
      });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(otpDoc.expiresAt)) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check attempts
    if (otpDoc.attempts >= 3) {
      otpDoc.isUsed = true;
      await otpDoc.save();
      
      await AuditLogger.logSecurityEvent('SECURITY_OTP_BLOCKED', req, {
        email: email.toLowerCase(),
        attempts: otpDoc.attempts
      });
      
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isValidOTP = await verifyOTP(otp, otpDoc.otpHash);
    
    if (!isValidOTP) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      
      await AuditLogger.logSecurityEvent('SECURITY_OTP_INVALID', req, {
        email: email.toLowerCase(),
        attempt: otpDoc.attempts
      });
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { 
        email: email.toLowerCase(),
        otpId: otpDoc._id,
        type: 'password_reset'
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Log successful OTP verification
    await AuditLogger.logUserAction(null, 'PASSWORD_RESET_OTP_VERIFIED', req, {
      email: email.toLowerCase()
    });

    logger.info(`OTP verified for password reset: ${email}`);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });
  })
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP verification
// @access  Public
router.post('/reset-password',
  strictLimiter,
  validate(schemas.resetPassword),
  asyncHandler(async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    try {
      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid token'
        });
      }

      // Find user
      const user = await User.findOne({ email: decoded.email });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User not found'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      user.passwordHash = passwordHash;
      await user.save();

      // Clean up any remaining OTPs for this email
      await OTP.deleteMany({ 
        email: decoded.email 
      });

      // Invalidate user cache
      await cacheInvalidation.invalidateUser(user._id);

      // Log password reset
      await AuditLogger.logUserAction(user._id, 'PASSWORD_RESET_COMPLETED', req, {
        email: decoded.email
      });

      logger.info(`Password reset completed for: ${decoded.email}`);

      res.json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired token. Please request a new OTP.'
        });
      }
      
      logger.error('Password reset error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  })
);

export default router;
