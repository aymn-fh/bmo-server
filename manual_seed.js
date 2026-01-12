const mongoose = require('mongoose');
require('dotenv').config();
const seedDatabase = require('./seed');

const runSeed = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        console.log('🌱 Starting seed...');
        // Force seed to run
        process.env.FORCE_SEED = 'true';
        await seedDatabase();

        console.log('🏁 Seeding finished.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during manual seed:', error);
        process.exit(1);
    }
};

runSeed();
