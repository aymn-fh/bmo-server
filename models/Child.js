const mongoose = require('mongoose');
const Counter = require('./Counter');

const childSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Child name is required'],
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 4,
    max: 5
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedSpecialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  specialistRequestStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  dailyPlayDuration: {
    type: Number,
    default: 60 // minutes
  },
  sessionStructure: {
    playDuration: { type: Number, default: 15 },
    breakDuration: { type: Number, default: 10 },
    encouragementMessages: { type: Boolean, default: true }
  },
  targetLetters: [{
    type: String,
    trim: true
  }],
  targetWords: [{
    type: String,
    trim: true
  }],
  difficultyLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  // Custom child ID for search
  childId: {
    type: String,
    unique: true,
    trim: true
  },

  // Default avatar selection (shared across apps by ID)
  // Example IDs: avatar_01, avatar_02, ...
  avatarId: {
    type: String,
    trim: true,
    default: null
  },
  // When the avatar was explicitly selected/changed by the user.
  // Used to enforce a cooldown window for avatar changes.
  avatarSelectedAt: {
    type: Date,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

async function getNextChildId(ChildModel) {
  const counterName = 'childId';

  // Initialize the counter from the current max childId (important for existing DBs).
  const existingCounter = await Counter.findById(counterName).lean();
  if (!existingCounter) {
    const last = await ChildModel.findOne({ childId: /^CH-\d{4}$/ })
      .sort({ childId: -1 })
      .select('childId')
      .lean();

    const start = last?.childId ? parseInt(last.childId.slice(3), 10) : 0;
    try {
      await Counter.create({ _id: counterName, seq: start });
    } catch (err) {
      // If another request initialized it concurrently, ignore the duplicate.
      if (err?.code !== 11000) throw err;
    }
  }

  const updated = await Counter.findByIdAndUpdate(
    counterName,
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (!updated) {
    throw new Error('Failed to generate childId');
  }

  return `CH-${String(updated.seq).padStart(4, '0')}`;
}

// Pre-save hook to generate childId
childSchema.pre('save', async function (next) {
  if (this.isNew && !this.childId) {
    try {
      this.childId = await getNextChildId(this.constructor);
    } catch (err) {
      return next(err);
    }
  }

  // Set a sensible default avatarId if not provided.
  if (this.isNew && !this.avatarId) {
    this.avatarId = this.gender === 'female' ? 'avatar_02' : 'avatar_01';
  }
  next();
});

module.exports = mongoose.model('Child', childSchema);
