import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  type: {
    type: String,
    enum: ['deadline', 'assignment', 'status_change', 'team_invite', 'overdue'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
