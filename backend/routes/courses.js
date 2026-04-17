const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { authenticateToken, requireTeacher, requireOwnership, requireEnrollment, requireVerifiedPayment } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all published courses (filtered by user's package if authenticated)
// @access  Public (with package filtering for authenticated users)
router.get('/', async (req, res) => {
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
    
    // Get user's package price if authenticated
    let userPackagePrice = null;
    if (req.user) {
      // Admin/teacher can see all courses
      if (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'instructor') {
        userPackagePrice = null; // null means show all
      } else {
        // Get user's package price from completed payment
        const Payment = require('../models/Payment');
        const completedPayment = await Payment.findOne({
          user: req.user._id,
          status: 'completed',
          type: 'package'
        }).sort({ createdAt: -1 });
        
        if (completedPayment && completedPayment.package && completedPayment.package.price) {
          userPackagePrice = completedPayment.package.price;
        }
      }
    }
    
    // Filter by package: show courses where allowedPackages is null (for all) OR includes user's package
    if (userPackagePrice !== null) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { allowedPackages: null }, // For all packages
          { allowedPackages: { $exists: false } }, // Backward compatibility
          { allowedPackages: { $size: 0 } }, // Empty array means for all
          { allowedPackages: userPackagePrice } // MongoDB matches if value is in array
        ]
      });
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

