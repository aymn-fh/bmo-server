const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
// Load .env only for local development. On Railway (and most hosts), environment
// variables are injected by the platform and a committed .env can cause outages
// (e.g. forcing NODE_ENV=development, seeding, wrong PORT).
const isRailway = !!(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_SERVICE_ID
);

if (!isRailway && process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const authRoutes = require('./routes/auth');
const childRoutes = require('./routes/child');
const progressRoutes = require('./routes/progress');
const specialistRoutes = require('./routes/specialist');
const parentRoutes = require('./routes/parent');
const exerciseRoutes = require('./routes/exercise');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const superadminRoutes = require('./routes/superadmin');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');
const { verifyTransporter } = require('./services/emailService');
const seedDatabase = require('./seed');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📂 Uploads directory created at:', uploadDir);
}

// Ensure public static directory exists (versioned assets like default avatars)
const publicDir = path.join(__dirname, 'public');
const avatarsDir = path.join(publicDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log('📂 Public avatars directory created at:', avatarsDir);
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded by other domains/apps
}));
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Manual route for serving uploads to debug 404s
// Manual route for serving uploads to debug 404s (Disabled in favor of express.static)
// app.get('/uploads/:filename', (req, res) => {
//   const filepath = path.join(uploadDir, req.params.filename);
//   console.log(`📂 [Upload Request] Serving: ${req.params.filename}`);
//
//   if (fs.existsSync(filepath)) {
//     res.sendFile(filepath);
//   } else {
//     console.error(`❌ [Upload Error] File not found: ${filepath}`);
//     res.status(404).send('File not found');
//   }
// });

app.use('/uploads', express.static(uploadDir));
app.use('/static', express.static(publicDir));

// Log connected devices
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  console.log(`📱 [Device Request] IP: ${ip}, Device: ${userAgent}, Endpoint: ${req.method} ${req.url}`);
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/words', require('./routes/words'));
app.use('/api/content', require('./routes/content'));
app.use('/api/specialist', require('./routes/specialistPortal'));
app.use('/api/upload', require('./routes/upload'));

// ✅ راوت يعمل على المتصفح
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 BMO Backend Server</h1>
    <p>Server is running and ready!</p>
    <p>Use <a href="/health">/health</a> to check API status.</p>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    env: process.env.NODE_ENV || 'unknown',
    jwt: {
      configured: !!process.env.JWT_SECRET,
      expireConfigured: !!process.env.JWT_EXPIRE,
    },
    db: {
      readyState: mongoose.connection.readyState,
      state:
        mongoose.connection.readyState === 1
          ? 'connected'
          : mongoose.connection.readyState === 2
            ? 'connecting'
            : mongoose.connection.readyState === 0
              ? 'disconnected'
              : 'unknown',
    },
  });
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

// Start HTTP server immediately (hosting platforms require binding $PORT quickly)
// Default to 5000 to match our Dockerfile EXPOSE and local expectations.
const PORT = Number(process.env.PORT || 5000);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set('io', io);

io.on('connection', (socket) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const userId = socket.handshake.auth?.userId;

  console.log(`🔌 [New Socket Connection] IP: ${clientIp}, Socket ID: ${socket.id}, UserID: ${userId || 'n/a'}`);

  if (userId) {
    socket.join(userId.toString());
  }

  // Typing indicator relay: sender -> receiver
  socket.on('typing', (data) => {
    if (!userId) return;
    const receiverId = data?.receiverId;
    const isTyping = !!data?.isTyping;
    if (!receiverId) return;
    io.to(receiverId.toString()).emit('user_typing', { userId: userId.toString(), isTyping });
  });

  socket.on('disconnect', () => {
    console.log(`❌ [Socket Disconnected] ID: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Accepting connections from all network interfaces`);
});

// Database connection (async, with retry) so the service stays responsive even if DB is down
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
let _mongoConnectInFlight = false;

async function connectMongoWithRetry() {
  if (_mongoConnectInFlight) return;
  if (!mongoUri) {
    console.error('❌ Missing MONGODB_URI/MONGO_URI env var. Backend will run but DB features will fail until it is set.');
    return;
  }

  _mongoConnectInFlight = true;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ متصل بقاعدة البيانات');

    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ في انتظار اكتمال الاتصال بقاعدة البيانات...');
      await new Promise(resolve => {
        mongoose.connection.once('connected', resolve);
      });
    }

    console.log('✅ قاعدة البيانات جاهزة تماماً');

    const shouldSeed = String(process.env.FORCE_SEED || '').toLowerCase() === 'true';
    if (shouldSeed) {
      console.log('--- بدء ملء قاعدة البيانات (FORCE_SEED=true) ---');
      try {
        await seedDatabase();
        console.log('--- اكتمال ملء قاعدة البيانات ---');
      } catch (seedError) {
        console.error('❌ خطأ في ملء قاعدة البيانات:', seedError);
        console.log('⚠️ سيتم متابعة تشغيل الخادم على أي حال...');
      }
    }

    // Verify email transporter (قد يفشل في بعض السيرفرات)
    try {
      await verifyTransporter();
    } catch (e) {
      console.warn('⚠️ Email transporter verification failed:', e.message);
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err?.message || err);
    console.error('⏳ Will retry Mongo connection in 5s...');
    setTimeout(() => {
      _mongoConnectInFlight = false;
      connectMongoWithRetry();
    }, 5000);
    return;
  }

  _mongoConnectInFlight = false;
}

connectMongoWithRetry();

module.exports = app;
