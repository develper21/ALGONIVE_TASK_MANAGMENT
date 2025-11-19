import mongoose from 'mongoose';

const taskActivitySchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['task_created', 'status_changed', 'assignment_changed', 'priority_changed'],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

taskActivitySchema.index({ team: 1, createdAt: -1 });
taskActivitySchema.index({ task: 1, createdAt: -1 });

const TaskActivity = mongoose.model('TaskActivity', taskActivitySchema);

export default TaskActivity;
