import React, { useState, useContext, useEffect } from "react";
import NewDashboardLayout from "../../components/layouts/NewDashboardLayout";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useNotification } from "../../context/NotificationContext";

const CreateDiscussion = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "General",
    isPrivate: false,
    participants: [],
    tags: [],
  });

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const categories = ["General", "Help", "Ideas", "Q&A", "Announcements"];

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAllUsers();
    }
  }, [user]);

  const fetchAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (response.data) {
        setAllUsers(response.data.filter((u) => u._id !== user._id));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleParticipantToggle = (userId) => {
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId],
    }));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      addNotification("Please enter a title", "error");
      return;
    }

    if (!formData.content.trim()) {
      addNotification("Please enter content", "error");
      return;
    }

    if (formData.isPrivate && formData.participants.length === 0) {
      addNotification("Please select at least one participant for private discussion", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post(API_PATHS.DISCUSSIONS.CREATE, formData);

      if (response.data.success) {
        addNotification("Discussion created successfully!", "success");
        navigate("/discussions");
      }
    } catch (error) {
      console.error("Error creating discussion:", error);
      addNotification(
        error.response?.data?.message || "Failed to create discussion",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <NewDashboardLayout activeMenu="Discussions">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/discussions")}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Discussions
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Start a New Discussion
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Share your ideas, ask questions, or start a conversation
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="What's your discussion about?"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Provide details about your discussion..."
                rows="8"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Markdown is supported
              </p>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag(e)}
                  placeholder="Add tags..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-indigo-900 dark:hover:text-indigo-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Private Discussion */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPrivate"
                  checked={formData.isPrivate}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    🔒 Private Discussion
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Only selected participants can view and reply
                  </p>
                </div>
              </label>
            </div>

            {/* Participants (if private) */}
            {formData.isPrivate && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Select Participants <span className="text-red-500">*</span>
                </label>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-slate-700 rounded-md p-4">
                  {allUsers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No users available
                    </p>
                  ) : (
                    allUsers.map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.participants.includes(u._id)}
                          onChange={() => handleParticipantToggle(u._id)}
                          className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <img
                          src={u.profileImageUrl || `https://ui-avatars.com/api/?name=${u.name}&background=4f46e5&color=fff&size=32`}
                          alt={u.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {u.email}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/discussions")}
              className="px-6 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Discussion"}
            </button>
          </div>
        </form>
      </div>
    </NewDashboardLayout>
  );
};

export default CreateDiscussion;
