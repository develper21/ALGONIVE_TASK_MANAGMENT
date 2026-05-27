import express from 'express';
import fs from 'fs';
import multer from 'multer';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import TaskActivity from '../models/TaskActivity.js';
import TaskAttachment from '../models/TaskAttachment.js';
import { authMiddleware } from '../utils/authMiddleware.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { validate, schemas, validateObjectId } from '../utils/validation.js';
import { AuditLogger } from '../utils/auditLogger.js';
import logger from '../utils/logger.js';
import cache, { cacheKeys, cacheInvalidation } from '../utils/cache.js';
import { queryOptimizer } from '../utils/databaseOptimizer.js';
import { sendEmail, emailTemplates } from '../utils/emailService.js';
import { recordTaskActivity } from '../utils/activityPublisher.js';
import { ensureTaskUploadDir, getTaskRelativePath, detectFileType, resolveAttachmentPath } from '../utils/attachmentStorage.js';

const router = express.Router();

const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dir = ensureTaskUploadDir(req.params.id);
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB per file
  }
});

const idsEqual = (a, b) => a?.toString() === b?.toString();
const includesId = (ids = [], id) => ids.some((item) => idsEqual(item, id));

const requireTaskAccess = async (taskId, user) => {
  const task = await Task.findById(taskId).populate('team', 'members name color');
  if (!task) {
    const error = new Error('Task not found');
    error.status = 404;
    throw error;
  }

  const userId = user._id.toString();
  const isMember = includesId(task.team?.members, userId);
  const isCreator = idsEqual(task.createdBy, userId);

  if (!isMember && !isCreator && user.role !== 'admin') {
    const error = new Error('Access denied');
    error.status = 403;
    throw error;
  }

  return task;
};

// @route   POST /api/tasks/:id/attachments
// @desc    Upload files for a task
// @access  Private
router.post('/:id/attachments', 
  authMiddleware,
  validateObjectId('id'),
  attachmentUpload.array('files', 10),
  asyncHandler(async (req, res) => {
    const task = await requireTaskAccess(req.params.id, req.user);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const attachments = await Promise.all(req.files.map(async (file) => {
      const relativePath = getTaskRelativePath(task._id, file.filename);
      const fileType = detectFileType(file.mimetype, file.originalname);

      const attachment = await TaskAttachment.create({
        task: task._id,
        uploadedBy: req.user._id,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        fileType,
        relativePath
      });

      return attachment;
    }));

    // Log attachment upload
    await AuditLogger.logTaskAction(req.user._id, 'TASK_ATTACHMENT_ADD', task._id, req, {
      attachmentCount: attachments.length,
      totalSize: attachments.reduce((sum, att) => sum + att.size, 0)
    });

    // Invalidate task cache
    await cacheInvalidation.invalidateTask(task);

    res.status(201).json({
      success: true,
      attachments
    });
  })
);

// @route   GET /api/tasks/:id/attachments
// @desc    List attachments for a task
// @access  Private
router.get('/:id/attachments',
  authMiddleware,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    await requireTaskAccess(req.params.id, req.user);

    // Try cache first
    const cacheKey = `task:${req.params.id}:attachments`;
    let attachments = await cache.get(cacheKey);

    if (!attachments) {
      attachments = await TaskAttachment.find({ task: req.params.id })
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'name email');
      
      // Cache for 30 minutes
      await cache.set(cacheKey, attachments, 1800);
    }

    res.json({
      success: true,
      attachments
    });
  })
);

