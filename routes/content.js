const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const { protect } = require('../middleware/auth');

// @route   GET /api/content/child/:childId
// @desc    Get all content (words and letters) for a specific child
// @access  Private
router.get('/child/:childId', protect, async (req, res) => {
    try {
        const { childId } = req.params;
        const { contentType, difficulty } = req.query;

        let query = { child: childId };
        
        // Filter by content type if specified
        if (contentType && ['word', 'letter'].includes(contentType)) {
            query.contentType = contentType;
        }
        
        // Filter by difficulty if specified
        if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
            query.difficulty = difficulty;
        }

        const content = await Word.find(query).sort('-createdAt');

        res.json({
            success: true,
            content,
            count: content.length
        });
    } catch (error) {
        console.error('Error fetching content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching content'
        });
    }
});

// @route   GET /api/content/words/child/:childId
// @desc    Get words for a specific child
// @access  Private
router.get('/words/child/:childId', protect, async (req, res) => {
    try {
        const { childId } = req.params;
        const { difficulty } = req.query;

        let query = { child: childId, contentType: 'word' };
        
        if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
            query.difficulty = difficulty;
        }

        const words = await Word.find(query).sort('-createdAt');

        res.json({
            success: true,
            words,
            count: words.length
        });
    } catch (error) {
        console.error('Error fetching words:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching words'
        });
    }
});

// @route   GET /api/content/letters/child/:childId
// @desc    Get letters for a specific child
// @access  Private
router.get('/letters/child/:childId', protect, async (req, res) => {
    try {
        const { childId } = req.params;
        const { difficulty } = req.query;

        let query = { child: childId, contentType: 'letter' };
        
        if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
            query.difficulty = difficulty;
        }

        const letters = await Word.find(query).sort('-createdAt');

        res.json({
            success: true,
            letters,
            count: letters.length
        });
    } catch (error) {
        console.error('Error fetching letters:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching letters'
        });
    }
});

// @route   POST /api/content/add
// @desc    Add new content (word or letter)
// @access  Private
router.post('/add', protect, async (req, res) => {
    try {
        const { text, contentType, difficulty, childId } = req.body;

        // Validate required fields
        if (!text || !contentType || !childId) {
            return res.status(400).json({
                success: false,
                message: 'Text, content type, and child ID are required'
            });
        }

        // Validate content type
        if (!['word', 'letter'].includes(contentType)) {
            return res.status(400).json({
                success: false,
                message: 'Content type must be either "word" or "letter"'
            });
        }

        // Validate difficulty
        if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).json({
                success: false,
                message: 'Difficulty must be easy, medium, or hard'
            });
        }

        // Validate text length based on content type
        if (contentType === 'letter' && text.length > 1) {
            return res.status(400).json({
                success: false,
                message: 'Letter must be a single character'
            });
        }

        if (contentType === 'word' && text.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Word must not exceed 20 characters'
            });
        }

        // Create the content
        const content = await Word.create({
            text: text.trim(),
            contentType,
            difficulty: difficulty || 'easy',
            child: childId,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: `${contentType === 'word' ? 'Word' : 'Letter'} added successfully`,
            content
        });
    } catch (error) {
        console.error('Error adding content:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding content'
        });
    }
});

// @route   DELETE /api/content/delete/:contentId
// @desc    Delete content by ID
// @access  Private
router.delete('/delete/:contentId', protect, async (req, res) => {
    try {
        const { contentId } = req.params;

        const content = await Word.findById(contentId);

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        await Word.findByIdAndDelete(contentId);

        res.json({
            success: true,
            message: 'Content deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting content:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting content'
        });
    }
});

// @route   GET /api/content/all
// @desc    Get all content (for admin/specialist)
// @access  Private
router.get('/all', protect, async (req, res) => {
    try {
        const { contentType, difficulty, childId } = req.query;

        let query = {};
        
        if (contentType && ['word', 'letter'].includes(contentType)) {
            query.contentType = contentType;
        }
        
        if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
            query.difficulty = difficulty;
        }

        if (childId) {
            query.child = childId;
        }

        const content = await Word.find(query)
            .populate('child', 'name age')
            .sort('-createdAt');

        res.json({
            success: true,
            content,
            count: content.length
        });
    } catch (error) {
        console.error('Error fetching all content:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching content'
        });
    }
});

module.exports = router;