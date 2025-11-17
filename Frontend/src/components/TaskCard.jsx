import { Calendar, User, AlertCircle, Clock } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

const TaskCard = ({ task, onClick }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed';
  const daysUntilDue = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;

  return (
    <div
      onClick={onClick}
      className="card hover:shadow-md transition-all cursor-pointer border-l-4 animate-fade-in"
      style={{ borderLeftColor: task.team?.color || '#6366f1' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex-1 line-clamp-2">{task.title}</h3>
        <span className={`badge ${getPriorityColor(task.priority)} ml-2`}>
          {task.priority}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, index) => (
            <span key={index} className="badge bg-gray-100 text-gray-600">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
        {/* Assignee */}
        <div className="flex items-center space-x-2 text-gray-600">
          <User size={14} />
          <span className="text-xs">{task.assignee?.name || 'Unassigned'}</span>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            {isOverdue ? <AlertCircle size={14} /> : <Calendar size={14} />}
            <span className="text-xs font-medium">
              {isOverdue ? 'Overdue' : daysUntilDue === 0 ? 'Today' : daysUntilDue === 1 ? 'Tomorrow' : format(new Date(task.dueDate), 'MMM dd')}
            </span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-3">
        <span className={`badge ${getStatusColor(task.status)}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
