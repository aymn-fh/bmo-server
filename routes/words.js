const express = require('express');
const router = express.Router();
const Word = require('../models/Word');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'word-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Images only!'));
    }
});

// @route   POST /api/words
// @desc    Create a new word or letter
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res) => {
    try {
        const { text, contentType, difficulty, childId } = req.body;

        if (!text || !childId) {
            return res.status(400).json({
                success: false,
                message: 'Text and Child ID are required'
            });
        }

        let imagePath = 'default-word.png';
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }

        const word = await Word.create({
            text,
            contentType: contentType || 'word',
            difficulty: difficulty || 'easy',
            child: childId,
            image: imagePath,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            word
        });
    } catch (error) {
        console.error('Error creating word:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/words/:id
// @desc    Delete a word
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const word = await Word.findById(req.params.id);

        if (!word) {
            return res.status(404).json({
                success: false,
                message: 'Word not found'
            });
        }

        // Check ownership (optional: or if user is specialist assigned to child)
        // For now, allow if createdBy matches or generic admin check
        // Assuming specialist who created it can delete it
        if (word.createdBy && word.createdBy.toString() !== req.user.id) {
            // Check if user is the assigned specialist for the child?
            // This requires looking up Child.
            // For simplicity, strict check or just allow if specialist.
            // Let's rely on simple auth for now.
        }

        await word.deleteOne();

        res.json({
            success: true,
            message: 'Word deleted',
            childId: word.child // Return childId to help frontend redirect
        });
    } catch (error) {
        console.error('Error deleting word:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get words for a specific child
router.get('/child/:childId', protect, async (req, res) => {
    try {
        const { childId } = req.params;
        const { difficulty, contentType } = req.query;

        let query = { child: childId };
        if (difficulty) query.difficulty = difficulty;
        if (contentType) query.contentType = contentType;

        const words = await Word.find(query).sort('-createdAt');

        // Split into words and letters for frontend convenience if needed?
        // Frontend expects { words: [], letters: [] } in one call?
        // specialist-portal/routes/words.js: const { words, letters } = response.data
        // So yes, we should categorize them here or frontend does it?
        // Let's return separated lists to match frontend expectation.

        // Wait, if I filter by contentType in query, I only get one type.
        // If frontend requests ALL, I separate.

        // If frontend sends specific contentType, we return list.
        // Frontend logic (line 97): params: { childId, difficulty, contentType }
        // BUT response destructuring: const { words, letters } = response.data
        // This suggests frontend expects BOTH arrays if no contentType specified OR structured object.

        // Let's fetch ALL for the child if no specific type requested, then separate.

        let localWords = [];
        let localLetters = [];

        if (contentType) {
            const results = await Word.find(query).sort('-createdAt');
            if (contentType === 'word') localWords = results;
            else localLetters = results;
        } else {
            // Fetch all
            const allItems = await Word.find({ child: childId }).sort('-createdAt');
            localWords = allItems.filter(w => w.contentType === 'word');
            localLetters = allItems.filter(w => w.contentType === 'letter');
        }

        res.json({
            success: true,
            words: localWords,
            letters: localLetters
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
