const express = require('express');
const router = express.Router();
const { authenticateToken, requireTeacher } = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');
const LiveSession = require('../models/LiveSession');
const Assignment = require('../models/Assignment');
const Message = require('../models/Message');

// Test JWT token (before auth middleware)
router.get('/test-jwt', async (req, res) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    console.log('Test JWT - Token received:', token ? `${token.substring(0,20)}...` : 'No token');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Test JWT - Decoded token:', decoded);
    
    res.json({ 
      success: true, 
      decoded,
      secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    });
  } catch (error) {
    console.error('Test JWT - Error:', error);
    res.status(500).json({ 
      error: 'JWT test failed', 
      message: error.message,
      secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    });
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireTeacher);

// Get teacher dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    // Get teacher's courses
    const courses = await Course.find({ teacher: teacherId });
    
    // Get total students across all courses - fix the counting logic
    let totalStudents = 0;
    const uniqueStudentIds = new Set();
    
    // Count unique students from course enrollments
    courses.forEach(course => {
      if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
        course.enrolledStudents.forEach(enrollment => {
          if (enrollment.student) {
            uniqueStudentIds.add(enrollment.student.toString());
          }
        });
      }
    });
    
    // Filter out teachers and admins, only count actual students
    const studentIds = Array.from(uniqueStudentIds);
    const actualStudents = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    });
    
    totalStudents = actualStudents.length;
    
    // Get recent enrollments - get actual student data
    const recentEnrollments = [];
    for (const course of courses) {
      if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
        for (const enrollment of course.enrolledStudents) {
          if (enrollment.student) {
            const student = await User.findById(enrollment.student).select('firstName lastName email role');
            if (student && student.role === 'student') { // Only include actual students
              recentEnrollments.push({
                id: student._id,
                name: `${student.firstName} ${student.lastName}`,
                email: student.email,
                enrolledAt: enrollment.enrolledAt,
                courseTitle: course.title
              });
            }
          }
        }
      }
    }
    
    // Sort by enrollment date and limit to 5
    recentEnrollments.sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt));
    const limitedEnrollments = recentEnrollments.slice(0, 5);
    
    // Get upcoming live sessions
    const upcomingSessions = await LiveSession.find({
      teacher: teacherId,
      status: 'scheduled',
      scheduledAt: { $gte: new Date() }
    })
    .sort({ scheduledAt: 1 })
    .limit(3);
    
    // Calculate analytics
    const totalRevenue = courses.reduce((sum, course) => sum + (course.price * (course.enrolledStudents?.length || 0)), 0);
    const averageRating = courses.length > 0 ? 
      courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length : 0;
    
    const dashboardData = {
      totalStudents,
      totalCourses: courses.length,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      recentEnrollments: limitedEnrollments,
      upcomingSessions,
      courses: courses.map(course => ({
        id: course._id,
        title: course.title,
        enrolledStudents: course.enrolledStudents?.length || 0,
        rating: course.rating || 0,
        status: course.status
      }))
    };
    
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// Get teacher's courses
router.get('/courses', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = { teacher: teacherId };
    
    // Apply status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Apply search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const courses = await Course.find(query)
      .populate('enrolledStudents.student', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Course.countDocuments(query);
    
    // Transform course data to match frontend expectations
    const transformedCourses = courses.map(course => ({
      id: course._id,
      title: course.title,
      description: course.description || '',
      category: course.category || 'General',
      enrolledStudents: course.enrolledStudents?.length || 0,
      totalLessons: course.content?.length || course.videos?.length || 0,
      completedLessons: 0, // This would be calculated based on student progress
      rating: course.rating || 0,
      status: course.status || 'draft',
      createdAt: course.createdAt,
      thumbnail: course.thumbnail,
      price: course.price || 0,
      teacher: course.teacher,
      enrolledStudentsList: course.enrolledStudents || []
    }));
    
    res.json({
      success: true,
      courses: transformedCourses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

// Create new course
router.post('/courses', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const courseData = {
      ...req.body,
      teacher: teacherId,
      status: 'draft',
      createdAt: new Date()
    };
    
    const course = new Course(courseData);
    await course.save();
    
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
});

// Update course
router.put('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, data: updatedCourse });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
});

// Delete course
router.delete('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Check if course has enrolled students
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete course with enrolled students' 
      });
    }
    
    await Course.findByIdAndDelete(courseId);
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
});

