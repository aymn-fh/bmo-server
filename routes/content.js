const express = require('express');
const router = express.Router();
const Exercise = require('../models/Exercise');
const { protect } = require('../middleware/auth');

async function getOrCreateContentDoc(childId) {
    return Exercise.findOneAndUpdate(
        { child: childId, kind: 'content' },
        { $setOnInsert: { child: childId, kind: 'content', active: true } },
        { new: true, upsert: true, runValidators: true }
    );
}

function asLegacyContentItem(item, contentType, childId) {
    return {
        _id: item._id,
        text: item.text,
        contentType,
        difficulty: item.difficulty,
        image: item.image,
        child: childId,
        createdBy: item.createdBy,
        createdAt: item.createdAt
    };
}

// @route   GET /api/content/child/:childId
// @desc    Get all content (words and letters) for a specific child
// @access  Private
router.get('/child/:childId', protect, async (req, res) => {
    try {
        const { childId } = req.params;
        const { contentType, difficulty } = req.query;

        const doc = await Exercise.findOne({ child: childId, kind: 'content' });

        const difficultyFilter = (item) => !difficulty || !['easy', 'medium', 'hard'].includes(difficulty) || item.difficulty === difficulty;

        const words = (doc?.contentWords || []).filter(difficultyFilter).map(i => asLegacyContentItem(i, 'word', childId));
        const letters = (doc?.contentLetters || []).filter(difficultyFilter).map(i => asLegacyContentItem(i, 'letter', childId));

        let content = [];
        if (contentType === 'word') content = words;
        else if (contentType === 'letter') content = letters;
        else content = [...words, ...letters];

        content.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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

        const doc = await Exercise.findOne({ child: childId, kind: 'content' });
        const difficultyFilter = (item) => !difficulty || !['easy', 'medium', 'hard'].includes(difficulty) || item.difficulty === difficulty;

        const words = (doc?.contentWords || [])
            .filter(difficultyFilter)
            .map(i => asLegacyContentItem(i, 'word', childId))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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

        const doc = await Exercise.findOne({ child: childId, kind: 'content' });
        const difficultyFilter = (item) => !difficulty || !['easy', 'medium', 'hard'].includes(difficulty) || item.difficulty === difficulty;

        const letters = (doc?.contentLetters || [])
            .filter(difficultyFilter)
            .map(i => asLegacyContentItem(i, 'letter', childId))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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

        const trimmed = text.trim();
        const doc = await getOrCreateContentDoc(childId);
        const targetArr = contentType === 'word' ? doc.contentWords : doc.contentLetters;

        const exists = targetArr.some(i => i.text === trimmed);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: `${contentType === 'word' ? 'Word' : 'Letter'} already exists for this child`
            });
        }

        const created = targetArr.create({
            text: trimmed,
            difficulty: difficulty || 'easy',
            createdBy: req.user.id
        });
        targetArr.push(created);
        await doc.save();

        const content = asLegacyContentItem(created, contentType, childId);

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

        const doc = await Exercise.findOne({
            kind: 'content',
            $or: [
                { 'contentWords._id': contentId },
                { 'contentLetters._id': contentId }
            ]
        });

        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        const wordItem = doc.contentWords?.id(contentId);
        const letterItem = doc.contentLetters?.id(contentId);

        if (wordItem) wordItem.deleteOne();
        if (letterItem) letterItem.deleteOne();

        await doc.save();

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

        const docQuery = { kind: 'content' };
        if (childId) docQuery.child = childId;

        const docs = await Exercise.find(docQuery)
            .populate('child', 'name age')
            .sort('-updatedAt');

        const difficultyOk = (item) => !difficulty || !['easy', 'medium', 'hard'].includes(difficulty) || item.difficulty === difficulty;

        let content = [];
        for (const doc of docs) {
            const childRef = doc.child?._id ? doc.child._id : doc.child;

            if (!contentType || contentType === 'word') {
                for (const item of (doc.contentWords || []).filter(difficultyOk)) {
                    const mapped = asLegacyContentItem(item, 'word', childRef);
                    mapped.child = doc.child;
                    content.push(mapped);
                }
            }

            if (!contentType || contentType === 'letter') {
                for (const item of (doc.contentLetters || []).filter(difficultyOk)) {
                    const mapped = asLegacyContentItem(item, 'letter', childRef);
                    mapped.child = doc.child;
                    content.push(mapped);
                }
            }
        }

        content.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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