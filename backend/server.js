const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
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
const uploadRoutes = require('./routes/upload');
const mt5Routes = require('./routes/mt5');
const referralRoutes = require('./routes/referrals');
const withdrawalRoutes = require('./routes/withdrawals');
const tradeRoutes = require('./routes/trades');
const packageRoutes = require('./routes/packages');
const { initializeWebSocket } = require('./websocket');
const { authenticateToken, requirePackageSubscription } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure log directory exists (used by morgan + console mirror)
const LOG_DIR = path.join(__dirname, 'logs');
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (e) {
  console.error('Failed to create log directory:', e);
}

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
const accessLogStream = fs.createWriteStream(path.join(LOG_DIR, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
// Keep existing console logging behavior for local dev visibility
app.use(morgan('dev'));

// Mirror console output to app.log for admin viewing
const appLogStream = fs.createWriteStream(path.join(LOG_DIR, 'app.log'), { flags: 'a' });
function formatLogLine(level, args) {
  const msg = args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
  return `[${new Date().toISOString()}] [${level}] ${msg}\n`;
}

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

console.log = (...args) => {
  try {
    appLogStream.write(formatLogLine('INFO', args));
  } catch {}
  originalConsole.log(...args);
};
console.info = (...args) => {
  try {
    appLogStream.write(formatLogLine('INFO', args));
  } catch {}
  originalConsole.info(...args);
};
console.warn = (...args) => {
  try {
    appLogStream.write(formatLogLine('WARN', args));
  } catch {}
  originalConsole.warn(...args);
};
console.error = (...args) => {
  try {
    appLogStream.write(formatLogLine('ERROR', args));
  } catch {}
  originalConsole.error(...args);
};

// Database connection
function buildMongoUri() {
  const raw = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/forex-lms';
  const dbName = (process.env.DB_NAME || '').trim();

  if (!dbName) return raw;

  // If the URI already includes a DB path, keep it.
  // If it doesn't (e.g. ends with .net/ or has only "/"), inject DB_NAME.
  try {
    const u = new URL(raw);
    const hasDbPath = u.pathname && u.pathname !== '/' && u.pathname.trim().length > 1;
    if (hasDbPath) return raw;

    u.pathname = `/${encodeURIComponent(dbName)}`;
    return u.toString();
  } catch {
    // If URL parsing fails, fall back to raw.
    return raw;
  }
}

const mongoUri = buildMongoUri();
mongoose.connect(mongoUri)
  .then(() => console.log(`Connected to MongoDB: ${mongoUri}`))
  .catch(err => console.error('MongoDB connection error:', err));

// Seed default packages once DB is ready (safe no-op if already exists)
mongoose.connection.once('open', async () => {
  try {
    const Package = require('./models/Package');
    await Package.ensureDefaults();
  } catch (e) {
    console.error('Package seed error:', e);
  }
});

// Debug environment variables
console.log('Environment variables check:');
console.log('- JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'NOT SET');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);

// Public routes (no middleware)
app.use('/api/auth', authRoutes);
app.use('/api/settings/public', require('./routes/settings'));
app.use('/api/packages', packageRoutes);

// Routes with session timeout check
// Admin and teacher routes don't require package subscription
app.use('/api/admin', checkSessionTimeout, adminRoutes);
app.use('/api/teacher', checkSessionTimeout, teacherRoutes);

// Settings routes (public settings don't need package, but protected ones do)
app.use('/api/settings', checkSessionTimeout, settingsRoutes);

// Auth routes don't require package subscription
app.use('/api/auth', authRoutes);

// Payment routes - allow access without package so users can purchase packages
app.use('/api/payments', checkSessionTimeout, paymentRoutes);

// Public course routes - allow viewing available courses without package subscription
const Course = require('./models/Course');
app.get('/api/courses', async (req, res) => {
  try {
    const { category, level, search, sort = 'createdAt', order = 'desc' } = req.query;
    
    let query = { 
      $or: [
        { isPublished: true },
        { status: 'published' }
      ]
    };
    
    if (category) query.category = category;
    if (level) query.level = level;
    if (search) {
      query.$text = { $search: search };
    }
    
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;
    
    const courses = await Course.find(query)
      .populate('teacher', 'firstName lastName profileImage')
      .sort(sortObj)
      .limit(20);
    
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Public route to get a single course by ID (for viewing course details)
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      $or: [
        { isPublished: true },
        { status: 'published' }
      ]
    })
      .populate('teacher', 'firstName lastName profileImage email')
      .populate('enrolledStudents.student', 'firstName lastName profileImage');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Calculate video count from content and videos arrays
    const videoContent = (course.content || []).filter(item => item.type === 'video');
    const totalVideos = videoContent.length + (course.videos?.length || 0);
    
    // Ensure content and videos arrays exist and are properly structured
    const courseData = {
      ...course.toObject(),
      content: course.content || [],
      videos: course.videos || [],
      totalDuration: course.totalDuration || 0,
      totalContent: (course.content?.length || 0) + (course.videos?.length || 0),
      totalVideos: totalVideos
    };
    
    res.json(courseData);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// All other protected routes require package subscription
// These routes will check for package subscription after authentication
app.use('/api/2fa', checkSessionTimeout, authenticateToken, requirePackageSubscription, twoFactorRoutes);
app.use('/api/user2fa', checkSessionTimeout, authenticateToken, requirePackageSubscription, require('./routes/user2fa'));
app.use('/api/notifications', checkSessionTimeout, authenticateToken, requirePackageSubscription, notificationRoutes);
app.use('/api/community', checkSessionTimeout, authenticateToken, requirePackageSubscription, communityRoutes);
app.use('/api/certificates', checkSessionTimeout, authenticateToken, requirePackageSubscription, certificateRoutes);
app.use('/api/certificate-templates', checkSessionTimeout, authenticateToken, requirePackageSubscription, require('./routes/certificateTemplates'));
app.use('/api/teacher/certificates', checkSessionTimeout, authenticateToken, requirePackageSubscription, require('./routes/teacherCertificates'));
app.use('/api/certificate-assignments', checkSessionTimeout, authenticateToken, requirePackageSubscription, require('./routes/certificateAssignments'));
app.use('/api/progress', checkSessionTimeout, authenticateToken, requirePackageSubscription, progressRoutes);
app.use('/api/users', checkSessionTimeout, authenticateToken, requirePackageSubscription, userRoutes);
app.use('/api/courses', checkSessionTimeout, authenticateToken, requirePackageSubscription, courseRoutes);
app.use('/api/sessions', checkSessionTimeout, authenticateToken, requirePackageSubscription, sessionRoutes);
app.use('/api/signals', checkSessionTimeout, authenticateToken, requirePackageSubscription, signalRoutes);
app.use('/api/promos', checkSessionTimeout, authenticateToken, requirePackageSubscription, promoRoutes);
app.use('/api/assignments', checkSessionTimeout, authenticateToken, requirePackageSubscription, assignmentRoutes);
app.use('/api/upload', checkSessionTimeout, authenticateToken, requirePackageSubscription, uploadRoutes);
app.use('/api/mt5', checkSessionTimeout, authenticateToken, requirePackageSubscription, mt5Routes);
app.use('/api/referrals', checkSessionTimeout, authenticateToken, requirePackageSubscription, referralRoutes);
app.use('/api/withdrawals', checkSessionTimeout, authenticateToken, requirePackageSubscription, withdrawalRoutes);
app.use('/api/trades', checkSessionTimeout, authenticateToken, requirePackageSubscription, tradeRoutes);

// Apply maintenance mode middleware to protected routes only (after all routes are registered)
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