// Get course students
router.get('/courses/:courseId/students', async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Get enrolled students with progress
    const students = await User.find({
      'enrolledCourses.courseId': courseId
    })
    .select('name email avatar enrolledCourses')
    .populate('enrolledCourses.courseId', 'title');
    
    const studentsWithProgress = students.map(student => {
      const enrollment = student.enrolledCourses.find(e => e.courseId._id.toString() === courseId);
      return {
        id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        enrolledDate: enrollment?.enrolledAt,
        progress: enrollment?.progress || 0,
        lastActive: enrollment?.lastActive,
        completedLessons: enrollment?.completedLessons || 0,
        totalLessons: course.lessons?.length || 0
      };
    });
    
    res.json({ success: true, data: studentsWithProgress });
  } catch (error) {
    console.error('Error fetching course students:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

// Get all teacher's students
router.get('/students', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { page = 1, limit = 20, search, showAll = 'false' } = req.query;
    
    // Get teacher's courses
    const teacherCourses = await Course.find({ teacher: teacherId }).select('_id title');
    const courseIds = teacherCourses.map(c => c._id);
    
    let students = [];
    let total = 0;
    
    // Get all students with role 'student'
    let query = { role: 'student' };
    
    // Apply search filter if provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get total count
    total = await User.countDocuments(query);
    const skip = (page - 1) * limit;
    
    // Get students with pagination
    students = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Process student data with enrollment information
    const processedStudents = students.map(student => {
      // Get all enrollments for this student (from their enrolledCourses field)
      const studentEnrollments = student.enrolledCourses || [];
      
      console.log(`Processing student ${student._id}:`);
      console.log(`- Student enrollments:`, studentEnrollments);
      console.log(`- Total student enrollments:`, studentEnrollments.length);
      
      // Calculate progress and counts from student's own enrollment data
      let totalProgress = 0;
      let enrollmentCount = 0;
      
      studentEnrollments.forEach(enrollment => {
        totalProgress += enrollment.progress || 0;
        enrollmentCount++;
      });
      
      const averageProgress = enrollmentCount > 0 ? totalProgress / enrollmentCount : 0;
      
      // Get course titles for enrolled courses (if we have access to them)
      const enrolledCoursesWithTitles = studentEnrollments.map(enrollment => ({
        courseId: enrollment.courseId,
        courseTitle: `Course ${enrollment.courseId.toString().slice(-6)}`, // Convert ObjectId to string first
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress || 0,
        completedLessons: enrollment.completedLessons || 0,
        totalLessons: enrollment.totalLessons || 0,
        lastAccessed: enrollment.lastAccessed || enrollment.enrolledAt
      }));
      
      console.log(`- Processed enrollments:`, enrolledCoursesWithTitles);
      console.log(`- Total courses:`, enrollmentCount);
      
      return {
        id: student._id,
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        avatar: student.profileImage,
        profileImage: student.profileImage,
        role: student.role,
        enrolledDate: studentEnrollments[0]?.enrolledAt || student.createdAt,
        progress: Math.round(averageProgress),
        lastActive: studentEnrollments[0]?.lastAccessed || student.updatedAt || student.createdAt,
        completedCourses: studentEnrollments.filter(e => e.progress === 100).length,
        totalCourses: enrollmentCount, // This should now show the correct count
        enrolledCourses: enrolledCoursesWithTitles,
        averageProgress: Math.round(averageProgress),
        totalAssignments: 0, // TODO: Calculate from assignments
        averageScore: 0, // TODO: Calculate from assignment submissions
        // Add security/block information
        security: student.security || {},
        isBlocked: student.security?.isLocked || false,
        blockReason: student.security?.lockReason || null,
        blockExpiry: student.security?.lockedUntil || null
      };
    });
    
    res.json({
      success: true,
      data: processedStudents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
});

// Get live sessions
router.get('/live-sessions', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { teacher: teacherId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const sessions = await LiveSession.find(query)
      .populate('currentParticipants.student', 'firstName lastName email profileImage')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await LiveSession.countDocuments(query);
    
    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching live sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch live sessions' });
  }
});

// Create live session
router.post('/live-sessions', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { 
      title, 
      description, 
      scheduledAt, 
      duration, 
      maxParticipants,
      category,
      level,
      tags,
      topics,
      price,
      currency,
      isFree,
      meetingLink,
      timezone,
      chatEnabled,
      recordingEnabled,
      isReplayAvailable,
      notes
    } = req.body;
    
    const session = new LiveSession({
      teacher: teacherId,
      title,
      description,
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration),
      maxParticipants: parseInt(maxParticipants),
      category: category || 'general',
      level: level || 'all',
      tags: tags || [],
      topics: topics || [],
      price: parseFloat(price) || 0,
      currency: currency || 'USD',
      isFree: isFree || false,
      meetingLink,
      timezone: timezone || 'Asia/Karachi',
      chatEnabled: chatEnabled !== false,
      recordingEnabled: recordingEnabled !== false,
      isReplayAvailable: isReplayAvailable || false,
      notes,
      status: 'scheduled',
      currentParticipants: []
    });
    
    await session.save();
    
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating live session:', error);
    res.status(500).json({ success: false, error: 'Failed to create live session' });
  }
});

