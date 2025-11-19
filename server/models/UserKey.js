import mongoose from 'mongoose';

const userKeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publicKey: {
    type: String,
    required: true
  },
  algorithm: {
    type: String,
    default: 'x25519-aes-gcm'
  },
  deviceId: {
    type: String,
    default: 'default'
  },
  version: {
    type: Number,
    default: 1
  },
  lastRotatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userKeySchema.index({ user: 1, deviceId: 1 }, { unique: true });

const UserKey = mongoose.model('UserKey', userKeySchema);

export default UserKey;
