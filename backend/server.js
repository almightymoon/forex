require('dotenv').config();
const disableConsoleInProduction = require('./utils/disableConsole');

// Disable console logs in production (keeps error/warn)
disableConsoleInProduction();

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
const adminNotificationRoutes = require('./routes/adminNotifications');
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
const packagePerksRoutes = require('./routes/packagePerks');
const rankRewardRoutes = require('./routes/rankRewards');
const supportRoutes = require('./routes/support');
const newsRoutes = require('./routes/news');
const devRoutes = require('./routes/dev');
const { buildCoursePackageFilter, getUserPackagePrice, canAccessCourseByPackage } = require('./utils/coursePackageAccess');
const { initializeWebSocket } = require('./websocket');
const { authenticateToken, requirePackageSubscription, requireAdmin } = require('./middleware/auth');

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

// Database connection with DB_NAME injection (keeps prod/local consistent)
function getMongoUri() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = (process.env.DB_NAME || '').trim();
  if (!dbName) return uri;

  try {
    const u = new URL(uri);
    const hasDbPath = u.pathname && u.pathname !== '/' && u.pathname.trim().length > 1;
    if (hasDbPath) return uri;
    u.pathname = `/${encodeURIComponent(dbName)}`;
    return u.toString();
  } catch {
    const match = uri.match(/^(mongodb(\+srv)?:\/\/[^/]+)(\/([^?]*))?(\?.*)?$/);
    if (match) {
      const pathPart = match[4];
      if (pathPart === undefined || pathPart === '' || pathPart === '/') {
        return match[1] + '/' + dbName + (match[5] || '');
      }
    }
    return uri;
  }
}

const mongoUri = getMongoUri();

const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  w: 'majority'
};

