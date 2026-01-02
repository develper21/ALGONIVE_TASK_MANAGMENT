import { createClient } from 'redis';
import logger from './logger.js';

class RedisCache {
  constructor() {
    this.client = null;
    this.connected = false;
    this.defaultTTL = 3600; // 1 hour
  }
  
  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });
      
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.connected = false;
      });
      
      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.connected = true;
      });
      
      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
      });
      
      this.client.on('end', () => {
        logger.warn('Redis Client Connection Ended');
        this.connected = false;
      });
      
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      logger.info('Redis connection established successfully');
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
      // Don't throw error, allow application to work without Redis
    }
  }
  
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Redis client disconnected');
    }
  }
  
  // Generic cache methods
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.connected) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }
  
  async get(key) {
    if (!this.connected) return null;
    
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }
  
  async del(key) {
    if (!this.connected) return false;
    
    try {
      await this.client.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }
  
  async delPattern(pattern) {
    if (!this.connected) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`Cache deleted pattern ${pattern}: ${keys.length} keys`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return false;
    }
  }
  
  async exists(key) {
    if (!this.connected) return false;
    
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }
  
  async incr(key, ttl = this.defaultTTL) {
    if (!this.connected) return null;
    
    try {
      const result = await this.client.incr(key);
      if (ttl > 0 && result === 1) {
        await this.client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }
  
  // Cache middleware for Express
  middleware(options = {}) {
    const {
      ttl = this.defaultTTL,
      keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
      condition = () => true
    } = options;
    
    return async (req, res, next) => {
      if (!this.connected || !condition(req)) {
        return next();
      }
      
      const key = keyGenerator(req);
      const cachedData = await this.get(key);
      
      if (cachedData) {
        logger.debug(`Serving from cache: ${key}`);
        return res.json(cachedData);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(key, data, ttl).catch(err => {
            logger.error('Failed to cache response:', err);
          });
        }
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
}

// Create singleton instance
const cache = new RedisCache();

// Cache key generators
export const cacheKeys = {
  user: (userId) => `user:${userId}`,
  userTasks: (userId, filters = {}) => `user:${userId}:tasks:${JSON.stringify(filters)}`,
  teamTasks: (teamId, filters = {}) => `team:${teamId}:tasks:${JSON.stringify(filters)}`,
  team: (teamId) => `team:${teamId}`,
  teams: (userId) => `user:${userId}:teams`,
  notifications: (userId, filters = {}) => `user:${userId}:notifications:${JSON.stringify(filters)}`,
  taskStats: (teamId) => `team:${teamId}:stats`,
  onlineUsers: () => 'users:online',
  userPresence: (userId) => `user:${userId}:presence`,
  rateLimit: (identifier) => `rate_limit:${identifier}`,
  uploadLimit: (userId) => `upload_limit:${userId}`,
  session: (sessionId) => `session:${sessionId}`,
  apiResponse: (method, url, params = {}) => `api:${method}:${url}:${JSON.stringify(params)}`
};

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate user-related cache
  invalidateUser: async (userId) => {
    await Promise.all([
      cache.del(cacheKeys.user(userId)),
      cache.delPattern(`user:${userId}:tasks:*`),
      cache.del(cacheKeys.teams(userId)),
      cache.delPattern(`user:${userId}:notifications:*`),
      cache.del(cacheKeys.userPresence(userId))
    ]);
  },
  
  // Invalidate team-related cache
  invalidateTeam: async (teamId) => {
    await Promise.all([
      cache.del(cacheKeys.team(teamId)),
      cache.delPattern(`team:${teamId}:tasks:*`),
      cache.del(cacheKeys.taskStats(teamId))
    ]);
  },
  
  // Invalidate task-related cache
  invalidateTask: async (task) => {
    if (task.team) {
      await cache.delPattern(`team:${task.team}:tasks:*`);
      await cache.del(cacheKeys.taskStats(task.team));
    }
    
    if (task.assignee) {
      await cache.delPattern(`user:${task.assignee}:tasks:*`);
    }
    
    if (task.createdBy) {
      await cache.delPattern(`user:${task.createdBy}:tasks:*`);
    }
  },
  
  // Invalidate all cache (for emergencies)
  invalidateAll: async () => {
    await cache.delPattern('*');
  }
};

// Cache helper functions
export const cacheHelpers = {
  // Get or set pattern
  getOrSet: async (key, fetchFunction, ttl = cache.defaultTTL) => {
    const cached = await cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetchFunction();
    await cache.set(key, data, ttl);
    return data;
  },
  
  // Cache with fallback
  withFallback: async (key, fetchFunction, fallbackValue = null, ttl = cache.defaultTTL) => {
    try {
      return await cacheHelpers.getOrSet(key, fetchFunction, ttl);
    } catch (error) {
      logger.error(`Cache with fallback error for key ${key}:`, error);
      return fallbackValue;
    }
  },
  
  // Warm up cache
  warmUp: async (keyValuePairs) => {
    const promises = keyValuePairs.map(([key, value, ttl]) => 
      cache.set(key, value, ttl)
    );
    await Promise.allSettled(promises);
  }
};

export default cache;
