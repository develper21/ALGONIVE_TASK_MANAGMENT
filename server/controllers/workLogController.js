const WorkLog = require("../models/WorkLog");
const Task = require("../models/Task");
const User = require("../models/User");

// @desc Create or update work log for a day
// @route POST /api/worklogs
// @access Private
const createWorkLog = async (req, res) => {
  try {
    const { taskId, date, hoursWorked, description, progress, activities } = req.body;
    const userId = req.user.id;

    // Validate task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssigned = task.assignedTo.some(
      (user) => user.toString() === userId
    );
    if (!isAssigned) {
      return res.status(403).json({ message: "You are not assigned to this task" });
    }

    // Check if work log already exists for this date
    const existingLog = await WorkLog.findOne({
      userId,
      taskId,
      date: new Date(date).setHours(0, 0, 0, 0),
    });

    if (existingLog) {
      // Update existing log
      existingLog.hoursWorked = hoursWorked;
      existingLog.description = description;
      existingLog.progress = progress;
      existingLog.activities = activities;
      await existingLog.save();

      return res.json({
        message: "Work log updated successfully",
        workLog: existingLog,
      });
    }

    // Create new work log
    const workLog = await WorkLog.create({
      userId,
      taskId,
      date: new Date(date).setHours(0, 0, 0, 0),
      hoursWorked,
      description,
      progress,
      activities,
    });

    res.status(201).json({
      message: "Work log created successfully",
      workLog,
    });
  } catch (error) {
    console.error("Error creating work log:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Get work logs for a user (with date range filter)
// @route GET /api/worklogs/user/:userId
// @access Private (Admin or own logs)
const getUserWorkLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, taskId } = req.query;
    const requesterId = req.user.id;
    const requester = await User.findById(requesterId);

    // Check permission
    if (requester.role !== "admin" && requesterId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { userId };

    if (taskId) {
      query.taskId = taskId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate).setHours(0, 0, 0, 0),
        $lte: new Date(endDate).setHours(23, 59, 59, 999),
      };
    }

    const workLogs = await WorkLog.find(query)
      .populate("taskId", "title status priority")
      .sort({ date: -1 });

    // Calculate statistics
    const totalHours = workLogs.reduce((sum, log) => sum + log.hoursWorked, 0);
    const avgProgress = workLogs.length > 0
      ? workLogs.reduce((sum, log) => sum + log.progress, 0) / workLogs.length
      : 0;

    res.json({
      workLogs,
      statistics: {
        totalHours: totalHours.toFixed(2),
        avgProgress: avgProgress.toFixed(2),
        totalDays: workLogs.length,
      },
    });
  } catch (error) {
    console.error("Error fetching work logs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Get work logs for a specific task
// @route GET /api/worklogs/task/:taskId
// @access Private
const getTaskWorkLogs = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const user = await User.findById(userId);

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check access
    const isAssigned = task.assignedTo.some(
      (assignedUser) => assignedUser.toString() === userId
    );
    if (user.role !== "admin" && !isAssigned) {
      return res.status(403).json({ message: "Access denied" });
    }

    const workLogs = await WorkLog.find({ taskId })
      .populate("userId", "name email profileImageUrl profileDisplayUrl")
      .sort({ date: -1 });

    res.json({ workLogs });
  } catch (error) {
    console.error("Error fetching task work logs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Get daily work summary for dashboard
// @route GET /api/worklogs/summary/daily
// @access Private
const getDailySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const workLogs = await WorkLog.find({
      userId,
      date: { $gte: startDate },
    })
      .populate("taskId", "title")
      .sort({ date: 1 });

    // Group by date
    const dailyData = {};
    workLogs.forEach((log) => {
      const dateKey = new Date(log.date).toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          totalHours: 0,
          tasks: [],
          avgProgress: 0,
          progressSum: 0,
          count: 0,
        };
      }
      dailyData[dateKey].totalHours += log.hoursWorked;
      dailyData[dateKey].tasks.push({
        title: log.taskId?.title,
        hours: log.hoursWorked,
        progress: log.progress,
      });
      dailyData[dateKey].progressSum += log.progress;
      dailyData[dateKey].count += 1;
    });

    // Calculate averages
    Object.keys(dailyData).forEach((date) => {
      dailyData[date].avgProgress = (
        dailyData[date].progressSum / dailyData[date].count
      ).toFixed(2);
      delete dailyData[date].progressSum;
      delete dailyData[date].count;
    });

    res.json({
      summary: Object.values(dailyData),
      totalHours: workLogs.reduce((sum, log) => sum + log.hoursWorked, 0).toFixed(2),
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc Delete a work log
// @route DELETE /api/worklogs/:workLogId
// @access Private
const deleteWorkLog = async (req, res) => {
  try {
    const { workLogId } = req.params;
    const userId = req.user.id;
    const user = await User.findById(userId);

    const workLog = await WorkLog.findById(workLogId);
    if (!workLog) {
      return res.status(404).json({ message: "Work log not found" });
    }

    // Only owner or admin can delete
    if (workLog.userId.toString() !== userId && user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await workLog.deleteOne();
    res.json({ message: "Work log deleted successfully" });
  } catch (error) {
    console.error("Error deleting work log:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createWorkLog,
  getUserWorkLogs,
  getTaskWorkLogs,
  getDailySummary,
  deleteWorkLog,
};
