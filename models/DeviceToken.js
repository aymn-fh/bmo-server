const mongoose = require('mongoose');

const DeviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      default: 'unknown',
      enum: ['android', 'ios', 'web', 'unknown'],
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

DeviceTokenSchema.index({ user: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('DeviceToken', DeviceTokenSchema);
