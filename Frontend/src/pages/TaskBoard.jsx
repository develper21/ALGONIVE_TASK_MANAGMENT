import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import { Plus, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const TaskBoard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [selectedTeam]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedTeam) params.team = selectedTeam;
      
      const response = await taskAPI.getAll(params);
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => {
      const matchesStatus = task.status === status;
      const matchesSearch = searchQuery === '' || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  };

  const columns = [
    { status: 'pending', title: 'Pending', color: 'bg-gray-100', borderColor: 'border-gray-300' },
    { status: 'in_progress', title: 'In Progress', color: 'bg-blue-50', borderColor: 'border-blue-300' },
    { status: 'completed', title: 'Completed', color: 'bg-green-50', borderColor: 'border-green-300' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
            <p className="text-gray-600 mt-2">Manage tasks with Kanban view</p>
          </div>
          <button
            onClick={() => navigate('/tasks/new')}
            className="btn btn-primary mt-4 sm:mt-0 inline-flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Task</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map(({ status, title, color, borderColor }) => {
              const columnTasks = getTasksByStatus(status);
              
              return (
                <div key={status} className="flex flex-col">
                  {/* Column Header */}
                  <div className={`${color} rounded-t-xl border-2 ${borderColor} p-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <span className="badge bg-white text-gray-700">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content */}
                  <div className={`flex-1 ${color} border-2 border-t-0 ${borderColor} rounded-b-xl p-4 min-h-[400px]`}>
                    <div className="space-y-4">
                      {columnTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No tasks in this column
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <TaskCard
                            key={task._id}
                            task={task}
                            onClick={() => navigate(`/tasks/${task._id}`)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskBoard;
