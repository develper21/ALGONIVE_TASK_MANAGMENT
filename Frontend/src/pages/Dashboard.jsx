import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, teamAPI } from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import { Plus, CheckCircle, Clock, AlertCircle, ListTodo, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
    myTasks: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, teamsRes, statsRes] = await Promise.all([
        taskAPI.getAll(),
        teamAPI.getAll(),
        taskAPI.getStats()
      ]);

      setTasks(tasksRes.data.tasks);
      setTeams(teamsRes.data.teams);
      
      // Process stats
      const statusStats = statsRes.data.stats.byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      setStats({
        pending: statusStats.pending || 0,
        in_progress: statusStats.in_progress || 0,
        completed: statusStats.completed || 0,
        myTasks: statsRes.data.stats.myTasks || 0,
        overdue: statsRes.data.stats.overdueTasks || 0
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'my':
        return tasks.filter(t => t.assignee?._id === user?.id);
      case 'pending':
        return tasks.filter(t => t.status === 'pending');
      case 'in_progress':
        return tasks.filter(t => t.status === 'in_progress');
      case 'completed':
        return tasks.filter(t => t.status === 'completed');
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">Here's what's happening with your tasks today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Pending</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <Clock className="opacity-80" size={32} />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">In Progress</p>
                <p className="text-3xl font-bold mt-1">{stats.in_progress}</p>
              </div>
              <TrendingUp className="opacity-80" size={32} />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-3xl font-bold mt-1">{stats.completed}</p>
              </div>
              <CheckCircle className="opacity-80" size={32} />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">My Tasks</p>
                <p className="text-3xl font-bold mt-1">{stats.myTasks}</p>
              </div>
              <ListTodo className="opacity-80" size={32} />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Overdue</p>
                <p className="text-3xl font-bold mt-1">{stats.overdue}</p>
              </div>
              <AlertCircle className="opacity-80" size={32} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/tasks/new')}
            className="card hover:shadow-md transition-all cursor-pointer border-2 border-dashed border-primary-300 hover:border-primary-500"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Plus className="text-primary-600" size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Create New Task</h3>
                <p className="text-sm text-gray-600">Add a task to your team</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/teams')}
            className="card hover:shadow-md transition-all cursor-pointer border-2 border-dashed border-green-300 hover:border-green-500"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="text-green-600" size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Manage Teams</h3>
                <p className="text-sm text-gray-600">View and manage your teams</p>
              </div>
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'my', label: 'My Tasks' },
            { key: 'pending', label: 'Pending' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === key
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card text-center py-12">
            <ListTodo className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first task</p>
            <button
              onClick={() => navigate('/tasks/new')}
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={() => navigate(`/tasks/${task._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
