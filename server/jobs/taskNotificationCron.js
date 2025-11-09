const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendTaskNotificationEmail } = require('../services/emailService');

/**
 * Task Notification Cron Job
 * Runs every day at 9:00 AM to send task status notifications
 * Cron expression: '0 9 * * *' - At 09:00 every day
 * 
 * Also checks for overdue tasks and sends urgent notifications
 */
const startTaskNotificationCron = () => {
  // Daily task notification at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily task notification cron job...');
    await sendTaskNotifications();
  });

  // Check for overdue tasks every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running overdue task check...');
    await sendOverdueTaskNotifications();
  });

  // Send reminder for tasks due in next 24 hours - runs at 10:00 AM daily
  cron.schedule('0 10 * * *', async () => {
    console.log('Running upcoming task reminder...');
    await sendUpcomingTaskReminders();
  });

  console.log('Task notification cron jobs initialized successfully');
};

/**
 * Send notifications for all active tasks
 */
const sendTaskNotifications = async () => {
  try {
    // Find all tasks that are not completed
    const tasks = await Task.find({
      status: { $in: ['Pending', 'In Progress'] }
    }).populate('assignedTo', 'name email');

    console.log(`Found ${tasks.length} active tasks to process`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const task of tasks) {
      if (task.assignedTo && task.assignedTo.length > 0) {
        for (const user of task.assignedTo) {
          if (user.email) {
            const taskDetails = {
              taskTitle: task.title,
              taskStatus: task.status,
              taskPriority: task.priority,
              dueDate: task.dueDate,
              taskId: task._id,
            };

            const result = await sendTaskNotificationEmail(
              user.email,
              user.name,
              taskDetails
            );

            if (result.success) {
              emailsSent++;
            } else {
              emailsFailed++;
            }

            // Add small delay to avoid overwhelming email server
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    console.log(`Task notifications completed: ${emailsSent} sent, ${emailsFailed} failed`);
  } catch (error) {
    console.error('Error in sendTaskNotifications:', error);
  }
};

/**
 * Send urgent notifications for overdue tasks
 */
const sendOverdueTaskNotifications = async () => {
  try {
    const now = new Date();
    
    // Find tasks that are overdue and not completed
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $in: ['Pending', 'In Progress'] }
    }).populate('assignedTo', 'name email');

    console.log(`Found ${overdueTasks.length} overdue tasks`);

    let emailsSent = 0;

    for (const task of overdueTasks) {
      if (task.assignedTo && task.assignedTo.length > 0) {
        for (const user of task.assignedTo) {
          if (user.email) {
            const taskDetails = {
              taskTitle: task.title,
              taskStatus: task.status,
              taskPriority: task.priority,
              dueDate: task.dueDate,
              taskId: task._id,
            };

            const result = await sendTaskNotificationEmail(
              user.email,
              user.name,
              taskDetails
            );

            if (result.success) {
              emailsSent++;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    console.log(`Overdue task notifications sent: ${emailsSent}`);
  } catch (error) {
    console.error('Error in sendOverdueTaskNotifications:', error);
  }
};

/**
 * Send reminders for tasks due in next 24 hours
 */
const sendUpcomingTaskReminders = async () => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find tasks due in next 24 hours that are not completed
    const upcomingTasks = await Task.find({
      dueDate: { $gte: now, $lte: next24Hours },
      status: { $in: ['Pending', 'In Progress'] }
    }).populate('assignedTo', 'name email');

    console.log(`Found ${upcomingTasks.length} tasks due in next 24 hours`);

    let emailsSent = 0;

    for (const task of upcomingTasks) {
      if (task.assignedTo && task.assignedTo.length > 0) {
        for (const user of task.assignedTo) {
          if (user.email) {
            const taskDetails = {
              taskTitle: task.title,
              taskStatus: task.status,
              taskPriority: task.priority,
              dueDate: task.dueDate,
              taskId: task._id,
            };

            const result = await sendTaskNotificationEmail(
              user.email,
              user.name,
              taskDetails
            );

            if (result.success) {
              emailsSent++;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    console.log(`Upcoming task reminders sent: ${emailsSent}`);
  } catch (error) {
    console.error('Error in sendUpcomingTaskReminders:', error);
  }
};

module.exports = {
  startTaskNotificationCron,
  sendTaskNotifications,
  sendOverdueTaskNotifications,
  sendUpcomingTaskReminders,
};
