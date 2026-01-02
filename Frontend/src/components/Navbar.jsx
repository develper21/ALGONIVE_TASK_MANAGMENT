import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, User, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';

const Navbar = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const getPageMeta = () => {
    const { pathname } = location;
    const routeMeta = {
      '/dashboard': { title: 'Dashboard', subtitle: 'Overview & insights' },
      '/teams': { title: 'Teams', subtitle: 'Members & collaboration' },
      '/board': { title: 'Task Board', subtitle: 'Kanban workflow' },
      '/tasks/new': { title: 'Create Task', subtitle: 'Plan fresh work' },
      '/notifications': { title: 'Notifications', subtitle: 'Latest updates' },
      '/tasks': { title: 'Tasks', subtitle: 'Manage tasks' }
    };

    if (pathname.startsWith('/tasks/') && pathname !== '/tasks/new') {
      return { title: 'Task Details', subtitle: 'Review & edit' };
    }

    return routeMeta[pathname] || { title: 'Task Manager', subtitle: 'Everything in one place' };
  };

  const pageMeta = getPageMeta();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getAll({ unreadOnly: true });
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col">
                <div className="mt-1">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-900 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-primary-500 block"></span>
                    {pageMeta.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{pageMeta.subtitle}</p>
              </div>
              <div className="sm:hidden">
                <p className="text-sm font-semibold text-gray-900">{pageMeta.title}</p>
                <p className="text-xs text-gray-500">{pageMeta.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2 focus:outline-none">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-primary-600" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

    </nav>
  );
};

export default Navbar;