// @route   GET /api/courses/enrolled
// @desc    Get enrolled courses for a student
// @access  Private (Requires verified payment)
router.get('/enrolled', authenticateToken, requireVerifiedPayment, async (req, res) => {
  try {
    console.log('[Enrolled Courses] ========== ROUTE HIT ==========');
    console.log('[Enrolled Courses] Route: /api/courses/enrolled');
    console.log('[Enrolled Courses] User ID from req.user:', req.user?._id);
    console.log('[Enrolled Courses] User role:', req.user?.role);
    
    if (!req.user || !req.user._id) {
      console.error('[Enrolled Courses] No user in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('[Enrolled Courses] User not found:', req.user._id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[Enrolled Courses] Fetching courses for user: ${user.email} (${user._id})`);
    console.log(`[Enrolled Courses] User isVerified: ${user.isVerified}, role: ${user.role}`);

    // Get course IDs from user's enrolledCourses array
    let userEnrolledCourseIds = [];
    if (user.enrolledCourses && Array.isArray(user.enrolledCourses)) {
      userEnrolledCourseIds = user.enrolledCourses
        .map(e => {
          if (e && e.courseId) {
            return e.courseId.toString ? e.courseId.toString() : String(e.courseId);
          }
          return null;
        })
        .filter(Boolean);
    }
    console.log(`[Enrolled Courses] User has ${userEnrolledCourseIds.length} courses in enrolledCourses array:`, userEnrolledCourseIds);

    // Find courses where user is in enrolledStudents array
    console.log('[Enrolled Courses] Querying courses by enrolledStudents...');
    let coursesByEnrollment = [];
    try {
      coursesByEnrollment = await Course.find({
        'enrolledStudents.student': user._id,
        $or: [
          { isPublished: true },
          { status: 'published' }
        ]
      }).populate('teacher', 'firstName lastName').lean();
      console.log(`[Enrolled Courses] Found ${coursesByEnrollment.length} courses via enrolledStudents`);
    } catch (queryError) {
      console.error('[Enrolled Courses] Error querying courses by enrolledStudents:', queryError);
      console.error('[Enrolled Courses] Query error stack:', queryError.stack);
      throw queryError; // Re-throw to be caught by outer catch
    }

    // Find courses by user's enrolledCourses array
    let coursesByUserArray = [];
    if (userEnrolledCourseIds.length > 0) {
      try {
        // Convert string IDs back to ObjectIds for MongoDB query
        const mongoose = require('mongoose');
        const objectIds = userEnrolledCourseIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        
        if (objectIds.length > 0) {
          coursesByUserArray = await Course.find({
            _id: { $in: objectIds },
            $or: [
              { isPublished: true },
              { status: 'published' }
            ]
          }).populate('teacher', 'firstName lastName').lean();
          console.log(`[Enrolled Courses] Found ${coursesByUserArray.length} courses via user.enrolledCourses`);
        }
      } catch (error) {
        console.error('[Enrolled Courses] Error fetching courses by user.enrolledCourses:', error);
        coursesByUserArray = [];
      }
    }

    // Combine and deduplicate courses
    const allCourseIds = new Set();
    const enrolledCourses = [];
    
    // Add courses from enrolledStudents
    coursesByEnrollment.forEach(course => {
      const courseId = course._id.toString();
      if (!allCourseIds.has(courseId)) {
        allCourseIds.add(courseId);
        enrolledCourses.push(course);
      }
    });

    // Add courses from user.enrolledCourses that weren't already added
    coursesByUserArray.forEach(course => {
      const courseId = course._id.toString();
      if (!allCourseIds.has(courseId)) {
        allCourseIds.add(courseId);
        enrolledCourses.push(course);
      }
    });

    console.log(`[Enrolled Courses] Total unique enrolled courses: ${enrolledCourses.length}`);
    
    // Get all progress records for the student
    console.log('[Enrolled Courses] Fetching progress records...');
    const CourseProgress = require('../models/CourseProgress');
    let progressRecords = [];
    try {
      progressRecords = await CourseProgress.find({ student: user._id }).lean();
      console.log(`[Enrolled Courses] Found ${progressRecords.length} progress records`);
    } catch (progressError) {
      console.error('[Enrolled Courses] Error fetching progress records:', progressError);
      console.error('[Enrolled Courses] Progress error stack:', progressError.stack);
      // Continue without progress records rather than failing
      progressRecords = [];
    }
    
    // Format the response with user-specific progress from the new progress tracking system
    const formattedCourses = enrolledCourses.map(course => {
      try {
        const courseId = course._id.toString();
        const enrollment = course.enrolledStudents?.find(
          e => e.student && e.student.toString() === user._id.toString()
        );
        
        // Find progress record for this course
        const progressRecord = progressRecords.find(
          p => {
            if (!p.course) return false;
            const progressCourseId = p.course.toString ? p.course.toString() : (p.course._id ? p.course._id.toString() : String(p.course));
            return progressCourseId === courseId;
          }
        );
        
        // Use new progress system if available, otherwise fall back to old system
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
        
        // If totalContent is 0, try to get it from course content
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
        // Return a basic course object even if formatting fails
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
    
    console.log(`[Enrolled Courses] Returning ${formattedCourses.length} formatted courses`);
    res.json(formattedCourses);
  } catch (error) {
    console.error('[Enrolled Courses] Error fetching enrolled courses:', error);
    console.error('[Enrolled Courses] Error stack:', error.stack);
    console.error('[Enrolled Courses] Error details:', {
      message: error.message,
      name: error.name,
      userId: req.user?._id
    });
    res.status(500).json({ 
      error: 'Failed to fetch enrolled courses', 
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID (only published courses)
// @access  Public
router.get('/:id', async (req, res) => {
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
    
    // Log course data for debugging
    console.log('Course data being returned:', {
      id: courseData._id,
      title: courseData.title,
      contentLength: courseData.content?.length || 0,
      videosLength: courseData.videos?.length || 0,
      totalVideos: courseData.totalVideos,
      totalDuration: courseData.totalDuration
    });
    
    res.json(courseData);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// @route   POST /api/courses
// @desc    Create new course
// @access  Private/Teacher
router.post('/', [
  authenticateToken,
  requireTeacher,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').isIn(['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general']).withMessage('Invalid category'),
  body('level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const courseData = {
      ...req.body,
              teacher: req.user._id
    };

    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      message: 'Course created successfully',
      course
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private/Teacher (owner)
router.put('/:id', [
  authenticateToken,
  requireOwnership('Course'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('category').optional().isIn(['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general']).withMessage('Invalid category'),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Fetch existing course to preserve fields not in update
    const existingCourse = await Course.findById(req.params.id);
    if (!existingCourse) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Fields that should be preserved if not provided in update
    const fieldsToPreserve = [
      'content', 'videos', 'requirements', 'learningOutcomes', 
      'quizzes', 'tags', 'enrolledStudents', 'totalStudents',
      'rating', 'totalRatings', 'isFeatured', 'language',
      'certificate', 'status', 'allowedPackages', 'teacher'
    ];
    
    // Build update object: only update fields that are provided in req.body
    const updateData = { ...req.body };
    
    // Preserve existing fields if they're not in the update
    fieldsToPreserve.forEach(field => {
      if (!(field in updateData) && existingCourse[field] !== undefined) {
        updateData[field] = existingCourse[field];
      }
    });

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('teacher', 'firstName lastName profileImage');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      message: 'Course updated successfully',
      course
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private/Teacher (owner)
router.delete('/:id', authenticateToken, requireOwnership('Course'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Course deleted successfully' });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in course
// @access  Private
// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private (Requires verified payment)
router.post('/:id/enroll', authenticateToken, requireVerifiedPayment, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!course.isPublished && course.status !== 'published') {
      return res.status(400).json({ error: 'Course is not published' });
    }

    // Check if already enrolled
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === req.user._id.toString()
    );

    if (isEnrolled) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    course.enrollStudent(req.user._id);
    await course.save({ validateBeforeSave: false });

    // Also update the user's enrolled courses
    const user = await User.findById(req.user._id);
    if (user) {
      // Check if user is already enrolled in this course
      const isUserEnrolled = user.enrolledCourses.some(
        enrollment => enrollment.courseId.toString() === course._id.toString()
      );
      
      if (!isUserEnrolled) {
        user.enrolledCourses.push({
          courseId: course._id,
          enrolledAt: new Date(),
          progress: 0,
          completedLessons: 0,
          totalLessons: course.content ? course.content.length : (course.videos ? course.videos.length : 0),
          lastAccessed: new Date()
        });
        await user.save();
      }
    }

    res.json({
      message: 'Enrolled successfully',
      course
    });

  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// @route   GET /api/courses/:id/progress
// @desc    Get course progress
// @access  Private (enrolled students)
router.get('/:id/progress', authenticateToken, requireEnrollment, async (req, res) => {
  try {
    const enrollment = req.course.enrolledStudents.find(
      e => e.student.toString() === req.user._id.toString()
    );

    if (!enrollment) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    res.json({
      progress: enrollment.progress,
      completedVideos: enrollment.completedVideos,
      lastAccessed: enrollment.lastAccessed
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// @route   PUT /api/courses/:id/progress
// @desc    Update course progress
// @access  Private (enrolled students)
router.put('/:id/progress', authenticateToken, requireEnrollment, async (req, res) => {
  try {
    const { videoId, completed } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Find the enrollment
    const enrollment = req.course.enrolledStudents.find(
      e => e.student.toString() === req.user._id.toString()
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (completed) {
      // Add video to completed list if not already there
      if (!enrollment.completedVideos.includes(videoId)) {
        enrollment.completedVideos.push(videoId);
      }
    } else {
      // Remove video from completed list
      enrollment.completedVideos = enrollment.completedVideos.filter(
        id => id.toString() !== videoId.toString()
      );
    }

    // Calculate progress percentage based on total content
    const totalContent = req.course.content ? req.course.content.length : (req.course.videos ? req.course.videos.length : 0);
    enrollment.progress = totalContent > 0 ? Math.round((enrollment.completedVideos.length / totalContent) * 100) : 0;
    enrollment.lastAccessed = new Date();

    await req.course.save({ validateBeforeSave: false });

    res.json({
      message: 'Progress updated successfully',
      progress: enrollment.progress,
      completedVideos: enrollment.completedVideos,
      totalVideos: req.course.videos.length
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;
