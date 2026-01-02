import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, teamAPI } from '../services/api';
import notificationService from '../services/notificationService';
import Layout from '../components/Layout';
import TaskCard from '../components/TaskCard';
import { Plus, CheckCircle, Clock, AlertCircle, ListTodo, Users, TrendingUp, Activity, Filter, Zap, Bell, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useMessaging } from '../context/MessagingContext';

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
    overdue: 0,
    statusHistory: []
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { socketRef } = useMessaging();

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
      
      const statusStats = statsRes.data.stats.byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      setStats({
        pending: statusStats.pending || 0,
        in_progress: statusStats.in_progress || 0,
        completed: statusStats.completed || 0,
        myTasks: statsRes.data.stats.myTasks || 0,
        overdue: statsRes.data.stats.overdueTasks || 0,
        statusHistory: statsRes.data.stats.statusHistory || []
      });

      try {
        const activityRes = await taskAPI.getActivityFeed({ limit: 20 });
        setActivityFeed(activityRes.data.activities || []);
      } catch (activityError) {
        console.warn('Activity feed unavailable:', activityError);
        setActivityFeed([]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const socket = socketRef.current;

    const handleActivity = (activity) => {
      setActivityFeed((prev) => [activity, ...prev]);

      if (activity.action === 'status_changed') {
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - (activity.metadata?.fromStatus === 'pending' ? 1 : 0) + (activity.metadata?.toStatus === 'pending' ? 1 : 0)),
          in_progress: Math.max(0, prev.in_progress - (activity.metadata?.fromStatus === 'in_progress' ? 1 : 0) + (activity.metadata?.toStatus === 'in_progress' ? 1 : 0)),
          completed: Math.max(0, prev.completed - (activity.metadata?.fromStatus === 'completed' ? 1 : 0) + (activity.metadata?.toStatus === 'completed' ? 1 : 0))
        }));
      }
    };

    socket.on('dashboard:task-activity', handleActivity);

    return () => {
      socket.off('dashboard:task-activity', handleActivity);
    };
  }, [socketRef]);

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
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">Here's what's happening with your tasks today.</p>
        </div>

        {/* Status Snapshot */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Task Status Overview</p>
                <h3 className="text-xl font-bold text-gray-900">Current Workload</h3>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800">
                    <Activity size={14} /> Live
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Pending', value: stats.pending, icon: Clock, color: 'from-blue-500 to-blue-600' },
                { label: 'In Progress', value: stats.in_progress, icon: TrendingUp, color: 'from-amber-500 to-amber-600' },
                { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-green-500 to-green-600' },
                { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'from-red-500 to-red-600' }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">{label}</p>
                      <p className="text-3xl font-bold mt-1">{value}</p>
                    </div>
                    <Icon size={28} className="opacity-80" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.statusHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="count" fill="url(#statusGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">My Queue</p>
                <h3 className="text-xl font-bold text-gray-900">Assigned To Me</h3>
              </div>
              <ListTodo className="text-primary-500" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-4xl font-bold text-gray-900">{stats.myTasks}</p>
                <p className="text-sm text-gray-500 mt-1">Active tasks awaiting your action</p>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Keep the flow going by updating statuses</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>{stats.overdue} tasks overdue across your teams</span>
                </div>
              </div>
              <button
                onClick={() => setFilter('my')}
                className="btn btn-primary mt-6 inline-flex items-center gap-2"
              >
                <Filter size={16} /> Focus on my tasks
              </button>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Activity Feed</p>
                <h3 className="text-xl font-bold text-gray-900">Team Movements</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  className="text-sm text-primary-600 inline-flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Refresh
                </button>
                <button
                  onClick={() => notificationService.clearAll()}
                  className="text-sm text-primary-600 inline-flex items-center gap-2"
                >
                  <Bell size={16} /> Clear Notifications
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {activityFeed.length === 0 ? (
                <p className="text-sm text-gray-500">No recent activity. Make some updates to see them here.</p>
              ) : (
                activityFeed.map((activity) => (
                  <div key={activity.id || activity._id} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                          <Activity className="text-primary-500" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {activity.actor?.name || 'Someone'}
                            <span className="text-gray-500 font-normal"> • {activity.team?.name}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.action === 'task_created' && 'created a task'}
                            {activity.action === 'status_changed' && `moved to ${activity.metadata?.toStatus}`}
                            {activity.action === 'assignment_changed' && 'changed assignment'}
                            {activity.action === 'priority_changed' && `changed priority to ${activity.metadata?.toPriority}`}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{activity.task?.title || 'Task'} </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Status Trends</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.statusHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
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
                onClick={() => navigate(`/tasks/${task._id}/workspace`)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
