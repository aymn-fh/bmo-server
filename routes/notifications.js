const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const DeviceToken = require('../models/DeviceToken');

// POST /api/notifications/device-token
// Register (or refresh) a device token for push notifications
router.post('/device-token', protect, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'token is required',
      });
    }

    const cleanToken = token.trim();
    const cleanPlatform =
      platform === 'android' || platform === 'ios' || platform === 'web'
        ? platform
        : 'unknown';

    await DeviceToken.updateOne(
      { user: req.user.id, token: cleanToken },
      {
        $set: {
          platform: cleanPlatform,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true }
    );

    return res.json({ success: true });
  } catch (e) {
    console.error('Error registering device token:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/notifications/device-token
// Unregister a device token
router.delete('/device-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    await DeviceToken.deleteOne({ user: req.user.id, token: token.trim() });
    return res.json({ success: true });
  } catch (e) {
    console.error('Error unregistering device token:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
