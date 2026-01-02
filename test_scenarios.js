require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api';

async function makeRequest(url, method = 'GET', body = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return await response.json();
}

async function testAllScenarios() {
    console.log('='.repeat(60));
    console.log('🧪 اختبار السيناري وهات الثلاثة');
    console.log('='.repeat(60));
    console.log('');

    try {
        // ============================================
        // Scenario 1: Admin creates Specialist
        // ============================================
        console.log('📋 السيناريو 1: المدير ينشئ اخصائي');
        console.log('-'.repeat(60));

        // First, login as admin to get token
        console.log('🔐 تسجيل دخول المدير...');
        const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@bmo.ly',
            password: 'Admin123!'
        });

        if (!adminLogin.data.success) {
            console.log('❌ فشل تسجيل دخول المدير');
            return;
        }

        const adminToken = adminLogin.data.token;
        console.log('✅ تم تسجيل دخول المدير بنجاح');

        // Create specialist
        console.log('👨‍⚕️ إنشاء اخصائي جديد...');
        try {
            const createSpec = await axios.post(
                `${BASE_URL}/admin/create-specialist`,
                {
                    name: `Test Specialist ${Date.now()}`,
                    email: `spec_${Date.now()}@test.com`,
                    password: 'password123',
                    phone: '1234567890',
                    specialization: 'Speech Therapy'
                },
                {
                    headers: { Authorization: `Bearer ${adminToken}` }
                }
            );

            if (createSpec.data.success) {
                console.log('✅ تم إنشاء الاخصائي بنجاح!');
                console.log('   - الاسم:', createSpec.data.specialist.name);
                console.log('   - البريد:', createSpec.data.specialist.email);
                console.log('   - المعرف:', createSpec.data.specialist.id);
            } else {
                console.log('❌ فشل إنشاء الاخصائي:', createSpec.data.message);
            }
        } catch (error) {
            console.log('❌ خطأ في إنشاء الاخصائي:', error.response?.data?.message || error.message);
        }

        console.log('');

        // ============================================
        // Scenario 2: Parent registers themselves
        // ============================================
        console.log('📋 السيناريو 2: الأب يسجل نفسه');
        console.log('-'.repeat(60));

        console.log('👨‍👩‍👦 تسجيل اب جديد...');
        try {
            const registerParent = await axios.post(`${BASE_URL}/auth/register`, {
                name: `Test Parent ${Date.now()}`,
                email: `parent_${Date.now()}@test.com`,
                password: 'password123',
                role: 'parent',
                phone: '0987654321'
            });

            if (registerParent.data.success) {
                console.log('✅ تم تسجيل الأب بنجاح!');
                console.log('   - الاسم:', registerParent.data.user.name);
                console.log('   - البريد:', registerParent.data.user.email);
                console.log('   - المعرف:', registerParent.data.user.id);

                // ============================================
                // Scenario 3: Specialist creates child for parent
                // ============================================
                console.log('');
                console.log('📋 السيناريو 3: الاخصائي ينشئ طفل للأب');
                console.log('-'.repeat(60));

                // Login as specialist
                console.log('🔐 تسجيل دخول الاخصائي...');
                const specLogin = await axios.post(`${BASE_URL}/auth/login`, {
                    email: 'spec1@bmo.ly',
                    password: 'Spec123!'
                });

                if (!specLogin.data.success) {
                    console.log('❌ فشل تسجيل دخول الاخصائي');
                    return;
                }

                const specToken = specLogin.data.token;
                console.log('✅ تم تسجيل دخول الاخصائي بنجاح');

                // First, link the parent to specialist
                console.log('🔗 ربط الأب بالاخصائي...');
                try {
                    await axios.post(
                        `${BASE_URL}/specialists/link-parent`,
                        { parentId: registerParent.data.user.id },
                        { headers: { Authorization: `Bearer ${specToken}` } }
                    );
                    console.log('✅ تم ربط الأب بالاخصائي');
                } catch (error) {
                    console.log('⚠️ تحذير - ربط الأب:', error.response?.data?.message || error.message);
                }

                // Create child
                console.log('👶 إنشاء طفل جديد...');
                try {
                    const createChild = await axios.post(
                        `${BASE_URL}/specialists/create-child`,
                        {
                            parentId: registerParent.data.user.id,
                            name: `Test Child ${Date.now()}`,
                            age: 5,
                            gender: 'male',
                            targetLetters: ['س', 'ش'],
                            targetWords: ['سمكة', 'شمس']
                        },
                        {
                            headers: { Authorization: `Bearer ${specToken}` }
                        }
                    );

                    if (createChild.data.success) {
                        console.log('✅ تم إنشاء الطفل بنجاح!');
                        console.log('   - الاسم:', createChild.data.child.name);
                        console.log('   - العمر:', createChild.data.child.age);
                        console.log('   - معرف الطفل:', createChild.data.child.childId);
                    } else {
                        console.log('❌ فشل إنشاء الطفل:', createChild.data.message);
                    }
                } catch (error) {
                    console.log('❌ خطأ في إنشاء الطفل:', error.response?.data?.message || error.message);
                }

            } else {
                console.log('❌ فشل تسجيل الأب:', registerParent.data.message);
            }
        } catch (error) {
            console.log('❌ خطأ في تسجيل الأب:', error.response?.data?.message || error.message);
        }

        console.log('');
        console.log('='.repeat(60));
        console.log('✅ انتهت جميع الاختبارات');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ خطأ عام:', error.message);
    }
}

testAllScenarios();
