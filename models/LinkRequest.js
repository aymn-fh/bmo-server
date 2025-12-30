const mongoose = require('mongoose');

const linkRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        // required: true // Optional for backward compatibility during migration
    },
    message: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Ensure a parent can only have one pending request to a specialist for a specific child
linkRequestSchema.index({ from: 1, to: 1, child: 1, status: 1 });

module.exports = mongoose.model('LinkRequest', linkRequestSchema);
