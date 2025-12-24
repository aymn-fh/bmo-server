const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true
  },
  specialist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  letters: [{
    letter: String,
    articulationPoint: String, // مخرج الحرف
    vowels: [String], // حركات: أَ، إِ، أُ، إْ
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
  }],
  words: [{
    word: String,
    translation: String,
    category: String, // emotions, needs, actions
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
  }],
  targetDuration: Number, // minutes per day
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  active: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exercise', exerciseSchema);
