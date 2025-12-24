const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referralType: {
        type: String,
        enum: ['specialist_created', 'link_request', 'admin_assigned'],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled'],
        default: 'active'
    },
    referralDate: {
        type: Date,
        default: Date.now
    },
    notes: String
}, {
    timestamps: true
});

// Index for faster queries
referralSchema.index({ parent: 1, specialist: 1, status: 1 });

module.exports = mongoose.model('Referral', referralSchema);
