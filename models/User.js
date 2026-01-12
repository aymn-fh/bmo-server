const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['parent', 'specialist', 'admin', 'superadmin'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  specialization: {
    type: String,
    trim: true
  },
  licenseNumber: {
    type: String,
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  profilePhoto: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  assignedChildren: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child'
  }],
  // For parents: the specialist they are linked to
  linkedSpecialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // For specialists: list of parents they manage
  linkedParents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For admin and specialist: the center they belong to
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    default: null
  },
  // Track who created this user (for hierarchy management)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Custom ID for search (specialists, admins, and parents)
  staffId: {
    type: String,
    sparse: true, // Allow null for superadmins
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  // Generate staffId for new specialists, admins, and parents
  if (this.isNew && !this.staffId && ['specialist', 'admin', 'parent'].includes(this.role)) {
    let prefix;
    switch (this.role) {
      case 'specialist':
        prefix = 'SP';
        break;
      case 'admin':
        prefix = 'AD';
        break;
      case 'parent':
        prefix = 'PT';
        break;
    }

    const count = await this.constructor.countDocuments({
      role: this.role,
      staffId: { $exists: true }
    });
    this.staffId = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
