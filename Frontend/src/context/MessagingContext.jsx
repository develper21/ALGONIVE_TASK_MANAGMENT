import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { messagingAPI } from '../services/api';
import { useAuth } from './AuthContext';
import {
  loadOrCreateKeyPair,
  encryptMessagePayload,
  decryptMessagePayload,
  getSocketBaseUrl
} from '../utils/crypto';

const MessagingContext = createContext(null);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within MessagingProvider');
  }
  return context;
};

const SOCKET_EVENTS = {
  READY: 'messaging:ready',
  NEW_MESSAGE: 'messaging:new',
  JOIN: 'messaging:join',
  JOINED: 'messaging:joined',
  LEAVE: 'messaging:leave',
  ERROR: 'messaging:error'
};

const DEVICE_ID = 'web-default';

export const MessagingProvider = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState({});
  const [participants, setParticipants] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [keyState, setKeyState] = useState({ ready: false, publicKey: null });
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const socketRef = useRef(null);

  const socketBaseUrl = useMemo(() => getSocketBaseUrl(), []);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const upsertConversation = (nextConversation) => {
    setConversations((prev) => {
      const exists = prev.some((conversation) => conversation.id === nextConversation.id);
      if (exists) {
        return prev.map((conversation) =>
          conversation.id === nextConversation.id ? { ...conversation, ...nextConversation } : conversation
        );
      }
      return [nextConversation, ...prev];
    });
  };

  useEffect(() => {
    if (!user) {
      resetState();
      return;
    }

    (async () => {
      await bootstrapKeys();
      await fetchConversations();
      connectSocket();
    })();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  const resetState = () => {
    setConversations([]);
    setActiveConversationId(null);
    setMessages({});
    setParticipants({});
    setKeyState({ ready: false, publicKey: null });
  };

  const bootstrapKeys = async () => {
    try {
      const { publicKey } = await loadOrCreateKeyPair();
      await messagingAPI.registerKey({
        publicKey,
        deviceId: DEVICE_ID,
        algorithm: 'x25519-aes-gcm'
      });
      setKeyState({ ready: true, publicKey });
    } catch (error) {
      console.error('Failed to bootstrap keys', error);
      toast.error('Unable to initialize secure messaging keys');
    }
  };

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const { data } = await messagingAPI.listConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations', error);
      toast.error('Unable to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  const connectSocket = () => {
    if (!user || socketRef.current) {
      return;
    }

    const token = localStorage.getItem('token');
    const baseUrl = getSocketBaseUrl();
    console.log('Connecting to socket with URL:', baseUrl);
    console.log('Token present:', !!token);
    
    // Ensure we have the correct socket URL (without /api)
    const socketUrl = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
    console.log('Final socket URL:', socketUrl);
    
    // Try connection without authentication first to bypass the namespace error
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connect error', error);
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        type: error.type,
        context: error.context
      });
      
      if (error.message === 'Invalid namespace') {
        console.log('Namespace error - trying with authentication...');
        // Try with authentication as fallback
        setTimeout(() => {
          const authSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: true
          });
          
          authSocket.on('connect', () => {
            console.log('Connected with authentication:', authSocket.id);
            socketRef.current = authSocket;
          });
          
          authSocket.on('connect_error', (err) => {
            console.error('Auth connection also failed:', err);
            toast.error('Socket connection failed - please refresh the page');
          });
        }, 2000);
      } else {
        toast.error('Messaging realtime connection failed');
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully:', socket.id);
      console.log('Transport:', socket.io.engine.transport.name);
      
      // Try to authenticate after connection
      if (token) {
        socket.emit('authenticate', { token });
      }
    });

    socket.on(SOCKET_EVENTS.READY, () => {
      console.log('Socket ready for messaging');
      // Rejoin active conversation if needed
      if (activeConversationId) {
        socket.emit(SOCKET_EVENTS.JOIN, { conversationId: activeConversationId });
      }
    });

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, handleIncomingMessage);
    socket.on('messaging:presence', ({ onlineUserIds: nextOnlineIds = [] } = {}) => {
      setOnlineUserIds(nextOnlineIds.map((id) => id.toString()));
    });
    socket.on(SOCKET_EVENTS.ERROR, (payload) => {
      console.error('Messaging error', payload);
    });

    socketRef.current = socket;
  };

  const handleIncomingMessage = async (payload) => {
    const { conversationId, messageId } = payload;

    if (!currentUserId) return;

    try {
      const decrypted = await decryptMessagePayload({
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        authTag: payload.authTag,
        metadata: payload.metadata,
        currentUserId: currentUserId.toString()
      });
      setMessages((prev) => {
        const list = prev[conversationId] || [];
        if (list.some((msg) => msg.messageId === messageId)) {
          return prev;
        }
        return {
          ...prev,
          [conversationId]: [...list, { ...payload, plaintext: decrypted }]
        };
      });
      setConversations((prev) => prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, lastMessageAt: payload.createdAt }
          : conversation
      ));
    } catch (error) {
      console.error('Failed to decrypt message', error);
    }
  };

  const joinConversation = async (conversationId) => {
    if (!conversationId) return;

    try {
      setActiveConversationId(conversationId);
      await fetchParticipants(conversationId);
      await fetchMessages(conversationId);
      if (socketRef.current) {
        socketRef.current.emit(SOCKET_EVENTS.JOIN, { conversationId });
      }
    } catch (error) {
      console.error('Failed to join conversation', error);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit(SOCKET_EVENTS.LEAVE, { conversationId });
    }
  };

  const fetchParticipants = async (conversationId) => {
    try {
      const { data } = await messagingAPI.getParticipants(conversationId);
      const keyed = data.participants.reduce((acc, participant) => {
        acc[participant.id] = participant;
        return acc;
      }, {});
      setParticipants((prev) => ({ ...prev, [conversationId]: keyed }));
    } catch (error) {
      console.error('Failed to load participants', error);
      toast.error('Unable to load conversation participants');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      setLoadingMessages(true);
      const { data } = await messagingAPI.getMessages(conversationId);
      const decrypted = await Promise.all(
        (data.messages || []).map(async (msg) => {
          try {
            const plaintext = await decryptMessagePayload({
              ciphertext: msg.ciphertext,
              iv: msg.iv,
              authTag: msg.authTag,
              metadata: msg.metadata,
              currentUserId: currentUserId?.toString()
            });
            return { ...msg, plaintext };
          } catch (error) {
            console.error('Failed to decrypt historical message', error);
            return msg;
          }
        })
      );

      setMessages((prev) => ({ ...prev, [conversationId]: decrypted }));
    } catch (error) {
      console.error('Failed to load messages', error);
      toast.error('Unable to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const createDirectConversation = async ({ participantId, retentionPolicy }) => {
    const { data } = await messagingAPI.createDirectConversation({ participantId, retentionPolicy });
    upsertConversation(data.conversation);
    return data.conversation;
  };

  const createTeamConversation = async ({ teamId, retentionPolicy }) => {
    const { data } = await messagingAPI.createTeamConversation({ teamId, retentionPolicy });
    upsertConversation(data.conversation);
    return data.conversation;
  };

  const updateConversationRetention = async (conversationId, retentionPolicy) => {
    const { data } = await messagingAPI.updateRetention(conversationId, { retentionPolicy });
    upsertConversation(data.conversation);
    toast.success('Retention policy updated');
    return data.conversation;
  };

  const exportConversation = async (conversationId) => {
    const response = await messagingAPI.exportConversation(conversationId);
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-${conversationId}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const searchConversationMessages = async ({ conversationId, senderId, from, to, limit }) => {
    const params = { conversationId, senderId, from, to, limit };
    const { data } = await messagingAPI.searchMessages(params);
    return data.messages || [];
  };

  const sendEncryptedMessage = async (conversationId, plaintext) => {
    if (!conversationId || !plaintext?.trim()) {
      return;
    }

    try {
      const participantMap = participants[conversationId] || {};
      const recipientIds = Object.keys(participantMap).filter((id) => id !== currentUserId?.toString());

      if (!recipientIds.length) {
        throw new Error('No recipients available');
      }

      if (!keyState.ready) {
        throw new Error('Encryption keys not ready');
      }

      const enrichedParticipantMap = {
        ...participantMap,
        [currentUserId]: {
          ...(participantMap[currentUserId] || {}),
          publicKey: keyState.publicKey
        }
      };

      const encryptionResult = await encryptMessagePayload({
        plaintext,
        recipientIds,
        participantMap: enrichedParticipantMap,
        senderId: currentUserId?.toString()
      });

      const payload = {
        conversationId,
        ciphertext: encryptionResult.ciphertext,
        iv: encryptionResult.iv,
        authTag: encryptionResult.authTag,
        recipients: recipientIds,
        metadata: encryptionResult.metadata
      };

      await messagingAPI.sendMessage(payload);
    } catch (error) {
      console.error('Failed to send message', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  const value = {
    conversations,
    loadingConversations,
    messages,
    loadingMessages,
    participants,
    keyState,
    onlineUserIds,
    activeConversationId,
    activeConversation,
    joinConversation,
    leaveConversation,
    sendEncryptedMessage,
    fetchConversations,
    createDirectConversation,
    createTeamConversation,
    updateConversationRetention,
    exportConversation,
    searchConversationMessages,
    setActiveConversationId,
    setOnlineUserIds,
    socketRef
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};