async function connectToMongoDB() {
  try {
    await mongoose.connect(mongoUri, mongooseOptions);
    console.log(`✅ Connected to MongoDB: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    console.log('MongoDB connection state:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Connection URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.warn('⚠️  Server will start but database operations may fail');
  }
}

mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  Mongoose disconnected from MongoDB');
});

connectToMongoDB();

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// Seed default packages once DB is ready (safe no-op if already exists)
mongoose.connection.once('open', async () => {
  try {
    const Package = require('./models/Package');
    await Package.ensureDefaults();
  } catch (e) {
    console.error('Package seed error:', e);
  }
  try {
    const { ensureShopMerchDefaults } = require('./services/shopMerchSeed');
    await ensureShopMerchDefaults();
  } catch (e) {
    console.error('Shop merch seed error:', e);
  }
  try {
    const { ensureLibraryDefaults } = require('./services/librarySeed');
    await ensureLibraryDefaults();
  } catch (e) {
    console.error('Library seed error:', e);
  }
});

// Maintenance mode: run first for all /api so only admin (and optionally teacher) can access during maintenance
app.use('/api', maintenanceMiddleware);

// Public routes (no middleware)
app.use('/api/auth', authRoutes);
app.use('/api/mobile', require('./routes/mobile'));
app.use('/api/faq', require('./routes/faq'));
app.use('/api/settings/public', require('./routes/settings'));
app.use('/api/monthly-progress/public', require('./routes/monthlyProgressPublic'));
app.use('/api/new-joiners/public', require('./routes/newJoinersPublic'));
app.use('/api/public/forms', require('./routes/publicForms'));
app.use('/api/packages', packageRoutes);
app.use('/api/products', require('./routes/products'));
app.use('/api/campaigns', require('./routes/campaigns'));
// Library — students & teachers only (auth enforced in router)
app.use('/api/library', checkSessionTimeout, require('./routes/library'));
// Support — no package subscription required (payment-pending users need help)
app.use('/api/support', checkSessionTimeout, supportRoutes);

// Routes with session timeout check
// Admin and teacher routes don't require package subscription
app.use('/api/admin', checkSessionTimeout, adminRoutes);
app.use('/api/admin/notifications', checkSessionTimeout, authenticateToken, requireAdmin, adminNotificationRoutes);
app.use('/api/teacher', checkSessionTimeout, teacherRoutes);
app.use('/api/dev', checkSessionTimeout, devRoutes);

// Settings routes (public settings don't need package, but protected ones do)
app.use('/api/settings', checkSessionTimeout, settingsRoutes);

// Auth routes don't require package subscription
app.use('/api/auth', authRoutes);

// Payment routes - allow access without package so users can purchase packages
// Explicit POST submit-payment so it always matches (avoids router mount path issues)
app.post('/api/payments/:id/submit-payment', checkSessionTimeout, (req, res, next) => {
  req.url = '/' + req.params.id + '/submit-payment';
  paymentRoutes(req, res, next);
});
app.use('/api/payments', checkSessionTimeout, paymentRoutes);

// Package perks routes - allow access to check perks (requires auth but not package)
app.use(
  '/api/package-perks',
  checkSessionTimeout,
  authenticateToken,
  requirePackageSubscription,
  packagePerksRoutes
);

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
    
    // Try to get user's package if authenticated (optional auth header)
    let packageContext = { userPackagePrice: null, isPrivileged: false, isAuthenticatedStudent: false };
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
          const User = require('./models/User');
          const user = await User.findById(decoded.userId);
          if (user) {
            packageContext = await getUserPackagePrice(user);
          }
        }
      }
    } catch (authError) {
      console.log('Auth check failed, showing public courses:', authError.message);
    }

    const packageFilter = buildCoursePackageFilter(packageContext);
    if (packageFilter) {
      query.$and = query.$and || [];
      query.$and.push(packageFilter);
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

// IMPORTANT: Register /enrolled route BEFORE /:id route to prevent route conflicts
// This route must be registered before the /:id route or "enrolled" will be treated as an ID
const { requireVerifiedPayment } = require('./middleware/auth');
app.get('/api/courses/enrolled', checkSessionTimeout, authenticateToken, requireVerifiedPayment, async (req, res) => {
  try {
    const User = require('./models/User');
    const Course = require('./models/Course');
    const CourseProgress = require('./models/CourseProgress');
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[Enrolled Courses] Fetching courses for user: ${user.email}`);

    // Get course IDs from user's enrolledCourses array
    let userEnrolledCourseIds = [];
    if (user.enrolledCourses && Array.isArray(user.enrolledCourses)) {
      userEnrolledCourseIds = user.enrolledCourses
        .map(e => e && e.courseId ? e.courseId.toString() : null)
        .filter(Boolean);
    }

    // Find courses where user is in enrolledStudents array
    let coursesByEnrollment = [];
    try {
      coursesByEnrollment = await Course.find({
        'enrolledStudents.student': user._id,
        $or: [{ isPublished: true }, { status: 'published' }]
      }).populate('teacher', 'firstName lastName').lean();
    } catch (queryError) {
      console.error('[Enrolled Courses] Error querying courses:', queryError);
      throw queryError;
    }

    // Find courses by user's enrolledCourses array
    let coursesByUserArray = [];
    if (userEnrolledCourseIds.length > 0) {
      try {
        const mongoose = require('mongoose');
        const objectIds = userEnrolledCourseIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        
        if (objectIds.length > 0) {
          coursesByUserArray = await Course.find({
            _id: { $in: objectIds },
            $or: [{ isPublished: true }, { status: 'published' }]
          }).populate('teacher', 'firstName lastName').lean();
        }
      } catch (error) {
        console.error('[Enrolled Courses] Error fetching courses by user.enrolledCourses:', error);
      }
    }

    // Combine and deduplicate courses
    const allCourseIds = new Set();
    const enrolledCourses = [];
    
    coursesByEnrollment.forEach(course => {
      const courseId = course._id.toString();
      if (!allCourseIds.has(courseId)) {
        allCourseIds.add(courseId);
        enrolledCourses.push(course);
      }
    });

    coursesByUserArray.forEach(course => {
      const courseId = course._id.toString();
      if (!allCourseIds.has(courseId)) {
        allCourseIds.add(courseId);
        enrolledCourses.push(course);
      }
    });

    // Hide courses the student's package is not allowed to access (e.g. legacy auto-enrolls)
    const packageContext = await getUserPackagePrice(user);
    const packageAllowedCourses = enrolledCourses.filter((course) =>
      canAccessCourseByPackage(course, packageContext.userPackagePrice, {
        isPrivileged: packageContext.isPrivileged,
      })
    );
    if (packageAllowedCourses.length !== enrolledCourses.length) {
      console.log(
        `[Enrolled Courses] Filtered by package $${packageContext.userPackagePrice}: ${packageAllowedCourses.length}/${enrolledCourses.length}`
      );
    }
    
    // Get progress records
    let progressRecords = [];
    try {
      progressRecords = await CourseProgress.find({ student: user._id }).lean();
    } catch (progressError) {
      console.error('[Enrolled Courses] Error fetching progress:', progressError);
    }
    
    // Format courses
    const formattedCourses = packageAllowedCourses.map(course => {
      try {
        const courseId = course._id.toString();
        const enrollment = course.enrolledStudents?.find(
          e => e.student && e.student.toString() === user._id.toString()
        );
        
        const progressRecord = progressRecords.find(
          p => {
            if (!p.course) return false;
            const progressCourseId = p.course.toString ? p.course.toString() : (p.course._id ? p.course._id.toString() : String(p.course));
            return progressCourseId === courseId;
          }
        );
        
        let progress = 0;
        let completedContent = 0;
        let totalContent = 0;
        
        if (progressRecord && progressRecord.overallProgress) {
          progress = progressRecord.overallProgress.percentage || 0;
          completedContent = progressRecord.overallProgress.completedContent || 0;
          totalContent = progressRecord.overallProgress.totalContent || 0;
        } else if (enrollment) {
          progress = enrollment.progress || 0;
          completedContent = (enrollment.completedVideos && Array.isArray(enrollment.completedVideos)) ? enrollment.completedVideos.length : 0;
        }
        
        if (totalContent === 0) {
          if (course.content && Array.isArray(course.content)) {
            totalContent = course.content.length;
          } else if (course.videos && Array.isArray(course.videos)) {
            totalContent = course.videos.length;
          }
        }
        
        return {
          _id: course._id,
          title: course.title || 'Untitled Course',
          description: course.description || '',
          instructor: course.teacher ? {
            firstName: course.teacher.firstName || '',
            lastName: course.teacher.lastName || ''
          } : { firstName: '', lastName: '' },
          teacher: course.teacher,
          progress: Math.round(progress),
          totalLessons: totalContent,
          completedLessons: completedContent,
          category: course.category || 'Uncategorized',
          level: course.level || 'Beginner',
          rating: course.rating || 0,
          thumbnail: course.thumbnail,
          totalDuration: course.totalDuration || 0,
          price: course.price || 0,
          currency: course.currency || 'USD'
        };
      } catch (error) {
        console.error(`[Enrolled Courses] Error formatting course ${course._id}:`, error);
        return {
          _id: course._id,
          title: course.title || 'Untitled Course',
          description: course.description || '',
          instructor: { firstName: '', lastName: '' },
          teacher: course.teacher,
          progress: 0,
          totalLessons: 0,
          completedLessons: 0,
          category: course.category || 'Uncategorized',
          level: course.level || 'Beginner',
          rating: course.rating || 0,
          thumbnail: course.thumbnail,
          totalDuration: course.totalDuration || 0,
          price: course.price || 0,
          currency: course.currency || 'USD'
        };
      }
    });
    
    console.log(`[Enrolled Courses] Returning ${formattedCourses.length} courses`);
    res.json(formattedCourses);
  } catch (error) {
    console.error('[Enrolled Courses] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch enrolled courses', 
      message: error.message 
    });
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

    let packageContext = { userPackagePrice: null, isPrivileged: false, isAuthenticatedStudent: false };
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
          const User = require('./models/User');
          const user = await User.findById(decoded.userId);
          if (user) {
            packageContext = await getUserPackagePrice(user);
            if (
              !canAccessCourseByPackage(course, packageContext.userPackagePrice, {
                isPrivileged: packageContext.isPrivileged,
              })
            ) {
              return res.status(403).json({
                error: 'This course is not included in your subscription package.',
                code: 'PACKAGE_REQUIRED',
              });
            }
          }
        }
      }
    } catch (authError) {
      console.log('Course detail auth check skipped:', authError.message);
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
app.use('/api/news', checkSessionTimeout, authenticateToken, requirePackageSubscription, newsRoutes);
app.use('/api/promos', checkSessionTimeout, authenticateToken, requirePackageSubscription, promoRoutes);
app.use('/api/assignments', checkSessionTimeout, authenticateToken, requirePackageSubscription, assignmentRoutes);
app.use('/api/upload', checkSessionTimeout, authenticateToken, requirePackageSubscription, uploadRoutes);
app.use('/api/mt5', checkSessionTimeout, authenticateToken, requirePackageSubscription, mt5Routes);
app.use('/api/referrals', checkSessionTimeout, authenticateToken, requirePackageSubscription, referralRoutes);
app.use('/api/rank-rewards', checkSessionTimeout, authenticateToken, requirePackageSubscription, rankRewardRoutes);
// Withdrawals routes - admin routes don't need package subscription
app.use(
  '/api/withdrawals',
  checkSessionTimeout,
  authenticateToken,
  requirePackageSubscription,
  withdrawalRoutes
);
app.use('/api/trades', checkSessionTimeout, authenticateToken, requirePackageSubscription, tradeRoutes);

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
