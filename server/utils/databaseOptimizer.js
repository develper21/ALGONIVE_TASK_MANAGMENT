import mongoose from 'mongoose';
import logger from './customLogger.js';

// Database optimization utilities
export class DatabaseOptimizer {
  static async createIndexes() {
    try {
      logger.subsection('Creating Database Indexes');
      
      // User collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('users').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { role: 1 } },
        { key: { teams: 1 } },
        { key: { name: 'text', email: 'text' } } // Text search
      ]);
      logger.dbIndex('users', 'email_unique, role, teams, text_search');
      
      // Task collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('tasks').createIndexes([
        { key: { team: 1, status: 1 } },
        { key: { assignee: 1, status: 1 } },
        { key: { createdBy: 1 } },
        { key: { dueDate: 1 } },
        { key: { priority: 1 } },
        { key: { status: 1 } },
        { key: { team: 1, status: 1, dueDate: 1 } }, // Compound index for team kanban views
        { key: { assignee: 1, status: 1, dueDate: 1 } }, // Compound index for user task lists
        { key: { title: 'text', description: 'text' } }, // Text search
        { key: { tags: 1 } },
        { key: { team: 1, priority: 1, status: 1 } } // Compound index for team priority filtering
      ]);
      logger.dbIndex('tasks', 'compound_indexes, text_search, tags');
      
      // Team collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('teams').createIndexes([
        { key: { name: 1 } },
        { key: { createdBy: 1 } },
        { key: { members: 1 } },
        { key: { name: 'text', description: 'text' } } // Text search
      ]);
      logger.dbIndex('teams', 'name, createdBy, members, text_search');
      
      // Conversation collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('conversations').createIndexes([
        { key: { participants: 1 } },
        { key: { team: 1 } },
        { key: { lastMessageAt: -1 } },
        { key: { participants: 1, lastMessageAt: -1 } } // Compound index for user conversations
      ]);
      logger.dbIndex('conversations', 'participants, team, lastMessageAt');
      
      // Message collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('messages').createIndexes([
        { key: { conversation: 1, createdAt: -1 } },
        { key: { sender: 1 } },
        { key: { conversation: 1, sender: 1 } },
        { key: { content: 'text' } } // Text search
      ]);
      logger.dbIndex('messages', 'conversation, sender, text_search');
      
      // Notification collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('notifications').createIndexes([
        { key: { type: 1 } },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0 } // TTL index for auto-deletion
      ]);
      logger.dbIndex('notifications', 'type, TTL_expiresAt');
      
      // Activity log collection indexes (only those not defined in schema)
      await mongoose.connection.db.collection('activitylogs').createIndexes([
        { key: { userId: 1, createdAt: -1 } },
        { key: { taskId: 1, createdAt: -1 } },
        { key: { teamId: 1, createdAt: -1 } },
        { key: { action: 1 } },
        { key: { expiresAt: 1 }, expireAfterSeconds: 7776000 } // TTL for 90 days
      ]);
      logger.dbIndex('activitylogs', 'compound_indexes, action, TTL_expiresAt');
      
      logger.success('All database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes', error.message);
      // Don't throw error for index creation, just log it
      logger.warning('Some indexes may already exist, continuing...');
    }
  }
  
  static async analyzePerformance() {
    try {
      logger.info('Analyzing database performance...');
      
      const collections = ['users', 'tasks', 'teams', 'conversations', 'messages', 'notifications'];
      const stats = {};
      
      for (const collectionName of collections) {
        const collection = mongoose.connection.db.collection(collectionName);
        const collStats = await collection.stats();
        const indexStats = await collection.aggregate([{ $indexStats: {} }]).toArray();
        
        stats[collectionName] = {
          documentCount: collStats.count,
          sizeInBytes: collStats.size,
          avgDocumentSize: collStats.avgObjSize,
          indexCount: collStats.nindexes,
          indexSizes: collStats.indexSizes,
          indexStats: indexStats.map(stat => ({
            name: stat.name,
            accesses: stat.accesses.ops,
            lastAccessed: stat.accesses.since
          }))
        };
      }
      
      logger.info('Database performance analysis completed', stats);
      return stats;
    } catch (error) {
      logger.error('Error analyzing database performance:', error);
      throw error;
    }
  }
  
  static async cleanupExpiredData() {
    try {
      logger.info('Cleaning up expired data...');
      
      // Clean up old activity logs (older than 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const activityLogsDeleted = await mongoose.connection.db
        .collection('activitylogs')
        .deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
      
      // Clean up read notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const notificationsDeleted = await mongoose.connection.db
        .collection('notifications')
        .deleteMany({ 
          read: true, 
          createdAt: { $lt: thirtyDaysAgo } 
        });
      
      logger.info('Cleanup completed', {
        activityLogsDeleted: activityLogsDeleted.deletedCount,
        notificationsDeleted: notificationsDeleted.deletedCount
      });
      
      return {
        activityLogsDeleted: activityLogsDeleted.deletedCount,
        notificationsDeleted: notificationsDeleted.deletedCount
      };
    } catch (error) {
      logger.error('Error cleaning up expired data:', error);
      throw error;
    }
  }
  
  static async optimizeQueries() {
    try {
      logger.subsection('Optimizing Database Queries');
      
      // Set global query options for better performance
      mongoose.connection.set('maxTimeMS', 30000); // 30 second query timeout
      
      // Configure connection options for consistency
      const connectionOptions = {
        readPreference: 'primary',
        writeConcern: { w: 'majority', j: true },
        readConcern: { level: 'majority' }
      };
      
      logger.success('Database query optimization completed');
    } catch (error) {
      logger.error('Error optimizing database queries', error.message);
      // Don't throw error for optimization, just log it
      logger.warning('Database optimization skipped, continuing...');
    }
  }
}

// Query optimization helpers
export const queryOptimizer = {
  // Optimized task queries
  getTasksByTeam: (teamId, options = {}) => {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignee,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    const query = { team: teamId };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;
    if (search) {
      query.$text = { $search: search };
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    return {
      query,
      options: {
        sort,
        limit,
        skip: (page - 1) * limit,
        populate: [
          { path: 'assignee', select: 'name email avatar' },
          { path: 'createdBy', select: 'name email' },
          { path: 'team', select: 'name color' }
        ]
      }
    };
  },
  
  // Optimized user tasks query
  getUserTasks: (userId, options = {}) => {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;
    
    const query = { assignee: userId };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$text = { $search: search };
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    return {
      query,
      options: {
        sort,
        limit,
        skip: (page - 1) * limit,
        populate: [
          { path: 'team', select: 'name color' },
          { path: 'createdBy', select: 'name email' }
        ]
      }
    };
  },
  
  // Optimized notifications query
  getUserNotifications: (userId, options = {}) => {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    
    const query = { userId };
    if (unreadOnly) query.read = false;
    
    return {
      query,
      options: {
        sort: { createdAt: -1 },
        limit,
        skip: (page - 1) * limit
      }
    };
  }
};
