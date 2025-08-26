const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { authenticateToken, requireTeacher, requireOwnership, requireEnrollment } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all published courses
// @access  Public
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
// @access  Private
router.get('/enrolled', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find courses where the user is enrolled
    const enrolledCourses = await Course.find({
      'enrolledStudents.student': user._id
    }).populate('teacher', 'firstName lastName');
    
    // Format the response with user-specific progress
    const formattedCourses = enrolledCourses.map(course => {
      const enrollment = course.enrolledStudents.find(
        e => e.student.toString() === user._id.toString()
      );
      
      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        teacher: course.teacher,
        progress: enrollment ? enrollment.progress : 0,
        totalLessons: course.content ? course.content.length : (course.videos ? course.videos.length : 0),
        completedLessons: enrollment ? enrollment.completedVideos.length : 0,
        category: course.category,
        level: course.level,
        rating: course.rating,
        thumbnail: course.thumbnail,
        totalDuration: course.totalDuration,
        price: course.price,
        currency: course.currency
      };
    });
    
    res.json(formattedCourses);
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'firstName lastName profileImage email')
      .populate('enrolledStudents.student', 'firstName lastName profileImage');
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(course);
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

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
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
router.post('/:id/enroll', authenticateToken, async (req, res) => {
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
    await course.save();

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

    await req.course.save();

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
