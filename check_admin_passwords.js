const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkAdminPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all admin users
        const admins = await User.find({ role: 'admin' }).select('+password');

        console.log(`📊 Found ${admins.length} admin accounts:\n`);

        for (const admin of admins) {
            console.log(`👤 ${admin.email}`);
            console.log(`   Name: ${admin.name}`);
            console.log(`   Created: ${admin.createdAt}`);
            console.log(`   Password hash length: ${admin.password.length} chars`);
            console.log(`   Hash starts with: ${admin.password.substring(0, 20)}...`);

            // bcrypt hash should be 60 characters
            // If it's longer, it's likely double-hashed
            if (admin.password.length > 60) {
                console.log(`   ⚠️  WARNING: Password appears to be double-hashed!`);
            } else if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
                console.log(`   ✅ Password hash looks correct`);
            } else {
                console.log(`   ❓ Unknown password format`);
            }
            console.log('');
        }

        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAdminPasswords();
