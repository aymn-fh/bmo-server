const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'اسم المركز مطلوب'],
        trim: true
    },
    nameEn: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    // The admin who manages this center
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // List of specialists in this center
    specialists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // The superadmin who created this center
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual to get specialist count
centerSchema.virtual('specialistCount').get(function () {
    return this.specialists ? this.specialists.length : 0;
});

// Index for efficient queries
centerSchema.index({ createdBy: 1 });
centerSchema.index({ admin: 1 });

module.exports = mongoose.model('Center', centerSchema);
