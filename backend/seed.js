const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Child = require('./models/Child');
const Exercise = require('./models/Exercise');
const Progress = require('./models/Progress');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Child.deleteMany({});
    await Exercise.deleteMany({});
    await Progress.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Sample Users (Parents and Specialists)
    const usersData = [
      {
        name: 'John Doe',
        email: 'john@bmo.com',
        password: 'password123',
        role: 'parent',
        phone: '+1234567890'
      },
      {
        name: 'Jane Smith',
        email: 'jane@bmo.com',
        password: 'password123',
        role: 'parent',
        phone: '+1234567891'
      },
      {
        name: 'Dr. Alice Johnson',
        email: 'alice@bmo.com',
        password: 'password123',
        role: 'specialist',
        phone: '+1234567892',
        specialization: 'Speech Therapy',
        licenseNumber: 'ST12345'
      },
      {
        name: 'Dr. Bob Wilson',
        email: 'bob@bmo.com',
        password: 'password123',
        role: 'specialist',
        phone: '+1234567893',
        specialization: 'Child Psychology',
        licenseNumber: 'CP67890'
      }
    ];

    // Hash passwords and create users
    const hashedUsers = await Promise.all(
      usersData.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      }))
    );

    const createdUsers = await User.insertMany(hashedUsers);
    console.log('👥 Created sample users');

    // Sample Children
    const children = [
      {
        name: 'Emma Doe',
        age: 4,
        gender: 'female',
        parent: createdUsers[0]._id,
        assignedSpecialist: createdUsers[2]._id,
        specialistRequestStatus: 'approved',
        dailyPlayDuration: 60,
        sessionStructure: {
          playDuration: 15,
          breakDuration: 10,
          encouragementMessages: true
        },
        targetLetters: ['ب', 'ت', 'ث'],
        targetWords: ['كلب', 'قطة', 'بيت'],
        difficultyLevel: 'beginner'
      },
      {
        name: 'Liam Smith',
        age: 5,
        gender: 'male',
        parent: createdUsers[1]._id,
        assignedSpecialist: createdUsers[3]._id,
        specialistRequestStatus: 'approved',
        dailyPlayDuration: 45,
        sessionStructure: {
          playDuration: 10,
          breakDuration: 5,
          encouragementMessages: true
        },
        targetLetters: ['ج', 'ح', 'خ'],
        targetWords: ['شمس', 'قمر', 'نجم'],
        difficultyLevel: 'intermediate'
      },
      {
        name: 'Olivia Doe',
        age: 4,
        gender: 'female',
        parent: createdUsers[0]._id,
        dailyPlayDuration: 30,
        targetLetters: ['د', 'ذ', 'ر'],
        targetWords: ['ورد', 'وردة', 'زهرة'],
        difficultyLevel: 'beginner'
      }
    ];

    const createdChildren = await Child.insertMany(children);
    console.log('👶 Created sample children');

    // Sample Exercises
    const exercises = [
      {
        child: createdChildren[0]._id,
        specialist: createdUsers[2]._id,
        letters: [
          { letter: 'ب', articulationPoint: 'الشفاه', vowels: ['أَ', 'إِ', 'أُ'], difficulty: 'easy' },
          { letter: 'ت', articulationPoint: 'اللسان', vowels: ['إِ', 'أُ'], difficulty: 'medium' },
          { letter: 'ث', articulationPoint: 'الأسنان', vowels: ['أَ', 'إْ'], difficulty: 'hard' }
        ],
        words: [
          { word: 'كلب', translation: 'dog', category: 'animals', difficulty: 'easy' },
          { word: 'قطة', translation: 'cat', category: 'animals', difficulty: 'easy' },
          { word: 'بيت', translation: 'house', category: 'places', difficulty: 'medium' }
        ],
        targetDuration: 30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        child: createdChildren[1]._id,
        specialist: createdUsers[3]._id,
        letters: [
          { letter: 'ج', articulationPoint: 'الحلق', vowels: ['أَ', 'إِ'], difficulty: 'medium' },
          { letter: 'ح', articulationPoint: 'الحلق', vowels: ['أُ', 'إْ'], difficulty: 'hard' },
          { letter: 'خ', articulationPoint: 'الحلق', vowels: ['أَ'], difficulty: 'hard' }
        ],
        words: [
          { word: 'شمس', translation: 'sun', category: 'nature', difficulty: 'medium' },
          { word: 'قمر', translation: 'moon', category: 'nature', difficulty: 'medium' },
          { word: 'نجم', translation: 'star', category: 'nature', difficulty: 'hard' }
        ],
        targetDuration: 25,
        startDate: new Date(),
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 days from now
      }
    ];

    const createdExercises = await Exercise.insertMany(exercises);
    console.log('📚 Created sample exercises');

    // Sample Progress Records
    const progressRecords = [
      {
        child: createdChildren[0]._id,
        sessions: [
          {
            sessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            duration: 25,
            totalAttempts: 50,
            successfulAttempts: 35,
            failedAttempts: 15,
            averageScore: 75,
            attempts: [
              { letter: 'ب', vowel: 'أَ', success: true, score: 85 },
              { letter: 'ت', vowel: 'إِ', success: false, score: 60 },
              { word: 'كلب', success: true, score: 90 }
            ],
            robotFeedback: ['Great job!', 'Keep practicing!']
          },
          {
            sessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            duration: 30,
            totalAttempts: 60,
            successfulAttempts: 45,
            failedAttempts: 15,
            averageScore: 80,
            attempts: [
              { letter: 'ب', vowel: 'أُ', success: true, score: 88 },
              { letter: 'ث', vowel: 'أَ', success: true, score: 82 },
              { word: 'قطة', success: true, score: 95 }
            ],
            robotFeedback: ['Excellent progress!', 'You\'re doing amazing!']
          }
        ],
        overallStats: {
          totalSessions: 2,
          totalPlayTime: 55,
          totalAttempts: 110,
          successRate: 72.73,
          averageScore: 77.5,
          masteredLetters: ['ب'],
          masteredWords: ['كلب'],
          challengingLetters: ['ث'],
          challengingWords: []
        },
        lastSyncDate: new Date()
      },
      {
        child: createdChildren[1]._id,
        sessions: [
          {
            sessionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            duration: 20,
            totalAttempts: 40,
            successfulAttempts: 28,
            failedAttempts: 12,
            averageScore: 70,
            attempts: [
              { letter: 'ج', vowel: 'أَ', success: true, score: 78 },
              { letter: 'ح', vowel: 'أُ', success: false, score: 55 },
              { word: 'شمس', success: true, score: 85 }
            ],
            robotFeedback: ['Good effort!', 'Try again!']
          }
        ],
        overallStats: {
          totalSessions: 1,
          totalPlayTime: 20,
          totalAttempts: 40,
          successRate: 70,
          averageScore: 70,
          masteredLetters: [],
          masteredWords: ['شمس'],
          challengingLetters: ['ح'],
          challengingWords: []
        },
        lastSyncDate: new Date()
      }
    ];

    await Progress.insertMany(progressRecords);
    console.log('📊 Created sample progress records');

    // Update specialists with assigned children
    await User.findByIdAndUpdate(createdUsers[2]._id, {
      $push: { assignedChildren: createdChildren[0]._id }
    });
    await User.findByIdAndUpdate(createdUsers[3]._id, {
      $push: { assignedChildren: createdChildren[1]._id }
    });

    console.log('🎉 Database seeded successfully!');
    console.log('Sample data includes:');
    console.log('- 4 users (2 parents, 2 specialists)');
    console.log('- 3 children');
    console.log('- 2 exercises');
    console.log('- 2 progress records');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seed function
seedDatabase();
