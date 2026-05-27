import jwt from "jsonwebtoken";

let ioInstance = null;

//=======================
// SOCKET INITIALIZATION
//=======================
export const initSocket = (io) => {
  ioInstance = io;
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication failed!"));
      }

      //Remove Bearer if exists
      const cleanToken = token.replace("Bearer ", "");
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

      socket.user = {
        _id: decoded.userId,
        role: decoded.role,
      };

      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      next(new Error("Authentication failed!"));
    }
  });

  //===================
  // CONNECTION EVENTS
  //===================
  io.on("connection", (socket) => {
    try {
      const userId = socket.user._id.toString();
      console.log(`socket connected: ${socket.id} | User: ${userId}`);

      socket.join(userId);
      console.log(`User room joined: ${userId}`);

      socket.on("conversation:join", async (conversationId) => {
        try {
          if (!conversationId) return;
          socket.join(conversationId);
          console.log(`User ${userId} joined conversation ${conversationId}`);
        } catch (error) {
          console.error("Conversation join error:", error);
        }
      });

      socket.on("conversation:leave", async (conversationId) => {
        try {
          if (!conversationId) return;
          socket.leave(conversationId);
          console.log(`User ${userId} left conversation ${conversationId}`);
        } catch (error) {
          console.error("Conversation leave error:", error);
        }
      });

      socket.on("message:typing", ({ conversationId }) => {
        socket.to(conversationId).emit("message:typing", {
          userId,
        });
      });

      socket.on("message:stop-typing", ({ conversationId }) => {
        socket.to(conversationId).emit("message:stop-typing", {
          userId,
        });
      });

      socket.on("message:read", ({ conversationId }) => {
        socket.to(conversationId).emit("message:read", {
          userId,
        });
      });

      io.emit("user:online", {
        userId,
      });

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        io.emit("user:offline", {
          userId,
        });
      });
    } catch (error) {
      console.error("Socket connection error: ", error);
    }
  });

  console.log("Socket.IO initialized");
};

//=================
// GET IO INSTANCE
//=================
export const getIO = () => {
  if (!ioInstance) {
    throw new Error("socket.io not initialized");
  }
  return ioInstance;
};

//==================
// EMIT NEW MESSAGE
//==================
export const emitNewMessage = ({
  conversationId,
  message,
  participants = [],
}) => {
  if (!ioInstance) return;

  ioInstance.to(conversationId.toString()).emit("message:new", {
    conversationId,
    message,
  });
  participants.forEach((participant) => {
    ioInstance.to(participant.toString()).emit("conversation:update", {
      conversationId,
      message,
    });
  });
};

//=======================
// EMIT NEW CONVERSATION
//=======================
export const emitNewConversation = ({ participantsIds = [], conversation }) => {
  if (!ioInstance) return;

  participantsIds.forEach((participantId) => {
    ioInstance.to(participantId.toString()).emit("conversation:new", {
      conversation,
    });
  });
};

//===================
// EMIT UNREAD COUNT
//===================
export const emitUnreadCount = ({
  conversationId,
  unreadCount,
  participants = [],
}) => {
  if (!ioInstance) return;

  participants.forEach((participant) => {
    ioInstance.to(participant.toString()).emit("notification:unread-count", {
      conversationId,
      unreadCount,
    });
  });
};
