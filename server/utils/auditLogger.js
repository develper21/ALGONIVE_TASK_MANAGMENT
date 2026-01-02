import mongoose from 'mongoose';
import logger from './logger.js';

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'USER_PROFILE_UPDATE',
      'USER_PASSWORD_CHANGE', 'USER_AVATAR_UPDATE',
      
      // Task actions
      'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_STATUS_CHANGE',
      'TASK_ASSIGN', 'TASK_UNASSIGN', 'TASK_COMMENT', 'TASK_ATTACHMENT_ADD',
      'TASK_ATTACHMENT_REMOVE', 'TASK_CHECKLIST_UPDATE',
      
      // Team actions
      'TEAM_CREATE', 'TEAM_UPDATE', 'TEAM_DELETE', 'TEAM_MEMBER_ADD',
      'TEAM_MEMBER_REMOVE', 'TEAM_LEAVE',
      
      // Message actions
      'MESSAGE_SEND', 'MESSAGE_EDIT', 'MESSAGE_DELETE',
      'CONVERSATION_CREATE', 'CONVERSATION_DELETE',
      
      // Notification actions
      'NOTIFICATION_READ', 'NOTIFICATION_READ_ALL',
      
      // System actions
      'SYSTEM_BACKUP', 'SYSTEM_CLEANUP', 'SYSTEM_MAINTENANCE',
      
      // Security actions
      'SECURITY_LOGIN_FAILED', 'SECURITY_SUSPICIOUS_ACTIVITY',
      'SECURITY_RATE_LIMIT_EXCEEDED', 'SECURITY_UNAUTHORIZED_ACCESS'
    ]
  },
  resourceType: {
    type: String,
    enum: ['User', 'Task', 'Team', 'Message', 'Conversation', 'Notification', 'System'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'activitylogs'
});

// TTL index - automatically delete logs after 90 days
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Compound indexes for common queries
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
activityLogSchema.index({ severity: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Audit Logger Class
export class AuditLogger {
  static async log(data) {
    try {
      const logEntry = new ActivityLog({
        ...data,
        timestamp: new Date()
      });
      
      await logEntry.save();
      
      // Also log to Winston for immediate visibility
      logger.audit(data.action, data.userId, {
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        severity: data.severity,
        success: data.success
      });
      
      return logEntry;
    } catch (error) {
      logger.error('Failed to save audit log:', error);
      throw error;
    }
  }
  
  // Convenience methods for common actions
  static async logUserAction(userId, action, req, details = {}, success = true) {
    return this.log({
      userId,
      action,
      resourceType: 'User',
      resourceId: userId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      success,
      severity: this.getSeverity(action)
    });
  }
  
  static async logTaskAction(userId, action, taskId, req, details = {}, success = true) {
    return this.log({
      userId,
      action,
      resourceType: 'Task',
      resourceId: taskId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      success,
      severity: this.getSeverity(action)
    });
  }
  
  static async logTeamAction(userId, action, teamId, req, details = {}, success = true) {
    return this.log({
      userId,
      action,
      resourceType: 'Team',
      resourceId: teamId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      success,
      severity: this.getSeverity(action)
    });
  }
  
  static async logSecurityEvent(action, req, details = {}, userId = null) {
    return this.log({
      userId: userId || new mongoose.Types.ObjectId(), // System user if no user
      action,
      resourceType: 'System',
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      success: false,
      severity: 'high'
    });
  }
  
  static getSeverity(action) {
    const severityMap = {
      // Critical
      'SECURITY_LOGIN_FAILED': 'critical',
      'SECURITY_SUSPICIOUS_ACTIVITY': 'critical',
      'SECURITY_UNAUTHORIZED_ACCESS': 'critical',
      'USER_DELETE': 'critical',
      'TEAM_DELETE': 'critical',
      'TASK_DELETE': 'high',
      
      // High
      'SYSTEM_BACKUP': 'high',
      'SYSTEM_MAINTENANCE': 'high',
      'USER_PASSWORD_CHANGE': 'high',
      
      // Medium
      'TASK_CREATE': 'medium',
      'TASK_UPDATE': 'medium',
      'TEAM_CREATE': 'medium',
      'TEAM_UPDATE': 'medium',
      'MESSAGE_SEND': 'medium',
      
      // Low
      'USER_LOGIN': 'low',
      'USER_LOGOUT': 'low',
      'NOTIFICATION_READ': 'low',
      'TASK_STATUS_CHANGE': 'low'
    };
    
    return severityMap[action] || 'medium';
  }
  
  // Query methods
  static async getUserActivity(userId, options = {}) {
    const { page = 1, limit = 50, action, startDate, endDate } = options;
    
    const query = { userId };
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    return ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('userId', 'name email');
  }
  
  static async getSecurityEvents(options = {}) {
    const { page = 1, limit = 50, startDate, endDate } = options;
    
    const query = { 
      action: { $regex: '^SECURITY_' },
      severity: { $in: ['high', 'critical'] }
    };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    return ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('userId', 'name email');
  }
  
  static async getActivityStats(timeframe = '24h') {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const stats = await ActivityLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          failures: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    return stats.map(stat => ({
      action: stat._id,
      count: stat.count,
      uniqueUsers: stat.uniqueUsers.length,
      failures: stat.failures
    }));
  }
}

// Express middleware for automatic audit logging
export const auditMiddleware = (action, resourceType = 'System') => {
  return (req, res, next) => {
    // Store original res.json
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          await AuditLogger.log({
            userId: req.user?.id,
            action,
            resourceType,
            resourceId: req.params.id || req.body.id,
            details: {
              method: req.method,
              url: req.originalUrl,
              params: req.params,
              query: req.query,
              statusCode: res.statusCode,
              response: data
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            success: res.statusCode >= 200 && res.statusCode < 400,
            severity: res.statusCode >= 400 ? 'high' : 'medium'
          });
        } catch (error) {
          logger.error('Audit middleware error:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

export default AuditLogger;
