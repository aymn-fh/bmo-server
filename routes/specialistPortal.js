const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const Child = require('../models/Child');
const User = require('../models/User');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');
const LinkRequest = require('../models/LinkRequest');

// @route   GET /api/specialist/dashboard
// @desc    Get specialist dashboard stats
// @access  Private (Specialist)
router.get('/dashboard', protect, async (req, res) => {
    try {
        const specialistId = req.user.id;

        const [childrenCount, linkRequestsCount, linkedParentsCount, assignedChildrenIds] = await Promise.all([
            Child.countDocuments({ assignedSpecialist: specialistId }),
            LinkRequest.countDocuments({ to: specialistId, status: 'pending' }),
            User.findById(specialistId).then(user => user.linkedParents ? user.linkedParents.length : 0),
            Child.find({ assignedSpecialist: specialistId }).select('_id').lean()
        ]);

        const childIds = (assignedChildrenIds || []).map(c => c._id);
        let sessionsCount = 0;
        if (childIds.length > 0) {
            const sessionsAgg = await Progress.aggregate([
                { $match: { child: { $in: childIds } } },
                { $project: { sessionCount: { $size: { $ifNull: ['$sessions', []] } } } },
                { $group: { _id: null, total: { $sum: '$sessionCount' } } }
            ]);
            sessionsCount = sessionsAgg && sessionsAgg.length > 0 ? sessionsAgg[0].total : 0;
        }

        // Get recent 5 children
        let recentChildren = [];
        try {
            // Get children as plain objects
            recentChildren = await Child.find({ assignedSpecialist: specialistId })
                .sort('-createdAt')
                .limit(5)
                .lean();

            // Manually populate parents to avoid Schema reference issues
            const parentIds = recentChildren
                .map(c => c.parent)
                .filter(id => id); // Filter out null/undefined

            if (parentIds.length > 0) {
                const parents = await User.find({ _id: { $in: parentIds } })
                    .select('name email phone profilePhoto staffId')
                    .lean();

                // Create a map for faster lookup
                const parentMap = {};
                parents.forEach(p => {
                    parentMap[p._id.toString()] = p;
                });

                // Attach parent objects to children
                recentChildren.forEach(child => {
                    if (child.parent && parentMap[child.parent.toString()]) {
                        child.parent = parentMap[child.parent.toString()];
                    }
                });
            }
        } catch (err) {
            console.error('Error fetching recent children:', err);
            // Don't fail the whole dashboard
        }

        res.json({
            success: true,
            stats: {
                children: childrenCount,
                pendingRequests: linkRequestsCount,
                parents: linkedParentsCount,
                sessions: sessionsCount
            },
            recentChildren
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats'
        });
    }
});

// @route   GET /api/specialist/words
// @desc    Get specialist words management page data
// @access  Private (Specialist)
router.get('/words', protect, async (req, res) => {
    try {
        const { childId, contentType, difficulty } = req.query;

        // If childId is provided, get content for that child
        if (childId) {
            // Verify the child is assigned to this specialist
            const child = await Child.findById(childId);
            if (!child || child.assignedSpecialist.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this child'
                });
            }

            // Build query for content
            let query = { child: childId };
            if (contentType && ['word', 'letter'].includes(contentType)) {
                query.contentType = contentType;
            }
            if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
                query.difficulty = difficulty;
            }

            // Get content based on type
            let words = [];
            let letters = [];

            if (!contentType || contentType === 'word') {
                words = await Word.find({ ...query, contentType: 'word' }).sort('-createdAt');
            }
            if (!contentType || contentType === 'letter') {
                letters = await Word.find({ ...query, contentType: 'letter' }).sort('-createdAt');
            }

            res.json({
                success: true,
                mode: 'manage_child',
                child: {
                    _id: child._id,
                    name: child.name,
                    age: child.age
                },
                words,
                letters,
                contentType: contentType || 'word',
                difficulty
            });
        } else {
            // Get all children assigned to this specialist
            const children = await Child.find({ assignedSpecialist: req.user.id })
                .populate('parent', 'name')
                .select('_id name age parent');

            res.json({
                success: true,
                mode: 'select_child',
                children
            });
        }
    } catch (error) {
        console.error('Error in specialist words route:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data'
        });
    }
});

// @route   POST /api/specialist/content/add
// @desc    Add new content (word or letter) for a child
// @access  Private (Specialist)
router.post('/content/add', protect, async (req, res) => {
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

        // Verify the child is assigned to this specialist
        const child = await Child.findById(childId);
        if (!child || child.assignedSpecialist.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to add content for this child'
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
        if (contentType === 'letter' && text.length > 2) {
            return res.status(400).json({
                success: false,
                message: 'Letter with vowel must not exceed 2 characters'
            });
        }

        if (contentType === 'word' && text.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Word must not exceed 20 characters'
            });
        }

        // Check for duplicate content for this child
        const existingContent = await Word.findOne({
            text: text.trim(),
            contentType,
            child: childId
        });

        if (existingContent) {
            return res.status(400).json({
                success: false,
                message: `${contentType === 'word' ? 'Word' : 'Letter'} already exists for this child`
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

// @route   POST /api/specialist/content/delete/:contentId
// @desc    Delete content by ID
// @access  Private (Specialist)
router.post('/content/delete/:contentId', protect, async (req, res) => {
    try {
        const { contentId } = req.params;

        const content = await Word.findById(contentId);

        if (!content) {
            return res.status(404).json({
                success: false,
                message: 'Content not found'
            });
        }

        // Verify the content belongs to a child assigned to this specialist
        const child = await Child.findById(content.child);
        if (!child || child.assignedSpecialist.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this content'
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

module.exports = router;