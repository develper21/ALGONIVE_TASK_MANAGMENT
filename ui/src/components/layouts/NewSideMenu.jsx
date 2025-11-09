import React, { useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusCircleIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const NewSideMenu = ({ activeMenu, collapsed }) => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const adminMenuItems = [
    { id: "1", label: "Dashboard", icon: HomeIcon, path: "/admin/dashboard" },
    { id: "2", label: "Manage Tasks", icon: ClipboardDocumentListIcon, path: "/admin/tasks" },
    { id: "3", label: "Create Task", icon: PlusCircleIcon, path: "/admin/create-task" },
    { id: "4", label: "Team Members", icon: UserGroupIcon, path: "/admin/users" },
    { id: "5", label: "Discussions", icon: ChatBubbleLeftRightIcon, path: "/discussions" },
  ];

  const memberMenuItems = [
    { id: "1", label: "Dashboard", icon: HomeIcon, path: "/user/dashboard" },
    { id: "2", label: "My Tasks", icon: ClipboardDocumentListIcon, path: "/user/tasks" },
    { id: "3", label: "Discussions", icon: ChatBubbleLeftRightIcon, path: "/discussions" },
    { id: "4", label: "Profile", icon: UserIcon, path: "/user/profile" },
  ];

  const menuItems = user?.role === "admin" ? adminMenuItems : memberMenuItems;

  const handleClick = (path) => {
    navigate(path);
  };

  if (collapsed) return null;

  return (
    <aside className="w-[280px] h-[calc(100vh-61px)] bg-[#f9fafb] dark:bg-[#1e293b] border-r border-gray-200 dark:border-gray-700 sticky top-[61px] overflow-y-auto">
      {/* User Info Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-lg font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
            {user?.role === "admin" && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.label;
            
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section - Settings */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-[#f9fafb] dark:bg-[#1e293b]">
        <button
          onClick={() => navigate(user?.role === "admin" ? "/admin/dashboard" : "/user/profile")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default NewSideMenu;
