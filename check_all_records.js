require('dotenv').config();
const User = require('./models/User');
const Child = require('./models/Child');
const mongoose = require('mongoose');

async function checkDatabaseRecords() {
    try {
        console.log('🔄 الاتصال بقاعدة البيانات...\n');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('✅ تم الاتصال بنجاح\n');

        console.log('='.repeat(60));
        console.log('📊 إحصائيات قاعدة البيانات الحالية');
        console.log('='.repeat(60));
        console.log('');

        // Count all users by role
        const specialists = await User.find({ role: 'specialist' });
        const parents = await User.find({ role: 'parent' });
        const admins = await User.find({ role: 'admin' });
        const children = await Child.find();

        console.log(`👨‍⚕️ عدد الأخصائيين: ${specialists.length}`);
        if (specialists.length > 0) {
            console.log('   الأخصائيون:');
            specialists.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.name} (${s.email}) - Staff ID: ${s.staffId || 'N/A'}`);
            });
        }
        console.log('');

        console.log(`👨‍👩‍👦 عدد الآباء: ${parents.length}`);
        if (parents.length > 0) {
            console.log('   الآباء:');
            parents.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.name} (${p.email}) - Staff ID: ${p.staffId || 'N/A'}`);
            });
        }
        console.log('');

        console.log(`🔧 عدد المدراء: ${admins.length}`);
        if (admins.length > 0) {
            console.log('   المدراء:');
            admins.forEach((a, i) => {
                console.log(`   ${i + 1}. ${a.name} (${a.email}) - Staff ID: ${a.staffId || 'N/A'}`);
            });
        }
        console.log('');

        console.log(`👶 عدد الأطفال: ${children.length}`);
        if (children.length > 0) {
            console.log('   الأطفال:');
            for (const child of children) {
                const parent = await User.findById(child.parent);
                const specialist = child.assignedSpecialist ? await User.findById(child.assignedSpecialist) : null;
                console.log(`   - ${child.name} (${child.age} سنوات) - ${child.childId || 'N/A'}`);
                console.log(`     الأب: ${parent ? parent.name : 'غير معروف'}`);
                console.log(`     الأخصائي: ${specialist ? specialist.name : 'غير مُعيّن'}`);
            }
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('');

        // Check recent additions (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentSpecialists = await User.countDocuments({
            role: 'specialist',
            createdAt: { $gte: yesterday }
        });
        const recentParents = await User.countDocuments({
            role: 'parent',
            createdAt: { $gte: yesterday }
        });
        const recentChildren = await Child.countDocuments({
            createdAt: { $gte: yesterday }
        });

        console.log('📅 المُضاف خلال الـ 24 ساعة الأخيرة:');
        console.log(`   - أخصائيون: ${recentSpecialists}`);
        console.log(`   - آباء: ${recentParents}`);
        console.log(`   - أطفال: ${recentChildren}`);
        console.log('');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 تم إغلاق الاتصال بقاعدة البيانات');
        process.exit(0);
    }
}

checkDatabaseRecords();
