const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const { protect } = require('../middleware/auth');

// Get words for a specific child
router.get('/child/:childId', protect, async (req, res) => {
    try {
        const { childId } = req.params;

        const words = await Word.find({ child: childId }).sort('-createdAt');

        res.json({
            success: true,
            words
        });
    } catch (error) {
        console.error('Error fetching words:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching words'
        });
    }
});

// Get all words (for admin/specialist)
router.get('/', protect, async (req, res) => {
    try {
        const words = await Word.find().populate('child', 'name').sort('-createdAt');

        res.json({
            success: true,
            words
        });
    } catch (error) {
        console.error('Error fetching words:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching words'
        });
    }
});

module.exports = router;
