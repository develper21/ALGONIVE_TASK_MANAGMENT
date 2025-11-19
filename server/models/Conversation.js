import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'team'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  participantsHash: {
    type: String,
    default: null
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  retentionPolicy: {
    type: String,
    enum: ['7d', '30d'],
    default: '7d'
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  encryptionVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

conversationSchema.pre('save', function normalizeParticipants(next) {
  if (this.type === 'direct' && Array.isArray(this.participants) && this.participants.length === 2) {
    const sorted = this.participants
      .map(id => id.toString())
      .sort();

    this.participants = sorted.map(id => new mongoose.Types.ObjectId(id));
    this.participantsHash = sorted.join(':');
  }

  if (this.type === 'team') {
    this.participants = [];
    this.participantsHash = undefined;
  }

  next();
});

conversationSchema.index({ participantsHash: 1 }, { unique: true, sparse: true });
conversationSchema.index(
  { type: 1, team: 1 },
  { unique: true, partialFilterExpression: { type: 'team' } }
);
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
