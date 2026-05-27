import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

const RETENTION_DAYS = {
  '7d': 7,
  '30d': 30
};

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const normalizeObjectIdList = (ids = []) => {
  const seen = new Set();
  const normalized = [];

  ids.forEach((value) => {
    if (!value) return;
    const stringValue = value.toString();
    if (!isObjectId(stringValue)) return;
    if (!seen.has(stringValue)) {
      seen.add(stringValue);
      normalized.push(stringValue);
    }
  });

  return normalized;
};

const getExpiryFromPolicy = (policy = '7d') => {
  const days = RETENTION_DAYS[policy] || RETENTION_DAYS['7d'];
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return { expiresAt, policy: days === RETENTION_DAYS['30d'] ? '30d' : '7d' };
};

export const ensureConversationAccess = async (user, conversationId) => {
  if (!isObjectId(conversationId)) {
    throw new Error('Invalid conversation id');
  }

  const conversation = await Conversation.findById(conversationId).populate('team', 'name color members');

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const userId = user._id.toString();

  if (conversation.type === 'direct') {
    const participantIds = conversation.participants.map((id) => id.toString());
    if (!participantIds.includes(userId)) {
      throw new Error('Access denied');
    }
  } else {
    if (!conversation.team) {
      throw new Error('Conversation team missing');
    }

    if (user.role !== 'admin') {
      const teamIds = (user.teams || []).map((id) => id.toString());
      if (!teamIds.includes(conversation.team._id.toString())) {
        throw new Error('Access denied');
      }
    }
  }

  return conversation;
};

export const getTeamParticipantIds = async (teamId) => {
  const team = await Team.findById(teamId).select('members');
  if (!team) {
    throw new Error('Team not found');
  }

  const admins = await User.find({ role: 'admin' }).select('_id');

  const memberIds = team.members.map((id) => id.toString());
  const adminIds = admins.map((admin) => admin._id.toString());

  const unique = new Set([...memberIds, ...adminIds]);
  return Array.from(unique);
};

export const getAllowedParticipantIds = async (conversation) => {
  if (conversation.type === 'direct') {
    return conversation.participants.map((id) => id.toString());
  }

  if (!conversation.team) {
    throw new Error('Conversation team missing');
  }

  return getTeamParticipantIds(conversation.team._id || conversation.team);
};

export const persistEncryptedMessage = async ({
  user,
  conversationId,
  conversation,
  ciphertext,
  iv,
  authTag,
  recipients,
  derivedKeyId,
  metadata
}) => {
  const senderId = user._id.toString();

  const convo = conversation || await ensureConversationAccess(user, conversationId);
  const allowedParticipantIds = await getAllowedParticipantIds(convo);

  if (!allowedParticipantIds.includes(senderId)) {
    throw new Error('Sender is not part of the conversation');
  }

  const normalizedRecipients = normalizeObjectIdList(recipients);
  const requiredRecipients = allowedParticipantIds.filter((id) => id !== senderId);

  if (requiredRecipients.length > 0 && !normalizedRecipients.length) {
    throw new Error('Recipients are required');
  }

  const missingRecipients = requiredRecipients.filter((id) => !normalizedRecipients.includes(id));
  if (missingRecipients.length) {
    throw new Error('Recipients list must include all allowed participants');
  }

  if (normalizedRecipients.length !== requiredRecipients.length) {
    throw new Error('Recipients list contains invalid participants');
  }

  const { expiresAt, policy } = getExpiryFromPolicy(convo.retentionPolicy);

  const message = await Message.create({
    conversation: convo._id,
    sender: user._id,
    recipients: normalizedRecipients.map(toObjectId),
    ciphertext,
    iv,
    authTag,
    derivedKeyId: derivedKeyId || null,
    metadata: metadata || {},
    retentionPolicy: policy,
    expiresAt
  });

  convo.lastMessageAt = new Date();
  await convo.save();

  return message;
};
