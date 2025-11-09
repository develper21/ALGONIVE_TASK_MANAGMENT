import React, { useState, useEffect, useRef, useContext } from "react";
import { BsSend, BsTrash } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { useNotification } from "../context/NotificationContext";
import { UserContext } from "../context/userContext";

const TaskDiscussion = ({ taskId, taskTitle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { addNotification } = useNotification();
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (taskId) {
      fetchMessages();
      // Poll for new messages every 10 seconds
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!taskId) return;
    
    try {
      const response = await axiosInstance.get(
        API_PATHS.MESSAGES.GET_TASK_MESSAGES(taskId)
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await axiosInstance.post(API_PATHS.MESSAGES.SEND_MESSAGE, {
        taskId,
        content: newMessage.trim(),
      });

      setMessages((prev) => [...prev, response.data.data]);
      setNewMessage("");
      addNotification({
        message: "Message sent successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      addNotification({
        message: error.response?.data?.message || "Failed to send message",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      await axiosInstance.delete(API_PATHS.MESSAGES.DELETE_MESSAGE(messageId));
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      addNotification({
        message: "Message deleted successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      addNotification({
        message: "Failed to delete message",
        type: "error",
      });
    }
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - messageDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    // Show date if older than 24 hours
    const isToday = messageDate.toDateString() === now.toDateString();
    if (isToday) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          💬 Discussion
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Discuss about "{taskTitle}"
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Start the discussion!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.sender._id === user?._id;
              return (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      isOwnMessage ? "items-end" : "items-start"
                    } flex flex-col gap-1`}
                  >
                    {/* Sender Info */}
                    {!isOwnMessage && (
                      <div className="flex items-center gap-2 px-2">
                        <img
                          src={message.sender.profileDisplayUrl || message.sender.profileImageUrl}
                          alt={message.sender.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          {message.sender.name}
                          {message.sender.role === "admin" && (
                            <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative group rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      {/* Delete Button (only for own messages or admin) */}
                      {(isOwnMessage || user?.role === "admin") && (
                        <button
                          onClick={() => handleDeleteMessage(message._id)}
                          className={`absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${
                            isOwnMessage
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-red-100 hover:bg-red-200 text-red-600"
                          }`}
                        >
                          <BsTrash className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span
                      className={`text-xs text-gray-400 px-2 ${
                        isOwnMessage ? "text-right" : "text-left"
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows="2"
              maxLength="2000"
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {newMessage.length}/2000
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-fit"
          >
            <BsSend className="w-4 h-4" />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskDiscussion;
