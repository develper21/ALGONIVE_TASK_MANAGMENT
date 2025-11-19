import express from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import UserKey from '../models/UserKey.js';
import { authMiddleware } from '../utils/authMiddleware.js';
import { getIO } from '../utils/socket.js';
import {
  ensureConversationAccess,
  getAllowedParticipantIds,
  getTeamParticipantIds,
  persistEncryptedMessage
} from '../services/messagingService.js';

const router = express.Router();
const RETENTION_OPTIONS = ['7d', '30d'];
const DEFAULT_RETENTION = '7d';

const normalizeRetention = (value) => (RETENTION_OPTIONS.includes(value) ? value : DEFAULT_RETENTION);

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const loadTargetUser = async (userId) => {
  if (!isValidObjectId(userId)) {
    throw new Error('Invalid user id');
  }
  const user = await User.findById(userId).select('teams role');
  if (!user) {
    throw new Error('Target user not found');
  }
  return user;
};

const usersShareTeam = (userA, userB) => {
  const aTeams = new Set((userA.teams || []).map((id) => id.toString()));
  return (userB.teams || []).some((id) => aTeams.has(id.toString()));
};

const ensureDirectMessagingAllowed = async (requester, targetUserId) => {
  const targetUser = await loadTargetUser(targetUserId);

  if (requester.role === 'admin' || targetUser.role === 'admin') {
    return targetUser;
  }

  if (!usersShareTeam(requester, targetUser)) {
    throw new Error('Direct messages allowed only within shared teams');
  }

  return targetUser;
};

const conversationToResponse = (conversation, currentUserId) => ({
  id: conversation._id,
  type: conversation.type,
  team: conversation.team,
  participants: conversation.participants,
  lastMessageAt: conversation.lastMessageAt,
  retentionPolicy: conversation.retentionPolicy,
  createdAt: conversation.createdAt,
  metadata: {
    otherParticipant: conversation.type === 'direct'
      ? conversation.participants
          .map((id) => id.toString())
          .find((id) => id !== currentUserId.toString())
      : null
  }
});

router.post('/keys', authMiddleware, async (req, res) => {
  try {
    const { publicKey, deviceId = 'default', algorithm = 'x25519-aes-gcm' } = req.body;

    if (!publicKey) {
      return res.status(400).json({ success: false, message: 'publicKey is required' });
    }

    const keyDoc = await UserKey.findOneAndUpdate(
      { user: req.user._id, deviceId },
      { publicKey, algorithm, lastRotatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, key: keyDoc });
  } catch (error) {
    console.error('Register key error:', error);
    res.status(500).json({ success: false, message: 'Failed to register key' });
  }
});

router.post('/keys/lookup', authMiddleware, async (req, res) => {
  try {
    const { userIds = [] } = req.body;

    const normalized = userIds.filter(Boolean).filter((id) => isValidObjectId(id));
    if (!normalized.length) {
      return res.status(400).json({ success: false, message: 'userIds are required' });
    }

    const currentUser = await User.findById(req.user._id).select('teams role');

    const allowedUserIds = [];
    for (const userId of normalized) {
      if (userId === currentUser._id.toString()) {
        allowedUserIds.push(userId);
        continue;
      }

      const target = await loadTargetUser(userId);
      if (currentUser.role === 'admin' || target.role === 'admin' || usersShareTeam(currentUser, target)) {
        allowedUserIds.push(userId);
      }
    }

    const keys = await UserKey.find({ user: { $in: allowedUserIds } })
      .select('user deviceId publicKey algorithm updatedAt');

    res.json({ success: true, keys });
  } catch (error) {
    console.error('Lookup key error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch keys' });
  }
});

router.post('/conversations/direct', authMiddleware, async (req, res) => {
  try {
    const { participantId, retentionPolicy } = req.body;
    if (!participantId) {
      return res.status(400).json({ success: false, message: 'participantId is required' });
    }

    await ensureDirectMessagingAllowed(req.user, participantId);

    const sortedIds = [req.user._id.toString(), participantId].sort();

    let conversation = await Conversation.findOne({
      type: 'direct',
      participantsHash: sortedIds.join(':')
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: sortedIds.map((id) => new mongoose.Types.ObjectId(id)),
        participantsHash: sortedIds.join(':'),
        retentionPolicy: normalizeRetention(retentionPolicy),
        createdBy: req.user._id
      });
    }

    res.status(201).json({ success: true, conversation: conversationToResponse(conversation, req.user._id) });
  } catch (error) {
    console.error('Direct conversation error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create conversation' });
  }
});

