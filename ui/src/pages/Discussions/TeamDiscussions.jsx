import React, { useState, useEffect, useContext } from "react";
import NewDashboardLayout from "../../components/layouts/NewDashboardLayout";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useNotification } from "../../context/NotificationContext";

const TeamDiscussions = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const categories = ["All", "General", "Help", "Ideas", "Q&A", "Announcements"];
  const statuses = ["All", "Open", "Closed", "Resolved"];

  useEffect(() => {
    fetchDiscussions();
  }, [selectedCategory, selectedStatus]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== "All") params.category = selectedCategory;
      if (selectedStatus !== "All") params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;

      const response = await axiosInstance.get(API_PATHS.DISCUSSIONS.GET_ALL, {
        params,
      });

      if (response.data.success) {
        setDiscussions(response.data.discussions || []);
      }
    } catch (error) {
      console.error("Error fetching discussions:", error);
      addNotification("Failed to load discussions", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDiscussions();
  };

  const getCategoryColor = (category) => {
    const colors = {
      General: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
      Help: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      Ideas: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
      "Q&A": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
      Announcements: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    };
    return colors[category] || colors.General;
  };

  const getStatusBadge = (status) => {
    const badges = {
      Open: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
          <CheckCircleIcon className="w-3 h-3" />
          Open
        </span>
      ),
      Closed: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
          <XCircleIcon className="w-3 h-3" />
          Closed
        </span>
      ),
      Resolved: (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
          <CheckCircleIcon className="w-3 h-3" />
          Resolved
        </span>
      ),
    };
    return badges[status] || badges.Open;
  };

  const formatDate = (date) => {
    const now = new Date();
    const discussionDate = new Date(date);
    const diffInHours = Math.floor((now - discussionDate) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "Yesterday";
    return discussionDate.toLocaleDateString();
  };

  return (
    <NewDashboardLayout activeMenu="Discussions">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Team Discussions
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Collaborate and share ideas with your team
            </p>
          </div>
          <button
            onClick={() => navigate("/discussions/new")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
            New Discussion
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold"
            >
              Search
            </button>
          </form>
        </div>

        {/* Discussions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading discussions...</p>
          </div>
        ) : discussions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
            <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No discussions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start a conversation with your team!
            </p>
            <button
              onClick={() => navigate("/discussions/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold"
            >
              <PlusIcon className="w-5 h-5" />
              Create First Discussion
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pinned Discussions */}
            {discussions.filter((d) => d.isPinned).length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  📌 Pinned Discussions
                </h2>
                {discussions
                  .filter((d) => d.isPinned)
                  .map((discussion) => (
                    <DiscussionCard
                      key={discussion._id}
                      discussion={discussion}
                      getCategoryColor={getCategoryColor}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      navigate={navigate}
                    />
                  ))}
              </div>
            )}

            {/* Regular Discussions */}
            {discussions.filter((d) => !d.isPinned).length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recent Discussions
                </h2>
                {discussions
                  .filter((d) => !d.isPinned)
                  .map((discussion) => (
                    <DiscussionCard
                      key={discussion._id}
                      discussion={discussion}
                      getCategoryColor={getCategoryColor}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      navigate={navigate}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    </NewDashboardLayout>
  );
};

// Discussion Card Component
const DiscussionCard = ({
  discussion,
  getCategoryColor,
  getStatusBadge,
  formatDate,
  navigate,
}) => {
  return (
    <div
      onClick={() => navigate(`/discussions/${discussion._id}`)}
      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {discussion.title}
          </h3>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <img
                src={discussion.author?.profileImageUrl || `https://ui-avatars.com/api/?name=${discussion.author?.name}&background=4f46e5&color=fff&size=32`}
                alt={discussion.author?.name}
                className="w-5 h-5 rounded-full"
              />
              <span>{discussion.author?.name}</span>
            </div>
            <span>•</span>
            <span>{formatDate(discussion.createdAt)}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>{discussion.replies?.length || 0} replies</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <EyeIcon className="w-4 h-4" />
              <span>{discussion.views || 0} views</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(discussion.category)}`}>
              {discussion.category}
            </span>
            {getStatusBadge(discussion.status)}
            {discussion.isPrivate && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                🔒 Private
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDiscussions;
