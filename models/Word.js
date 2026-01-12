const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    contentType: {
        type: String,
        enum: ['word', 'letter'],
        required: true,
        default: 'word'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy'
    },
    image: {
        type: String,
        default: 'default-word.png'
    },
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
wordSchema.index({ child: 1, contentType: 1, createdAt: -1 });
wordSchema.index({ createdBy: 1 });
wordSchema.index({ contentType: 1 });
wordSchema.index({ child: 1, createdAt: -1 });

module.exports = mongoose.model('Word', wordSchema);
