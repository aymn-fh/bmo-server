const mongoose = require('mongoose');
const User = require('./models/User');
const Child = require('./models/Child');
require('dotenv').config();

async function testDatabaseSave() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB\n');

        // Test 1: Create Specialist
        console.log('📝 Test 1: Creating Specialist...');
        try {
            const specialist = new User({
                name: 'Test Specialist',
                email: `test_specialist_${Date.now()}@test.com`,
                password: 'password123',
                role: 'specialist',
                phone: '1234567890',
                specialization: 'Speech Therapy',
                emailVerified: true
            });

            console.log('Before save - Specialist ID:', specialist._id);
            await specialist.save();
            console.log('After save - Specialist ID:', specialist._id);
            console.log('✅ Specialist saved successfully!');
            console.log('   - Name:', specialist.name);
            console.log('   - Email:', specialist.email);
            console.log('   - Staff ID:', specialist.staffId);

            // Verify in DB
            const foundSpecialist = await User.findById(specialist._id);
            if (foundSpecialist) {
                console.log('✅ Verification: Specialist found in database!\n');
            } else {
                console.log('❌ ERROR: Specialist NOT found in database!\n');
            }
        } catch (error) {
            console.log('❌ Error creating specialist:', error.message);
            console.log('   Stack:', error.stack);
        }

        // Test 2: Create Parent
        console.log('📝 Test 2: Creating Parent...');
        try {
            const parent = new User({
                name: 'Test Parent',
                email: `test_parent_${Date.now()}@test.com`,
                password: 'password123',
                role: 'parent',
                phone: '0987654321',
                emailVerified: true
            });

            console.log('Before save - Parent ID:', parent._id);
            await parent.save();
            console.log('After save - Parent ID:', parent._id);
            console.log('✅ Parent saved successfully!');
            console.log('   - Name:', parent.name);
            console.log('   - Email:', parent.email);
            console.log('   - Staff ID:', parent.staffId);

            // Verify in DB
            const foundParent = await User.findById(parent._id);
            if (foundParent) {
                console.log('✅ Verification: Parent found in database!\n');
            } else {
                console.log('❌ ERROR: Parent NOT found in database!\n');
            }

            // Test 3: Create Child for this parent
            console.log('📝 Test 3: Creating Child...');
            try {
                const child = new Child({
                    name: 'Test Child',
                    age: 5,
                    gender: 'male',
                    parent: parent._id
                });

                console.log('Before save - Child ID:', child._id);
                await child.save();
                console.log('After save - Child ID:', child._id);
                console.log('✅ Child saved successfully!');
                console.log('   - Name:', child.name);
                console.log('   - Age:', child.age);
                console.log('   - Child ID:', child.childId);

                // Verify in DB
                const foundChild = await Child.findById(child._id);
                if (foundChild) {
                    console.log('✅ Verification: Child found in database!\n');
                } else {
                    console.log('❌ ERROR: Child NOT found in database!\n');
                }
            } catch (error) {
                console.log('❌ Error creating child:', error.message);
                console.log('   Stack:', error.stack);
            }
        } catch (error) {
            console.log('❌ Error creating parent:', error.message);
            console.log('   Stack:', error.stack);
        }

        // Summary
        console.log('='.repeat(50));
        console.log('📊 Final Database Count:');
        const specialistsCount = await User.countDocuments({ role: 'specialist' });
        const parentsCount = await User.countDocuments({ role: 'parent' });
        const childrenCount = await Child.countDocuments();

        console.log(`   - Specialists: ${specialistsCount}`);
        console.log(`   - Parents: ${parentsCount}`);
        console.log(`   - Children: ${childrenCount}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔒 Database connection closed');
        process.exit(0);
    }
}

testDatabaseSave();
