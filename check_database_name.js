require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabaseName() {
    try {
        console.log('🔍 فحص تفاصيل الاتصال بقاعدة البيانات...\n');

        // عرض connection string (بدون كلمة المرور)
        const connectionString = process.env.MONGODB_URI || process.env.MONGO_URI;
        const safeConnectionString = connectionString.replace(/:([^:@]+)@/, ':****@');

        console.log('📡 Connection String:', safeConnectionString);
        console.log('');

        // الاتصال
        await mongoose.connect(connectionString);

        // الحصول على اسم قاعدة البيانات
        const dbName = mongoose.connection.db.databaseName;
        console.log('🗄️  اسم قاعدة البيانات المستخدمة:', dbName);
        console.log('');

        // الحصول على جميع الـ collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log('📚 Collections الموجودة في قاعدة البيانات:');
        console.log('='.repeat(60));

        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            console.log(`   📁 ${collection.name}: ${count} document(s)`);
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('');

        // عرض تفاصيل users collection
        const User = require('./models/User');
        const Child = require('./models/Child');

        const usersCollection = await mongoose.connection.db.collection('users').find({}).toArray();
        const childrenCollection = await mongoose.connection.db.collection('children').toArray();

        console.log('👥 تفاصيل users collection:');
        console.log(`   - إجمالي: ${usersCollection.length}`);

        const roleCount = {};
        usersCollection.forEach(user => {
            roleCount[user.role] = (roleCount[user.role] || 0) + 1;
        });

        Object.entries(roleCount).forEach(([role, count]) => {
            console.log(`   - ${role}: ${count}`);
        });

        console.log('');
        console.log('👶 تفاصيل children collection:');
        console.log(`   - إجمالي: ${childrenCollection.length}`);

        console.log('');
        console.log('⚠️  إرشادات للتحقق من MongoDB Atlas:');
        console.log('='.repeat(60));
        console.log(`1. اذهب إلى MongoDB Atlas`);
        console.log(`2. اختر Cluster: Cluster0`);
        console.log(`3. اضغط Browse Collections`);
        console.log(`4. تأكد من اختيار قاعدة البيانات: "${dbName}"`);
        console.log(`5. ابحث عن collections: users و children`);
        console.log('');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 تم إغلاق الاتصال');
        process.exit(0);
    }
}

checkDatabaseName();