// @route   GET /api/tasks/attachments/:attachmentId/download
// @desc    Download a specific attachment
// @access  Private
router.get('/attachments/:attachmentId/download',
  authMiddleware,
  validateObjectId('attachmentId'),
  asyncHandler(async (req, res) => {
    const attachment = await TaskAttachment.findById(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    await requireTaskAccess(attachment.task, req.user);

    const absolutePath = resolveAttachmentPath(attachment.relativePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(410).json({ success: false, message: 'Attachment file missing from storage' });
    }

    // Log attachment download
    await AuditLogger.logTaskAction(req.user._id, 'TASK_ATTACHMENT_DOWNLOAD', attachment.task, req, {
      attachmentId: attachment._id,
      fileName: attachment.originalName,
      fileSize: attachment.size
    });

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);

    const readStream = fs.createReadStream(absolutePath);
    readStream.pipe(res);
  })
);

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/',
  authMiddleware,
  validate(schemas.createTask),
  asyncHandler(async (req, res) => {
    const { title, description, assignee, team, status, priority, dueDate, tags, checklist } = req.body;

    // Verify team exists and user is a member
    const teamDoc = await Team.findById(team);
    if (!teamDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Team not found' 
      });
    }

    if (!includesId(teamDoc.members, req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this team' 
      });
    }

    // Verify assignee is a team member
    if (assignee && !includesId(teamDoc.members, assignee)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Assignee must be a team member' 
      });
    }

    const task = new Task({
      title,
      description: description || '',
      createdBy: req.user._id,
      assignee: assignee || null,
      team,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      tags: tags || [],
      checklist: checklist || []
    });

    await task.save();

    // Log task creation
    await AuditLogger.logTaskAction(req.user._id, 'TASK_CREATE', task._id, req, {
      title,
      team,
      assignee,
      priority,
      status
    });

    // Invalidate task/team/user caches so newly created tasks show immediately.
    await cacheInvalidation.invalidateTask(task);
    await cacheInvalidation.invalidateTeam(team);

    await recordTaskActivity({
      taskId: task._id,
      teamId: team,
      actorId: req.user._id,
      action: 'task_created',
      metadata: {
        status: task.status,
        priority: task.priority,
        assignee: assignee || null
      }
    });

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email')
      .populate('assignee', 'name email')
      .populate('team', 'name color');

    // Create notification for assignee
    if (assignee && assignee !== req.user._id.toString()) {
      const notification = new Notification({
        user: assignee,
        actor: req.user._id,
        task: task._id,
        type: 'assignment',
        message: `${req.user.name} assigned you a task: "${title}"`,
        link: `/tasks/${task._id}`
      });
      await notification.save();

      // Send email notification with enhanced template
      const assigneeUser = await User.findById(assignee);
      if (assigneeUser) {
        await sendEmail(
          assigneeUser.email,
          `New Task Assigned: ${title}`,
          emailTemplates.taskAssignment({
            taskTitle: title,
            assignedBy: req.user.name,
            dueDate: dueDate || new Date(),
            priority: priority || 'medium',
            description: description || '',
            teamName: teamDoc.name,
            taskLink: `${process.env.CLIENT_URL}/tasks/${task._id}`
          })
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask
    });
  })
);

// @route   GET /api/tasks/stats/dashboard
// @desc    Get dashboard task statistics for current user
// @access  Private
router.get('/stats/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('teams role');
    const baseQuery = user.role === 'admin' ? {} : { team: { $in: user.teams || [] } };
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [byStatus, myTasks, overdueTasks, statusHistory] = await Promise.all([
      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.countDocuments({
        ...baseQuery,
        assignee: req.user._id,
        status: { $ne: 'completed' }
      }),
      Task.countDocuments({
        ...baseQuery,
        dueDate: { $lt: now },
        status: { $ne: 'completed' }
      }),
      Task.aggregate([
        {
          $match: {
            ...baseQuery,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        byStatus,
        myTasks,
        overdueTasks,
        statusHistory
      }
    });
  })
);

// @route   GET /api/tasks/activity/feed
// @desc    Get recent task activity for user's teams
// @access  Private
router.get('/activity/feed',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { limit = 25 } = req.query;
    
    // Try cache first
    const cacheKey = `user:${req.user._id}:activity_feed`;
    let activities = await cache.get(cacheKey);
    
    if (!activities) {
      const user = await User.findById(req.user._id).select('teams role');
      const activityQuery = user.role === 'admin' ? {} : { team: { $in: user.teams || [] } };

      activities = await TaskActivity.find(activityQuery)
        .sort({ createdAt: -1 })
        .limit(Math.min(parseInt(limit, 10) || 25, 100))
        .populate('task', 'title status priority assignee')
        .populate('team', 'name color')
        .populate('actor', 'name email role avatar');
      
      // Cache for 5 minutes
      await cache.set(cacheKey, activities, 300);
    }

    res.json({
      success: true,
      activities
    });
  })
);

