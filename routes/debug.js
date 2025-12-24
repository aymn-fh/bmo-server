// Quick debug route to check specialist data
const express = require('express');
const router = express.Router();
const User = require('../models/User');

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

module.exports = router;
