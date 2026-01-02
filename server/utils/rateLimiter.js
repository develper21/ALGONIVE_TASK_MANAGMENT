import rateLimit from 'express-rate-limit';
import logger from './logger.js';

// Helper function to get IP address safely
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         'unknown';
};

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => getClientIP(req),
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      originalUrl: req.originalUrl,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

// Strict rate limiter for sensitive endpoints
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getClientIP(req),
  handler: (req, res) => {
    logger.security('Rate limit exceeded on sensitive endpoint', {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      originalUrl: req.originalUrl,
      method: req.method,
      userId: req.user?.id
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many attempts, please try again after 15 minutes'
    });
  }
});

// Auth endpoints rate limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getClientIP(req),
  handler: (req, res) => {
    logger.security('Auth rate limit exceeded', {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      originalUrl: req.originalUrl,
      method: req.method,
      email: req.body?.email
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again after 15 minutes'
    });
  }
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again after an hour'
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || getClientIP(req);
  },
  handler: (req, res) => {
    logger.security('Upload rate limit exceeded', {
      ip: getClientIP(req),
      userId: req.user?.id,
      originalUrl: req.originalUrl,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Upload limit exceeded, please try again after an hour'
    });
  }
});

// Create custom rate limiter
export const createCustomLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      message: 'Too many requests, please try again later'
    },
    keyGenerator: options.keyGenerator || ((req) => req.user?.id || getClientIP(req)),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      logger.security('Custom rate limit exceeded', {
        ip: getClientIP(req),
        userId: req.user?.id,
        originalUrl: req.originalUrl,
        method: req.method,
        limitName: options.name || 'custom'
      });
      
      res.status(429).json(options.message || {
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
  });
};
