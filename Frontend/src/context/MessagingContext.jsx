import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { messagingAPI } from "../services/api";
import {
  decryptMessagePayload,
  encryptMessagePayload,
  loadOrCreateKeyPair,
} from "../utils/crypto";

const MessagingContext = createContext(null);

export const SOCKET_EVENTS = {
  READY: "messaging:ready",
  NEW_MESSAGE: "messaging:new",
  LEGACY_NEW_MESSAGE: "messaging:new-message",
  ERROR: "messaging:error",
};

const getSocketBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
};

const mapParticipants = (participants = []) =>
  participants.reduce((acc, participant) => {
    const id = (participant.id || participant._id)?.toString();
    if (id) {
      acc[id] = { ...participant, id };
    }
    return acc;
  }, {});

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = (user?._id || user?.id)?.toString();
  const socketRef = useRef(null);
  const participantsRef = useRef({});

  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [messages, setMessages] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [participants, setParticipants] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [keyState, setKeyState] = useState({ ready: false, publicKey: null });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const decryptForCurrentUser = useCallback(
    async (message) => {
      if (!currentUserId) return message;

      try {
        const plaintext = await decryptMessagePayload({
          ciphertext: message.ciphertext,
          iv: message.iv,
          authTag: message.authTag,
          metadata: message.metadata,
          currentUserId,
        });
        return { ...message, plaintext };
      } catch (error) {
        console.error("Failed to decrypt message:", error);
        return message;
      }
    },
    [currentUserId],
  );

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return [];

    setLoadingConversations(true);
    try {
      const { data } = await messagingAPI.listConversations();
      const list = data.conversations || [];
      setConversations(list);
      return list;
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast.error(
        error.response?.data?.message || "Failed to load conversations",
      );
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUserId]);

  const fetchParticipants = useCallback(async (conversationId) => {
    const { data } = await messagingAPI.getParticipants(conversationId);
    const participantMap = mapParticipants(data.participants || []);

    setParticipants((prev) => ({
      ...prev,
      [conversationId]: participantMap,
    }));

    return participantMap;
  }, []);

  const fetchMessages = useCallback(
    async (conversationId) => {
      setLoadingMessages(true);
      try {
        const { data } = await messagingAPI.getMessages(conversationId);
        const decrypted = await Promise.all(
          (data.messages || []).map((message) =>
            decryptForCurrentUser(message),
          ),
        );

        setMessages((prev) => ({
          ...prev,
          [conversationId]: decrypted,
        }));

        return decrypted;
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        toast.error(error.response?.data?.message || "Failed to load messages");
        return [];
      } finally {
        setLoadingMessages(false);
      }
    },
    [decryptForCurrentUser],
  );

  const joinConversation = useCallback(
    async (conversationId) => {
      if (!conversationId) return null;

      setActiveConversationId(conversationId);
      await fetchParticipants(conversationId);
      await fetchMessages(conversationId);

      if (socketRef.current?.connected) {
        socketRef.current.emit("conversations:join", conversationId);
        setUnreadCounts((prev) => ({
          ...prev,
          [conversationId]: 0,
        }));
      }

      return conversationId;
    },
    [fetchMessages, fetchParticipants],
  );

  const handleIncomingMessage = useCallback(
    async ({ conversationId, message }) => {
      if (!conversationId || !message) return;

      const normalized = {
        ...message,
        _id: message.messageId || message._id,
        sender: message.senderId || message.sender,
      };

      const decrypted = await decryptForCurrentUser(normalized);

      setMessages((prev) => {
        const existing = prev[conversationId] || [];

        const alreadyExists = existing.some(
          (msg) =>
            (msg._id || msg.messageId)?.toString() ===
            (decrypted._id || decrypted.messageId)?.toString(),
        );

        if (alreadyExists) return prev;

        return {
          ...prev,
          [conversationId]: [...existing, decrypted],
        };
      });

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessageAt: decrypted.createdAt || new Date().toISOString(),
              }
            : conversation,
        ),
      );

      // unread counter
      if (activeConversationId !== conversationId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));
      }
    },
    [decryptForCurrentUser, activeConversationId],
  );

  const connectSocket = useCallback(() => {
    if (!currentUserId || socketRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(getSocketBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setIsSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connect error:", error.message);
      setIsSocketConnected(false);
    });

    socket.on("messaging:presence", ({ onlineUserIds = [] } = {}) => {
      setOnlineUserIds(onlineUserIds.map((id) => id.toString()));
    });

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleIncomingMessage);
    socket.on(SOCKET_EVENTS.LEGACY_NEW_MESSAGE, handleIncomingMessage);
    socket.on(SOCKET_EVENTS.ERROR, (payload) => {
      console.error("Socket error payload:", payload);
    });

    socket.on("conversation:new", ({ conversation }) => {
      if (!conversation) return;

      setConversations((prev) => {
        const exists = prev.some((item) => item.id === conversation.id);

        if (exists) return prev;
        return [conversation, ...prev];
      });

      toast.success("New conversation started");
    });

    socket.on("conversation:update", ({ conversationId, message }) => {
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessageAt: message?.createAt || new Date().toISOString(),
              }
            : conversation,
        ),
      );
    });

    socket.on("user:online", ({ userId }) => {
      setOnlineUserIds((prev) => {
        if (prev.includes(userId)) return prev;

        return [...prev, userId];
      });
    });

    socket.on("user:offline", ({ userId }) => {
      setOnlineUserIds((prev) => prev.filter((id) => id !== userId));
    });

    socket.on("message:typing", ({ userId, conversationId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: userId,
      }));
    });

    socket.on("message:stopTyping", ({ conversationId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: null,
      }));
    });

    socketRef.current = socket;
  }, [currentUserId, handleIncomingMessage]);

  const disconnectSocket = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.disconnect();
    socketRef.current = null;
    setIsSocketConnected(false);
  }, []);

  const initializeMessaging = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { publicKey } = await loadOrCreateKeyPair();
      await messagingAPI.registerKey({ publicKey });
      setKeyState({ ready: true, publicKey });
      await fetchConversations();
      connectSocket();
    } catch (error) {
      console.error("Failed to initialize secure messaging:", error);
      setKeyState({ ready: false, publicKey: null });
      toast.error("Secure messaging setup failed");
    }
  }, [connectSocket, currentUserId, fetchConversations]);

  useEffect(() => {
    if (currentUserId) {
      initializeMessaging();
    } else {
      setConversations([]);
      setMessages({});
      setParticipants({});
      setActiveConversationId(null);
      setKeyState({ ready: false, publicKey: null });
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [currentUserId, disconnectSocket, initializeMessaging]);

  const createDirectConversation = useCallback(async (payload) => {
    const { data } = await messagingAPI.createDirectConversation(payload);
    const conversation = data.conversation;
    setConversations((prev) => {
      const exists = prev.some((item) => item.id === conversation.id);
      return exists
        ? prev.map((item) =>
            item.id === conversation.id ? conversation : item,
          )
        : [conversation, ...prev];
    });
    return conversation;
  }, []);

  const createTeamConversation = useCallback(async (payload) => {
    const { data } = await messagingAPI.createTeamConversation(payload);
    const conversation = data.conversation;
    setConversations((prev) => {
      const exists = prev.some((item) => item.id === conversation.id);
      return exists
        ? prev.map((item) =>
            item.id === conversation.id ? conversation : item,
          )
        : [conversation, ...prev];
    });
    return conversation;
  }, []);

  const sendEncryptedMessage = useCallback(
    async (conversationId, plaintext) => {
      if (!conversationId || !plaintext?.trim() || !currentUserId) return null;

      const participantMap =
        participantsRef.current[conversationId] ||
        (await fetchParticipants(conversationId));
      const recipientIds = Object.keys(participantMap).filter(
        (id) => id !== currentUserId,
      );

      const encryptedPayload = await encryptMessagePayload({
        plaintext,
        participantMap,
        recipientIds,
        senderId: currentUserId,
      });

      const { data } = await messagingAPI.sendMessage({
        conversationId,
        recipients: recipientIds,
        ...encryptedPayload,
      });

      const decrypted = await decryptForCurrentUser(data.message);
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), decrypted],
      }));

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessageAt: decrypted.createAt || new Date().toISOString(),
              }
            : conversation,
        ),
      );
      return decrypted;
    },
    [
      currentUserId,
      decryptForCurrentUser,
      fetchConversations,
      fetchParticipants,
    ],
  );

  const updateConversationRetention = useCallback(
    async (conversationId, retentionPolicy) => {
      const { data } = await messagingAPI.updateRetention(conversationId, {
        retentionPolicy,
      });
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? data.conversation : conversation,
        ),
      );
      return data.conversation;
    },
    [],
  );

  const exportConversation = useCallback(async (conversationId) => {
    const response = await messagingAPI.exportConversation(conversationId);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `conversation-${conversationId}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const searchConversationMessages = useCallback(async (params) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== "" && value !== null && value !== undefined,
      ),
    );
    const { data } = await messagingAPI.searchMessages(cleanParams);
    return data.messages || [];
  }, []);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) || null,
    [activeConversationId, conversations],
  );

  const unreadMessageCount = Object.values(unreadCounts).reduce(
    (total, count) => total + count,
    0,
  );

  return (
    <MessagingContext.Provider
      value={{
        socket: socketRef.current,
        socketRef,
        isSocketConnected,
        onlineUserIds,
        conversations,
        loadingConversations,
        messages,
        loadingMessages,
        participants,
        keyState,
        activeConversationId,
        activeConversation,
        connectSocket,
        disconnectSocket,
        fetchConversations,
        joinConversation,
        createDirectConversation,
        createTeamConversation,
        sendEncryptedMessage,
        updateConversationRetention,
        exportConversation,
        searchConversationMessages,
        unreadCounts,
        unreadMessageCount,
        typingUsers,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return context;
};