router.post('/conversations/team', authMiddleware, async (req, res) => {
  try {
    const { teamId, retentionPolicy } = req.body;
    if (!teamId || !isValidObjectId(teamId)) {
      return res.status(400).json({ success: false, message: 'Valid teamId is required' });
    }

    const team = await Team.findById(teamId).select('members');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isMember = team.members.some((id) => id.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let conversation = await Conversation.findOne({ type: 'team', team: teamId });
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'team',
        team: teamId,
        createdBy: req.user._id,
        retentionPolicy: normalizeRetention(retentionPolicy)
      });
    }

    res.status(201).json({ success: true, conversation: conversationToResponse(conversation, req.user._id) });
  } catch (error) {
    console.error('Team conversation error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create conversation' });
  }
});

router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('teams role');
    const userId = user._id;

    const directQuery = { type: 'direct', participants: userId };

    const teamFilter = user.role === 'admin'
      ? {}
      : { team: { $in: user.teams } };

    const conversations = await Conversation.find({
      $or: [directQuery, { type: 'team', ...teamFilter }]
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    res.json({
      success: true,
      conversations: conversations.map((convo) => conversationToResponse(convo, userId))
    });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

router.patch('/conversations/:id/retention', authMiddleware, async (req, res) => {
  try {
    const { retentionPolicy } = req.body;
    if (!RETENTION_OPTIONS.includes(retentionPolicy)) {
      return res.status(400).json({ success: false, message: 'Invalid retention policy' });
    }

    const conversation = await ensureConversationAccess(req.user, req.params.id);

    if (conversation.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only creator or admin can change retention' });
    }

    conversation.retentionPolicy = retentionPolicy;
    await conversation.save();

    res.json({ success: true, conversation: conversationToResponse(conversation, req.user._id) });
  } catch (error) {
    console.error('Update retention error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update retention' });
  }
});

router.get('/conversations/:id/participants', authMiddleware, async (req, res) => {
  try {
    const conversation = await ensureConversationAccess(req.user, req.params.id);
    const participantIds = await getAllowedParticipantIds(conversation);

    const users = await User.find({ _id: { $in: participantIds } })
      .select('name email role avatar');

    const keys = await UserKey.find({ user: { $in: participantIds } })
      .select('user publicKey deviceId updatedAt');

    const keyMap = keys.reduce((acc, key) => {
      acc[key.user.toString()] = key;
      return acc;
    }, {});

    res.json({
      success: true,
      participants: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        publicKey: keyMap[user._id.toString()]?.publicKey || null,
        keyUpdatedAt: keyMap[user._id.toString()]?.updatedAt || null
      }))
    });
  } catch (error) {
    console.error('List conversation participants error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch participants' });
  }
});

router.get('/messages/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    await ensureConversationAccess(req.user, conversationId);

    const query = { conversation: conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId, ciphertext, iv, authTag, recipients, derivedKeyId, metadata } = req.body;

    if (!conversationId || !ciphertext || !iv || !authTag || !Array.isArray(recipients)) {
      return res.status(400).json({ success: false, message: 'Missing encryption payload fields' });
    }

    const conversation = await ensureConversationAccess(req.user, conversationId);

    const message = await persistEncryptedMessage({
      user: req.user,
      conversationId,
      conversation,
      ciphertext,
      iv,
      authTag,
      recipients,
      derivedKeyId,
      metadata
    });

    const payload = {
      conversationId,
      messageId: message._id,
      senderId: req.user._id,
      ciphertext,
      iv,
      authTag,
      createdAt: message.createdAt,
      metadata: metadata || {}
    };

    const io = getIO();
    if (io) {
      const targetRooms = new Set();
      targetRooms.add(`conversation:${conversationId}`);
      targetRooms.add(`user:${req.user._id}`);
      (recipients || []).forEach((id) => targetRooms.add(`user:${id}`));

      targetRooms.forEach((room) => io.to(room).emit('messaging:new', payload));
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send message' });
  }
});

router.get('/export/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await ensureConversationAccess(req.user, conversationId);

    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=conversation-${conversationId}-${Date.now()}.json`
    );

    res.send(JSON.stringify({
      conversation: conversationToResponse(conversation, req.user._id),
      count: messages.length,
      messages
    }));
  } catch (error) {
    console.error('Export conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to export conversation' });
  }
});

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { conversationId, senderId, from, to, limit = 100 } = req.query;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' });
    }

    await ensureConversationAccess(req.user, conversationId);

    const query = { conversation: conversationId };

    if (senderId && isValidObjectId(senderId)) {
      query.sender = senderId;
    }

    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        query.createdAt.$lte = new Date(to);
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to search messages' });
  }
});

export default router;
