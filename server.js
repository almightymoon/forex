const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const maintenanceMiddleware = require('./middleware/maintenanceMode');
const { checkSessionTimeout } = require('./middleware/sessionTimeout');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const sessionRoutes = require('./routes/sessions');
const signalRoutes = require('./routes/signals');
const paymentRoutes = require('./routes/payments');
const promoRoutes = require('./routes/promos');
const assignmentRoutes = require('./routes/assignments');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const twoFactorRoutes = require('./routes/twoFactor');
const notificationRoutes = require('./routes/notifications');
const teacherRoutes = require('./routes/teacher');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration - MUST come before other middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Security middleware (after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(compression());

// Rate limiting - More generous for admin operations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for admin operations
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer configuration for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  }
});

// Apply multer to assignment submission routes
app.use('/api/assignments/*/submit', upload.any());

// Logging middleware
app.use(morgan('combined'));

// Database connection
const mongoUri = `${process.env.MONGODB_URI.trim()}${process.env.DB_NAME}`;
mongoose.connect(mongoUri)
  .then(() => console.log(`Connected to MongoDB Atlas database: ${process.env.DB_NAME}`))
  .catch(err => console.error('MongoDB connection error:', err));

// Debug environment variables
console.log('Environment variables check:');
console.log('- JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'NOT SET');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/notifications', notificationRoutes);

// Apply session timeout check to all protected routes - temporarily disabled for debugging
// app.use(checkSessionTimeout);

// Apply maintenance mode middleware to all other routes
app.use(maintenanceMiddleware);

app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