// @route   GET /api/tasks
// @desc    Get tasks (with filters)
// @access  Private
router.get('/',
  authMiddleware,
  validate(schemas.taskQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { team, status, assignee, priority, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Use queryOptimizer for better performance
    const optimizedQuery = queryOptimizer.getTasksByTeam(
      team || null, 
      { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        status, 
        priority, 
        assignee, 
        search, 
        sortBy, 
        sortOrder 
      }
    );

    // If no specific team, get user's teams and filter
    if (!team) {
      const user = await User.findById(req.user._id).select('teams role');
      
      // Update query to include user's teams. Admins can see all tasks.
      if (user.role !== 'admin') {
        optimizedQuery.query.team = { $in: user.teams || [] };
      }
    } else {
      // Verify user has access to specified team
      const teamDoc = await Team.findById(team);
      if (!teamDoc || (!includesId(teamDoc.members, req.user._id) && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this team'
        });
      }
      optimizedQuery.query.team = team;
    }

    // Apply additional filters
    if (status) optimizedQuery.query.status = status;
    if (assignee) optimizedQuery.query.assignee = assignee;
    if (priority) optimizedQuery.query.priority = priority;
    if (search) {
      optimizedQuery.query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const tasks = await Task.find(optimizedQuery.query)
      .sort(optimizedQuery.options.sort)
      .limit(optimizedQuery.options.limit)
      .skip(optimizedQuery.options.skip)
      .populate(optimizedQuery.options.populate);

    const total = await Task.countDocuments(optimizedQuery.query);

    res.json({
      success: true,
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  })
);

// @route   GET /api/tasks/:id
// @desc    Get a single task
// @access  Private
router.get('/:id',
  authMiddleware,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    // Try cache first
    const cacheKey = cacheKeys.userTasks(req.user._id, { taskId: req.params.id });
    let task = await cache.get(cacheKey);

    if (!task) {
      task = await Task.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('assignee', 'name email avatar')
        .populate('team', 'name color members');
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      // Check access
      const userId = req.user._id.toString();
      const isMember = includesId(task.team?.members, userId);
      const isCreator = idsEqual(task.createdBy?._id || task.createdBy, userId);
      const isAssignee = idsEqual(task.assignee?._id || task.assignee, userId);

      if (!isMember && !isCreator && !isAssignee && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Cache for 15 minutes
      await cache.set(cacheKey, task, 900);
    }

    res.json({
      success: true,
      task
    });
  })
);

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private
router.put('/:id',
  authMiddleware,
  validateObjectId('id'),
  validate(schemas.updateTask),
  asyncHandler(async (req, res) => {
    const task = await requireTaskAccess(req.params.id, req.user);
    const oldStatus = task.status;
    const oldAssignee = task.assignee?.toString();
    
    const updates = req.body;
    
    // Log task update
    await AuditLogger.logTaskAction(req.user._id, 'TASK_UPDATE', task._id, req, {
      updates: Object.keys(updates),
      oldValues: {
        status: oldStatus,
        assignee: oldAssignee
      }
    });

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignee', 'name email avatar')
     .populate('team', 'name color');

    // Invalidate cache
    await cacheInvalidation.invalidateTask(updatedTask);

    // Record activity if status changed
    if (updates.status && updates.status !== oldStatus) {
      await recordTaskActivity({
        taskId: task._id,
        teamId: task.team,
        actorId: req.user._id,
        action: 'status_changed',
        metadata: {
          oldStatus,
          newStatus: updates.status,
          fromStatus: oldStatus,
          toStatus: updates.status
        }
      });
    }

    // Record activity if assignee changed
    if (updates.assignee && updates.assignee !== oldAssignee) {
      await recordTaskActivity({
        taskId: task._id,
        teamId: task.team,
        actorId: req.user._id,
        action: 'assignee_changed',
        metadata: {
          oldAssignee,
          newAssignee: updates.assignee
        }
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  })
);

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private
router.delete('/:id',
  authMiddleware,
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const task = await requireTaskAccess(req.params.id, req.user);
    
    // Only creator or admin can delete
    if (task.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only task creator or admin can delete tasks'
      });
    }
    
    // Log task deletion
    await AuditLogger.logTaskAction(req.user._id, 'TASK_DELETE', task._id, req, {
      title: task.title,
      team: task.team
    });
    
    // Delete attachments and files
    const attachments = await TaskAttachment.find({ task: task._id });
    for (const attachment of attachments) {
      try {
        const absolutePath = resolveAttachmentPath(attachment.relativePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (error) {
        logger.warn('Failed to delete attachment file:', error);
      }
    }
    
    await TaskAttachment.deleteMany({ task: task._id });
    await TaskActivity.deleteMany({ task: task._id });
    await Task.findByIdAndDelete(task._id);
    
    // Invalidate cache
    await cacheInvalidation.invalidateTask(task);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  })
);

// @route   PATCH /api/tasks/:id/status
// @desc    Update task status only
// @access  Private
router.patch('/:id/status',
  authMiddleware,
  validateObjectId('id'),
  validate(schemas.updateTask),
  asyncHandler(async (req, res) => {
    const task = await requireTaskAccess(req.params.id, req.user);
    const { status } = req.body;
    const oldStatus = task.status;
    
    if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Log status change
    await AuditLogger.logTaskAction(req.user._id, 'TASK_STATUS_CHANGE', task._id, req, {
      oldStatus,
      newStatus: status
    });
    
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignee', 'name email avatar')
     .populate('team', 'name color');
    
    // Record activity
    await recordTaskActivity({
      taskId: task._id,
      teamId: task.team,
      actorId: req.user._id,
      action: 'status_changed',
      metadata: {
        oldStatus,
        newStatus: status,
        fromStatus: oldStatus,
        toStatus: status
      }
    });
    
    // Send email notification for status change to task creator and assignee
    if (status === 'completed' && (updatedTask.assignee || updatedTask.createdBy)) {
      const notificationUsers = [];
      
      if (updatedTask.assignee && updatedTask.assignee._id.toString() !== req.user._id.toString()) {
        notificationUsers.push(updatedTask.assignee);
      }
      
      if (updatedTask.createdBy._id.toString() !== req.user._id.toString()) {
        notificationUsers.push(updatedTask.createdBy);
      }
      
      for (const user of notificationUsers) {
        // Create notification
        const notification = new Notification({
          user: user._id,
          actor: req.user._id,
          task: task._id,
          type: 'status_change',
          message: `Task "${updatedTask.title}" marked as ${status}`,
          link: `/tasks/${task._id}`
        });
        await notification.save();
        
        // Send email
        await sendEmail(
          user.email,
          `Task Status Updated: ${updatedTask.title}`,
          emailTemplates.statusChange({
            taskTitle: updatedTask.title,
            oldStatus,
            newStatus: status,
            changedBy: req.user.name,
            taskLink: `${process.env.CLIENT_URL}/tasks/${task._id}`,
            dueDate: updatedTask.dueDate
          })
        );
      }
    }
    
    // Invalidate cache
    await cacheInvalidation.invalidateTask(updatedTask);
    
    res.json({
      success: true,
      message: 'Task status updated successfully',
      task: updatedTask
    });
  })
);

export default router;
