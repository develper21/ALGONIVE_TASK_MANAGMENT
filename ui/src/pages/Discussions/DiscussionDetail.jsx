import React, { useState, useEffect, useContext } from "react";
import NewDashboardLayout from "../../components/layouts/NewDashboardLayout";
import { UserContext } from "../../context/userContext";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  HandThumbUpIcon,
  HeartIcon,
  FaceSmileIcon,
  FireIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  HandThumbUpIcon as HandThumbUpSolid,
  HeartIcon as HeartSolid,
  FaceSmileIcon as FaceSmileSolid,
  FireIcon as FireSolid,
} from "@heroicons/react/24/solid";
import { useNotification } from "../../context/NotificationContext";
import moment from "moment";

const DiscussionDetail = () => {
  const { id } = useParams();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDiscussion();
  }, [id]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_PATHS.DISCUSSIONS.GET_BY_ID(id));

      if (response.data.success) {
        setDiscussion(response.data.discussion);
      }
    } catch (error) {
      console.error("Error fetching discussion:", error);
      addNotification("Failed to load discussion", "error");
      navigate("/discussions");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (e) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      addNotification("Please enter a reply", "error");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axiosInstance.post(API_PATHS.DISCUSSIONS.ADD_REPLY(id), {
        content: replyContent,
      });

      if (response.data.success) {
        addNotification("Reply added successfully!", "success");
        setReplyContent("");
        fetchDiscussion(); // Refresh discussion
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      addNotification("Failed to add reply", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (replyId, type) => {
    try {
      await axiosInstance.post(API_PATHS.DISCUSSIONS.ADD_REACTION(id, replyId), {
        type,
      });
      fetchDiscussion(); // Refresh to show updated reactions
    } catch (error) {
      console.error("Error adding reaction:", error);
      addNotification("Failed to add reaction", "error");
    }
  };

  const handleMarkAsAnswer = async (replyId) => {
    try {
      await axiosInstance.put(API_PATHS.DISCUSSIONS.MARK_ANSWER(id, replyId));
      addNotification("Marked as answer!", "success");
      fetchDiscussion();
    } catch (error) {
      console.error("Error marking answer:", error);
      addNotification("Failed to mark as answer", "error");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axiosInstance.put(API_PATHS.DISCUSSIONS.UPDATE_STATUS(id), {
        status: newStatus,
      });
      addNotification(`Discussion ${newStatus.toLowerCase()}!`, "success");
      fetchDiscussion();
    } catch (error) {
      console.error("Error updating status:", error);
      addNotification("Failed to update status", "error");
    }
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

  if (loading) {
    return (
      <NewDashboardLayout activeMenu="Discussions">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </NewDashboardLayout>
    );
  }

  if (!discussion) {
    return (
      <NewDashboardLayout activeMenu="Discussions">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Discussion not found</p>
        </div>
      </NewDashboardLayout>
    );
  }

  const isAuthor = discussion.author?._id === user?._id;

  return (
    <NewDashboardLayout activeMenu="Discussions">
      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate("/discussions")}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Discussions
        </button>

        {/* Discussion Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
          {/* Title and Status */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
              {discussion.title}
            </h1>
            {isAuthor && (
              <select
                value={discussion.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Resolved">Resolved</option>
              </select>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <img
                src={discussion.author?.profileImageUrl || `https://ui-avatars.com/api/?name=${discussion.author?.name}&background=4f46e5&color=fff&size=32`}
                alt={discussion.author?.name}
                className="w-6 h-6 rounded-full"
              />
              <span className="font-medium text-gray-900 dark:text-white">
                {discussion.author?.name}
              </span>
            </div>
            <span>•</span>
            <span>{moment(discussion.createdAt).format("MMM D, YYYY [at] h:mm A")}</span>
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
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-3 py-1 text-xs font-medium rounded ${getCategoryColor(discussion.category)}`}>
              {discussion.category}
            </span>
            {discussion.status === "Open" && (
              <span className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                ● Open
              </span>
            )}
            {discussion.status === "Closed" && (
              <span className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                ● Closed
              </span>
            )}
            {discussion.status === "Resolved" && (
              <span className="px-3 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                ✓ Resolved
              </span>
            )}
            {discussion.isPrivate && (
              <span className="px-3 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                🔒 Private
              </span>
            )}
            {discussion.tags?.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Content */}
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {discussion.content}
            </p>
          </div>
        </div>

        {/* Replies Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            💬 {discussion.replies?.length || 0} {discussion.replies?.length === 1 ? "Reply" : "Replies"}
          </h2>

          {/* Replies List */}
          <div className="space-y-4">
            {discussion.replies?.map((reply) => (
              <ReplyCard
                key={reply._id}
                reply={reply}
                isAuthor={isAuthor}
                currentUserId={user?._id}
                onReaction={handleReaction}
                onMarkAsAnswer={handleMarkAsAnswer}
              />
            ))}
          </div>
        </div>

        {/* Add Reply Form */}
        {discussion.status !== "Closed" && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Write a Reply
            </h3>
            <form onSubmit={handleAddReply}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Add your answer here... (Shift+Enter for new line)"
                rows="6"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Markdown is supported
                </p>
                <div className="flex gap-3">
                  {isAuthor && discussion.status === "Open" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("Resolved")}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold text-sm"
                    >
                      Resolve Discussion
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending..." : "Comment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </NewDashboardLayout>
  );
};

// Reply Card Component
const ReplyCard = ({ reply, isAuthor, currentUserId, onReaction, onMarkAsAnswer }) => {
  const reactionIcons = {
    like: { outline: HandThumbUpIcon, solid: HandThumbUpSolid, label: "👍" },
    love: { outline: HeartIcon, solid: HeartSolid, label: "❤️" },
    celebrate: { outline: FaceSmileIcon, solid: FaceSmileSolid, label: "🎉" },
    support: { outline: FireIcon, solid: FireSolid, label: "💪" },
  };

  const getReactionCount = (type) => {
    return reply.reactions?.filter((r) => r.type === type).length || 0;
  };

  const hasUserReacted = (type) => {
    return reply.reactions?.some((r) => r.user === currentUserId && r.type === type);
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border ${reply.isAnswer ? "border-green-500 dark:border-green-600" : "border-gray-200 dark:border-slate-700"} p-6`}>
      {/* Answer Badge */}
      {reply.isAnswer && (
        <div className="flex items-center gap-2 mb-4 text-green-600 dark:text-green-400">
          <CheckCircleIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">✓ Accepted Answer</span>
        </div>
      )}

      {/* Author Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={reply.author?.profileImageUrl || `https://ui-avatars.com/api/?name=${reply.author?.name}&background=10b981&color=fff&size=32`}
            alt={reply.author?.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {reply.author?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {moment(reply.createdAt).fromNow()}
            </p>
          </div>
        </div>
        {isAuthor && !reply.isAnswer && (
          <button
            onClick={() => onMarkAsAnswer(reply._id)}
            className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            Mark as Answer
          </button>
        )}
      </div>

      {/* Content */}
      <div className="prose dark:prose-invert max-w-none mb-4">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {reply.content}
        </p>
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
        {Object.entries(reactionIcons).map(([type, { outline: OutlineIcon, solid: SolidIcon, label }]) => {
          const count = getReactionCount(type);
          const hasReacted = hasUserReacted(type);
          const Icon = hasReacted ? SolidIcon : OutlineIcon;

          return (
            <button
              key={type}
              onClick={() => onReaction(reply._id, type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                hasReacted
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {count > 0 && <span className="font-semibold">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DiscussionDetail;
