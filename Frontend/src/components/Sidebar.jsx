import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  PlusCircle,
  MessageSquare,
  Settings,
  X
} from 'lucide-react';

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Teams',
    to: '/teams',
    icon: Users
  },
  {
    label: 'Task Board',
    to: '/board',
    icon: KanbanSquare
  },
  {
    label: 'Create Task',
    to: '/tasks/new',
    icon: PlusCircle
  },
  {
    label: 'Messaging',
    to: '/messaging',
    icon: MessageSquare
  }
];

const SidebarNav = ({ onNavigate }) => (
  <nav className="space-y-2">
    {navItems.map(({ label, to, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border border-transparent ${
            isActive
              ? 'bg-primary-50 text-primary-700 border-primary-100 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`
        }
        onClick={onNavigate}
      >
        <Icon size={18} />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);

const SettingsButton = ({ onNavigate }) => (
  <NavLink
    to="/settings"
    onClick={onNavigate}
    className={({ isActive }) =>
      `flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border ${
        isActive
          ? 'bg-primary-50 text-primary-700 border-primary-100 shadow-sm'
          : 'text-gray-700 border-gray-200 hover:bg-gray-50'
      }`
    }
  >
    <Settings size={18} />
    <div className="flex flex-col">
      <span>System Settings</span>
      <span className="text-xs font-normal text-gray-500">Logic & security</span>
    </div>
  </NavLink>
);

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-gradient-to-br from-gray-50 to-gray-50 rounded-xl flex items-center justify-center">
            </div>
            <span className="text-lg font-bold text-gray-900">TaskManager</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-6 overflow-y-auto h-full">
          <SidebarNav onNavigate={onClose} />
          <div className="mt-6 border-t border-gray-200 pt-4">
            <SettingsButton onNavigate={onClose} />
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-black to-gray-100 rounded-md flex items-center justify-center">
            <img src="../assets/Favicon.png" alt="Logo" className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Algonive</p>
            <p className="text-lg font-semibold text-gray-900">TaskManager</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <SidebarNav />
          <div className="mt-auto pt-6 border-t border-gray-100">
            <SettingsButton />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
