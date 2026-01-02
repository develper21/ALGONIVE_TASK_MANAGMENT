import { taskAPI } from './api.js';

// Enhanced notification service for real-time updates
class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.showNotification('Back online', 'success'));
    window.addEventListener('offline', () => this.showNotification('Connection lost', 'error'));
  }

  // Show browser notification
  showNotification(message, type = 'info', duration = 5000) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(message, {
        body: message,
        icon: '/favicon.ico',
        tag: 'algonive-notification'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), duration);
    }

    // Also show in-app notification
    this.addInAppNotification(message, type);
  }

  // Add in-app notification
  addInAppNotification(message, type = 'info') {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(notification);
    this.notifyListeners();
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  // Add event listener
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove event listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return true;
  }

  // Enhanced task notifications
  notifyTaskUpdate(task, action) {
    const messages = {
      created: `Task "${task.title}" created successfully`,
      updated: `Task "${task.title}" updated`,
      deleted: `Task "${task.title}" deleted`,
      completed: `Task "${task.title}" marked as completed`,
      assigned: `Task "${task.title}" assigned to you`
    };

    this.showNotification(messages[action] || `Task "${task.title}" ${action}`, 'success');
  }

  // Deadline reminders
  setupDeadlineReminders() {
    // Check for overdue tasks every hour
    setInterval(async () => {
      try {
        const response = await taskAPI.getStats();
        const { overdue } = response.data;
        
        if (overdue > 0) {
          this.showNotification(`You have ${overdue} overdue task(s)!`, 'warning');
        }
      } catch (error) {
        console.error('Failed to check overdue tasks:', error);
      }
    }, 3600000); // Every hour
  }

  // Initialize service
  async init() {
    await this.requestPermission();
    this.setupDeadlineReminders();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
