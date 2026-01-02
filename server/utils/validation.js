import Joi from 'joi';
import logger from './logger.js';

// Generic validation middleware
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Validation failed for ${property}`, {
        property,
        errors: error.details,
        requestBody: req[property]
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    // Replace the request property with the validated and sanitized data
    req[property] = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Auth schemas
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('member', 'admin').default('member'),
    adminInviteToken: Joi.string().when('role', {
      is: 'admin',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  verifyOTP: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().min(6).required()
  }),

  // Task schemas
  createTask: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().max(2000).optional(),
    assignee: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    team: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    dueDate: Joi.date().iso().min('now').optional(),
    tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
    checklist: Joi.array().items(
      Joi.object({
        text: Joi.string().trim().required(),
        completed: Joi.boolean().default(false)
      })
    ).optional()
  }),

  updateTask: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().max(2000).optional(),
    assignee: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null).optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    dueDate: Joi.date().iso().optional(),
    tags: Joi.array().items(Joi.string().trim()).max(10).optional(),
    checklist: Joi.array().items(
      Joi.object({
        text: Joi.string().trim().required(),
        completed: Joi.boolean().default(false)
      })
    ).optional()
  }),

  // Team schemas
  createTeam: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    description: Joi.string().max(500).optional(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#3B82F6'),
    members: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional()
  }),

  updateTeam: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    description: Joi.string().max(500).optional(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    members: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional()
  }),

  // User schemas
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    email: Joi.string().email().optional()
  }),

  // Message schemas
  sendMessage: Joi.object({
    content: Joi.string().trim().min(1).max(2000).required(),
    conversationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    encryptedContent: Joi.string().optional(),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().required(),
        originalName: Joi.string().required(),
        mimetype: Joi.string().required(),
        size: Joi.number().max(10 * 1024 * 1024).required() // 10MB max
      })
    ).max(5).optional() // Max 5 attachments
  }),

  // Query parameter schemas
  taskQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    team: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    assignee: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().valid('createdAt', 'dueDate', 'priority', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  teamQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().max(100).optional()
  })
};

// MongoDB ObjectId validation helper
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    
    if (!objectIdPattern.test(req.params[paramName])) {
      logger.warn(`Invalid ObjectId format for ${paramName}`, {
        paramName,
        value: req.params[paramName],
        url: req.originalUrl
      });
      
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};
