// Quick debug route to check specialist data
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Debug route - minimal config status (no secrets)
router.get('/config', (req, res) => {
    res.json({
        ok: true,
        env: process.env.NODE_ENV || 'unknown',
        jwt: {
            configured: !!process.env.JWT_SECRET,
            expireConfigured: !!process.env.JWT_EXPIRE,
        },
        db: {
            mongoConfigured: !!(process.env.MONGODB_URI || process.env.MONGO_URI),
        },
        serverTime: new Date().toISOString(),
    });
});

// Debug route - check specialist's linked parents
router.get('/debug/specialist/:email', async (req, res) => {
    try {
        const specialist = await User.findOne({ email: req.params.email })
            .populate('linkedParents', 'name email phone');

        if (!specialist) {
            return res.json({ error: 'Specialist not found' });
        }

        res.json({
            email: specialist.email,
            name: specialist.name,
            role: specialist.role,
            linkedParentsCount: specialist.linkedParents ? specialist.linkedParents.length : 0,
            linkedParents: specialist.linkedParents || []
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Debug route - check all parents
router.get('/debug/parents', async (req, res) => {
    try {
        const parents = await User.find({ role: 'parent' })
            .select('name email linkedSpecialist');

        res.json({
            count: parents.length,
            parents
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Debug route - list uploaded files
const fs = require('fs');
const path = require('path');

router.get('/uploads', (req, res) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
        if (!fs.existsSync(uploadDir)) {
            return res.json({ error: 'Uploads directory does not exist', files: [] });
        }
        const files = fs.readdirSync(uploadDir);
        res.json({ count: files.length, files });
    } catch (e) {
        res.json({ error: e.message });
    }
});

module.exports = router;
