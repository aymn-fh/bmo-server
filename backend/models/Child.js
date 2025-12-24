const mongoose = require('mongoose');

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
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Child', childSchema);
