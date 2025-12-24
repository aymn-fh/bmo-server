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
const exerciseRoutes = require('./routes/exercise');
const { verifyTransporter } = require('./services/emailService');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/children', childRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/specialists', specialistRoutes);
app.use('/api/exercises', exerciseRoutes);

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

// Database connection and email verification
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Verify email transporter on startup
    await verifyTransporter();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
