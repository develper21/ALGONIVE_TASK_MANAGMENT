// Custom sanitization middleware compatible with Express v5

// Sanitize object recursively to prevent NoSQL injection
const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Remove keys that start with $ or contain .
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
};

// Sanitize string to prevent XSS
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=
};

// Middleware to sanitize request data
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    res.status(400).json({ message: 'Invalid request data' });
  }
};

module.exports = { sanitizeRequest, sanitizeObject, sanitizeString };