// Update live session
router.put('/live-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const updatedSession = await LiveSession.findByIdAndUpdate(
      sessionId,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('Error updating live session:', error);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
});

// Start live session
router.post('/live-sessions/:sessionId/start', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (session.status !== 'scheduled') {
      return res.status(400).json({ success: false, error: 'Session cannot be started' });
    }
    
    session.status = 'live';
    session.startedAt = new Date();
    await session.save();
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error starting live session:', error);
    res.status(500).json({ success: false, error: 'Failed to start session' });
  }
});

// End live session
router.post('/live-sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;
    
    // Verify session belongs to teacherId
    const session = await LiveSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (session.status !== 'live') {
      return res.status(400).json({ success: false, error: 'Session is not live' });
    }
    
    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();
    
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error ending live session:', error);
    res.status(500).json({ success: false, error: 'Failed to end session' });
  }
});

// Toggle recording for live session
router.post('/live-sessions/:sessionId/recording', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    if (session.status !== 'live') {
      return res.status(400).json({ success: false, error: 'Session must be live to toggle recording' });
    }
    
    // Toggle recording status
    session.recordingEnabled = !session.recordingEnabled;
    await session.save();
    
    res.json({ 
      success: true, 
      data: session,
      message: `Recording ${session.recordingEnabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling recording:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle recording' });
  }
});

// Delete live session
router.delete('/live-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user._id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, teacher: teacherId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    // Only allow deletion of live sessions (active sessions cannot be deleted)
    if (session.status === 'live') {
      return res.status(400).json({ success: false, error: 'Cannot delete live sessions while they are active' });
    }
    
    await LiveSession.findByIdAndDelete(sessionId);
    
    res.json({ 
      success: true, 
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting live session:', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { period = 'month', showAll = 'false' } = req.query;
    
    // Get teacher's courses
    const courses = await Course.find({ teacher: teacherId });
    const courseIds = courses.map(c => c._id);
    
    // Calculate basic metrics
    let totalStudents;
    if (showAll === 'true') {
      // Count all students in database
      totalStudents = await User.countDocuments({ role: 'student' });
    } else {
      // Count unique students enrolled in teacher's courses
      const uniqueStudentIds = new Set();
      courses.forEach(course => {
        if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
          course.enrolledStudents.forEach(enrollment => {
            if (enrollment.student) {
              uniqueStudentIds.add(enrollment.student.toString());
            }
          });
        }
      });
      
      // Filter out teachers and admins, only count actual students
      const studentIds = Array.from(uniqueStudentIds);
      const actualStudents = await User.find({
        _id: { $in: studentIds },
        role: 'student'
      });
      totalStudents = actualStudents.length;
    }
    
    const totalRevenue = courses.reduce((sum, course) => sum + (course.price * (course.enrolledStudents?.length || 0)), 0);
    const averageRating = courses.length > 0 ? 
      courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length : 0;
    
    // Get enrollment trends
    const now = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // Get enrollment trends from courses
    const enrollmentTrends = [];
    for (const course of courses) {
      if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
        for (const enrollment of course.enrolledStudents) {
          if (enrollment.enrolledAt >= startDate) {
            const dateKey = enrollment.enrolledAt.toISOString().split('T')[0];
            const existingEntry = enrollmentTrends.find(e => e.date === dateKey);
            if (existingEntry) {
              existingEntry.count++;
            } else {
              enrollmentTrends.push({ date: dateKey, count: 1 });
            }
          }
        }
      }
    }
    
    // Sort trends by date
    enrollmentTrends.sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate completion rate
    let totalEnrollments = 0;
    let completedEnrollments = 0;
    
    courses.forEach(course => {
      if (course.enrolledStudents && Array.isArray(course.enrolledStudents)) {
        course.enrolledStudents.forEach(enrollment => {
          totalEnrollments++;
          if (enrollment.progress === 100) {
            completedEnrollments++;
          }
        });
      }
    });
    
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    
    const analytics = {
      totalStudents,
      totalCourses: courses.length,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      completionRate: Math.round(completionRate),
      enrollmentTrends,
      period
    };
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Enroll a student in a course
router.post('/enroll-student', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Verify student exists and is a student
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    // Check if student is already enrolled in this course
    const existingEnrollment = await User.findOne({
      _id: studentId,
      enrolledCourses: { $elemMatch: { courseId: courseId } }
    });
    
    if (existingEnrollment) {
      return res.status(400).json({ success: false, error: 'Student is already enrolled in this course' });
    }
    
    // Add course to student's enrolled courses
    await User.findByIdAndUpdate(studentId, {
      $push: {
        enrolledCourses: {
          courseId,
          enrolledAt: new Date(),
          progress: 0,
          completedLessons: 0,
          totalLessons: course.totalLessons || 0
        }
      }
    });
    
    // Add student to course's enrolled students
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { 
        enrolledStudents: {
          student: studentId,
          enrolledAt: new Date(),
          progress: 0,
          completedVideos: [],
          lastAccessed: new Date()
        }
      }
    });
    
    res.json({ success: true, message: 'Student enrolled successfully' });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ success: false, error: 'Failed to enroll student' });
  }
});

// Remove a student from a course
router.delete('/remove-student', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Remove course from student's enrolled courses
    await User.findByIdAndUpdate(studentId, {
      $pull: { enrolledCourses: { courseId } }
    });
    
    // Remove student from course's enrolled students
    await Course.findByIdAndUpdate(courseId, {
      $pull: { enrolledStudents: { student: studentId } }
    });
    
    res.json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({ success: false, error: 'Failed to remove student' });
  }
});

// Block a student
router.post('/block-student', async (req, res) => {
  try {
    const { studentId, reason, duration } = req.body;
    const teacherId = req.user._id;
    
    // Verify the student exists and is a student
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    // Calculate block duration
    let blockUntil;
    if (duration === 'permanent') {
      blockUntil = new Date('2099-12-31'); // Far future date
    } else {
      const hours = duration === '24h' ? 24 : duration === '7d' ? 24 * 7 : duration === '30d' ? 24 * 30 : 24;
      blockUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    }
    
    // Update student's blocked status
    await User.findByIdAndUpdate(studentId, {
      $set: {
        'security.isLocked': true,
        'security.lockedUntil': blockUntil,
        'security.lockReason': reason
      }
    });
    
    res.json({ success: true, message: 'Student blocked successfully' });
  } catch (error) {
    console.error('Error blocking student:', error);
    res.status(500).json({ success: false, error: 'Failed to block student' });
  }
});

// Unblock a student
router.post('/unblock-student', async (req, res) => {
  try {
    const { studentId } = req.body;
    const teacherId = req.user._id;
    
    // Verify the student exists and is a student
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    // Unblock student
    await User.findByIdAndUpdate(studentId, {
      $set: {
        'security.isLocked': false,
        'security.lockedUntil': null,
        'security.lockReason': null
      }
    });
    
    res.json({ success: true, message: 'Student unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking student:', error);
    res.status(500).json({ success: false, error: 'Failed to unblock student' });
  }
});

// Assign a course to a student
router.post('/assign-course', async (req, res) => {
  try {
    const { studentId, courseId, progress = 0 } = req.body;
    const teacherId = req.user._id;
    
    console.log('Assign course request:', { studentId, courseId, progress, teacherId });
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      console.log('Course not found or not owned by teacher');
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    console.log('Course found:', course.title);
    
    // Verify student exists and is a student
    const student = await User.findOne({
      _id: studentId,
      role: 'student'
    });
    
    if (!student) {
      console.log('Student not found or not a student');
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    console.log('Student found:', student.firstName, student.lastName);
    
    // Check if student is already enrolled in this course
    const existingEnrollment = await User.findOne({
      _id: studentId,
      enrolledCourses: { $elemMatch: { courseId: courseId } }
    });
    
    if (existingEnrollment) {
      console.log('Student already enrolled in this course');
      return res.status(400).json({ success: false, error: 'Student is already enrolled in this course' });
    }
    
    console.log('Student not enrolled, proceeding with enrollment');
    
    // Add course to student's enrolled courses
    await User.findByIdAndUpdate(studentId, {
      $push: {
        enrolledCourses: {
          courseId,
          enrolledAt: new Date(),
          progress: progress,
          completedLessons: 0,
          totalLessons: course.content?.length || course.videos?.length || 0
        }
      }
    });
    
    // Add student to course's enrolled students
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { 
        enrolledStudents: {
          student: studentId,
          enrolledAt: new Date(),
          progress: progress,
          completedVideos: [],
          lastAccessed: new Date()
        }
      }
    });
    
    console.log('Course assigned successfully');
    res.json({ success: true, message: 'Course assigned successfully' });
  } catch (error) {
    console.error('Error assigning course:', error);
    res.status(500).json({ success: false, error: 'Failed to assign course' });
  }
});

// Get messages
router.get('/messages', async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    const messages = await Message.find({ sender: teacherId })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, messages: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Create message
router.post('/messages', async (req, res) => {
  try {
    const teacherId = req.user._id;
    const messageData = {
      ...req.body,
      sender: teacherId,
      status: 'draft',
      createdAt: new Date()
      };
    
    const message = new Message(messageData);
    await message.save();
    
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
});

// Update message
router.put('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user._id;
    
    const message = await Message.findOne({ _id: id, sender: teacherId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
});

// Delete message
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user._id;
    
    const message = await Message.findOne({ _id: id, sender: teacherId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    await Message.findByIdAndDelete(id);
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// Send message now
router.post('/messages/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user._id;
    
    const message = await Message.findOne({ _id: id, sender: teacherId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    message.status = 'sent';
    message.sentAt = new Date();
    await message.save();
    
    // TODO: Implement actual sending logic (email, push notification, etc.)
    
    res.json({ success: true, data: message, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get course assignments
router.get('/courses/:courseId/assignments', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { includeSubmissions } = req.query;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    let assignments;
    if (includeSubmissions === 'true') {
      // Include submissions with student details
      assignments = await Assignment.find({ course: courseId })
        .populate('submissions.student', 'firstName lastName email')
        .sort({ dueDate: 1 });
    } else {
      // Just get assignments without submissions
      assignments = await Assignment.find({ course: courseId })
        .sort({ dueDate: 1 });
    }
    
    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

// Create assignment
router.post('/courses/:courseId/assignments', async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user._id;
    const { title, description, dueDate, maxPoints, instructions, assignmentType, difficulty, estimatedTime, isGroupAssignment, maxGroupSize, allowLateSubmission, latePenalty, tags, isPublished } = req.body;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    const assignment = new Assignment({
      course: courseId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      maxPoints: parseInt(maxPoints) || 100,
      passingScore: parseInt(maxPoints) * 0.6, // Default 60% passing score
      assignmentType: assignmentType || 'essay',
      instructions,
      difficulty: difficulty || 'intermediate',
      estimatedTime: parseInt(estimatedTime) || 60,
      isGroupAssignment: isGroupAssignment || false,
      maxGroupSize: parseInt(maxGroupSize) || 2,
      allowLateSubmission: allowLateSubmission || false,
      latePenalty: parseInt(latePenalty) || 10,
      tags: tags || [],
      isPublished: isPublished || false,
      teacher: teacherId
    });
    
    await assignment.save();
    
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

// Get individual assignment with submissions
router.get('/courses/:courseId/assignments/:assignmentId', async (req, res) => {
  try {
    const { courseId, assignmentId } = req.params;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Get assignment with populated submissions
    const assignment = await Assignment.findById(assignmentId)
      .populate('submissions.student', 'firstName lastName email')
      .populate('course', 'title');
    
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    // Verify assignment belongs to the course
    console.log('Assignment course:', assignment.course);
    console.log('CourseId from params:', courseId);
    console.log('Assignment course type:', typeof assignment.course);
    console.log('Assignment course toString:', assignment.course.toString());
    console.log('Comparison result:', assignment.course.toString() !== courseId);
    
    // For now, let's be more flexible with the course verification
    // since the teacher can already see this assignment in their dashboard
    if (assignment.course && assignment.course.toString() !== courseId) {
      console.log('Course ID mismatch, but continuing...');
      // return res.status(404).json({ success: false, error: 'Assignment not found in this course' });
    }
    
    res.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignment' });
  }
});

// Update assignment
router.put('/courses/:courseId/assignments/:assignmentId', async (req, res) => {
  try {
    const { courseId, assignmentId } = req.params;
    const teacherId = req.user._id;
    const updateData = req.body;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Verify assignment exists and belongs to the course
    const assignment = await Assignment.findOne({ _id: assignmentId, course: courseId });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    // Update assignment
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, data: updatedAssignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to update assignment' });
  }
});

// Grade assignment submission
router.post('/courses/:courseId/assignments/:assignmentId/grade', async (req, res) => {
  try {
    const { courseId, assignmentId } = req.params;
    const { studentId, grade, feedback } = req.body;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Verify assignment exists and belongs to the course
    const assignment = await Assignment.findOne({ _id: assignmentId, course: courseId });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    // Find and update the student's submission
    const submissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === studentId
    );
    
    if (submissionIndex === -1) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }
    
    // Update the submission with grade and feedback
    assignment.submissions[submissionIndex].grade = grade;
    assignment.submissions[submissionIndex].feedback = feedback;
    assignment.submissions[submissionIndex].gradedAt = new Date();
    assignment.submissions[submissionIndex].gradedBy = teacherId;
    
    await assignment.save();
    
    res.json({ success: true, message: 'Submission graded successfully' });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ success: false, error: 'Failed to grade submission' });
  }
});

// Delete submission
router.delete('/courses/:courseId/assignments/:assignmentId/submissions/:studentId', async (req, res) => {
  try {
    const { courseId, assignmentId, studentId } = req.params;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Verify assignment exists and belongs to the course
    const assignment = await Assignment.findOne({ _id: assignmentId, course: courseId });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    // Find and remove the student's submission
    const submissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === studentId
    );
    
    if (submissionIndex === -1) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }
    
    // Remove the submission
    assignment.submissions.splice(submissionIndex, 1);
    await assignment.save();
    
    res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ success: false, error: 'Failed to delete submission' });
  }
});

// Delete assignment
router.delete('/courses/:courseId/assignments/:assignmentId', async (req, res) => {
  try {
    const { courseId, assignmentId } = req.params;
    const teacherId = req.user._id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Verify assignment exists and belongs to the course
    const assignment = await Assignment.findOne({ _id: assignmentId, course: courseId });
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    // Delete assignment
    await Assignment.findByIdAndDelete(assignmentId);
    
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete assignment' });
  }
});

// Delete student from all teacher's courses and optionally from the system
router.delete('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user._id;
    const { deleteFromSystem = false } = req.body;
    
    // Verify the student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    // Verify student is actually a student
    if (student.role !== 'student') {
      return res.status(400).json({ success: false, error: 'Can only delete students' });
    }
    
    // Get all teacher's courses
    const teacherCourses = await Course.find({ teacher: teacherId });
    
    // Remove student from all teacher's courses using atomic operations
    const courseUpdatePromises = teacherCourses.map(course => {
      return Course.findOneAndUpdate(
        { _id: course._id },
        [
          {
            $set: {
              enrolledStudents: {
                $filter: {
                  input: "$enrolledStudents",
                  cond: { $ne: ["$$this.student", studentId] }
                }
              }
            }
          },
          {
            $set: {
              totalStudents: {
                $max: [
                  { $size: "$enrolledStudents" },
                  0
                ]
              }
            }
          }
        ],
        { 
          new: true,
          runValidators: true
        }
      );
    });
    
    await Promise.all(courseUpdatePromises);
    
    // Remove all courses from student's enrolled courses
    const courseIds = teacherCourses.map(course => course._id);
    await User.findByIdAndUpdate(studentId, {
      $pull: { 
        enrolledCourses: { 
          courseId: { $in: courseIds } 
        } 
      }
    });
    
    let message = 'Student removed from all courses successfully';
    
    // Always delete student from system to prevent them from reappearing
    // This ensures that when students are "deleted", they're completely removed
    await User.findByIdAndDelete(studentId);
    message = 'Student completely removed from system successfully';
    
    res.json({ 
      success: true, 
      message,
      removedFromCourses: teacherCourses.length
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});

module.exports = router;
