import helmet from 'helmet';
import logger from './logger.js';

// Simplified helmet configuration with only essential custom options
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://algonive-backend-q35u.onrender.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'none'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  
  // HSTS for HTTPS only in production
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  
  // Permission Policy
  permissionsPolicy: {
    permissions: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"],
      magnetometer: ["'none'"],
      gyroscope: ["'none'"],
      accelerometer: ["'none'"]
    }
  }
});

// Security middleware for additional security measures
export const securityMiddleware = (req, res, next) => {
  // Log security-related requests
  if (req.path.includes('/admin') || req.path.includes('/auth')) {
    logger.security(`Sensitive endpoint accessed`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
  }
  
  // Add custom security headers
  res.setHeader('X-Response-Time', Date.now() - (req.startTime || Date.now()));
  res.setHeader('X-Powered-By', 'Algonive');
  
  // Remove server information
  res.removeHeader('Server');
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempt
    /union.*select/i,  // SQL injection attempt
    /javascript:/i,  // JavaScript protocol
    /data:.*base64/i  // Base64 data URI
  ];
  
  const requestBody = JSON.stringify(req.body);
  const suspicious = suspiciousPatterns.some(pattern => 
    pattern.test(requestBody) || 
    pattern.test(req.url) || 
    pattern.test(req.query.toString())
  );
  
  if (suspicious) {
    logger.security('Suspicious request detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      userId: req.user?.id
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid request detected'
    });
  }
  
  next();
};

// IP whitelist middleware (optional, for admin routes)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.security('Unauthorized IP access attempt', {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        userId: req.user?.id
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP'
      });
    }
    
    next();
  };
};
