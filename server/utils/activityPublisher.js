import TaskActivity from '../models/TaskActivity.js';
import { getIO } from './socket.js';

export const recordTaskActivity = async ({ taskId, teamId, actorId, action, metadata = {} }) => {
  const entry = await TaskActivity.create({
    task: taskId,
    team: teamId,
    actor: actorId,
    action,
    metadata
  });

  const populated = await entry.populate([
    { path: 'task', select: 'title status priority assignee' },
    { path: 'team', select: 'name color' },
    { path: 'actor', select: 'name email role avatar' }
  ]);

  const io = getIO();
  if (io) {
    io.to(`team:${teamId}`).emit('dashboard:task-activity', {
      id: populated._id,
      task: populated.task,
      team: populated.team,
      actor: populated.actor,
      action,
      metadata,
      createdAt: populated.createdAt
    });
  }

  return populated;
};
