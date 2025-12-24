const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const childRoutes = require('./routes/child');
const progressRoutes = require('./routes/progress');
const specialistRoutes = require('./routes/specialist');
const parentRoutes = require('./routes/parent');
const exerciseRoutes = require('./routes/exercise');
const messageRoutes = require('./routes/messages');
const superadminRoutes = require('./routes/superadmin');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');
const { verifyTransporter } = require('./services/emailService');

// 🔑 1. استيراد دالة الـ Seeding المشروطة من ملف ./seed.js
const seedDatabase = require('./seed');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use('/uploads', express.static('uploads'));

// 📱 Custom Middleware to Log Connected Devices
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  // Log only distinct device connections (simplified for noise reduction, or log all for now)
  console.log(`\n📱 [Device Request]`);
  console.log(`   └─ IP: ${ip}`);
  console.log(`   └─ Device: ${userAgent}`);
  console.log(`   └─ Endpoint: ${req.method} ${req.url}\n`);
  next();
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/children', childRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/specialists', specialistRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ... imports
const http = require('http');
const { Server } = require('socket.io');

// ... (keep existing code)

// Database connection and email verification
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000, // Socket timeout
})
  .then(async () => {
    console.log('✅ متصل بقاعدة البيانات');

    // Ensure connection is fully ready
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ في انتظار اكتمال الاتصال بقاعدة البيانات...');
      await new Promise(resolve => {
        mongoose.connection.once('connected', resolve);
      });
    }

    console.log('✅ قاعدة البيانات جاهزة تماماً');

    // 🔑 2. Seeding logic
    if (process.env.NODE_ENV === 'development') {
      console.log('--- بدء ملء قاعدة البيانات في وضع التطوير ---');
      try {
        await seedDatabase();
        console.log('--- اكتمال ملء قاعدة البيانات ---');
      } catch (seedError) {
        console.error('❌ خطأ في ملء قاعدة البيانات:', seedError);
        console.log('⚠️ سيتم متابعة تشغيل الخادم على أي حال...');
      }
    }

    // Verify email transporter on startup
    await verifyTransporter();

    const PORT = process.env.PORT || 5000;

    // Create HTTP server and Socket.io instance
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Make io accessible to routes
    app.set('io', io);

    io.on('connection', (socket) => {
      const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
      console.log(`\n🔌 [New Socket Connection]`);
      console.log(`   └─ IP: ${clientIp}`);
      console.log(`   └─ Socket ID: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`❌ [Socket Disconnected] ID: ${socket.id}`);
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Accepting connections from all network interfaces`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;