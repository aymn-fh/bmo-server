const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
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

// Index for faster queries
wordSchema.index({ child: 1, createdAt: -1 });
wordSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Word', wordSchema);
