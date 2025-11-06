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
const communityRoutes = require('./routes/community');
const certificateRoutes = require('./routes/certificates');
const progressRoutes = require('./routes/progress');
const { initializeWebSocket } = require('./websocket');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Create HTTP server for WebSocket
const http = require('http');
const server = http.createServer(app);

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

// Compression middleware - configure to avoid conflicts with Apache
app.use(compression({
  filter: (req, res) => {
    // Don't compress if Apache is handling it
    if (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Rate limiting - More generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

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
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
mongoose.connect(mongoUri)
  .then(() => console.log(`Connected to MongoDB: ${mongoUri}`))
  .catch(err => console.error('MongoDB connection error:', err));

// Debug environment variables
console.log('Environment variables check:');
console.log('- JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'NOT SET');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);

// Public routes (no middleware)
app.use('/api/auth', authRoutes);
app.use('/api/settings/public', require('./routes/settings'));

// Routes with session timeout check
app.use('/api/admin', checkSessionTimeout, adminRoutes);
app.use('/api/teacher', checkSessionTimeout, teacherRoutes);
app.use('/api/settings', checkSessionTimeout, settingsRoutes);
app.use('/api/2fa', checkSessionTimeout, twoFactorRoutes);
app.use('/api/user2fa', checkSessionTimeout, require('./routes/user2fa'));
app.use('/api/notifications', checkSessionTimeout, notificationRoutes);
app.use('/api/community', checkSessionTimeout, communityRoutes);
app.use('/api/certificates', checkSessionTimeout, certificateRoutes);
app.use('/api/certificate-templates', checkSessionTimeout, require('./routes/certificateTemplates'));
app.use('/api/teacher/certificates', checkSessionTimeout, require('./routes/teacherCertificates'));
app.use('/api/certificate-assignments', checkSessionTimeout, require('./routes/certificateAssignments'));
app.use('/api/progress', checkSessionTimeout, progressRoutes);
app.use('/api/users', checkSessionTimeout, userRoutes);
app.use('/api/courses', checkSessionTimeout, courseRoutes);
app.use('/api/sessions', checkSessionTimeout, sessionRoutes);
app.use('/api/signals', checkSessionTimeout, signalRoutes);
app.use('/api/payments', checkSessionTimeout, paymentRoutes);
app.use('/api/promos', checkSessionTimeout, promoRoutes);
app.use('/api/assignments', checkSessionTimeout, assignmentRoutes);

// Apply maintenance mode middleware to protected routes only
app.use('/api', maintenanceMiddleware);

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

// Initialize WebSocket
initializeWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
