const express = require('express');
const router = express.Router();
const { authenticateToken, requireTeacher } = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');
const LiveSession = require('../models/LiveSession');
const Assignment = require('../models/Assignment');

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireTeacher);

// Get teacher dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get teacher's courses
    const courses = await Course.find({ instructor: teacherId });
    
    // Get total students across all courses
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0);
    
    // Get recent enrollments
    const recentEnrollments = await User.find({
      'enrolledCourses.courseId': { $in: courses.map(c => c._id) }
    })
    .sort({ 'enrolledCourses.enrolledAt': -1 })
    .limit(5)
    .select('name email enrolledCourses');
    
    // Get upcoming live sessions
    const upcomingSessions = await LiveSession.find({
      instructor: teacherId,
      status: 'scheduled',
      scheduledDate: { $gte: new Date() }
    })
    .sort({ scheduledDate: 1 })
    .limit(3)
    .populate('courseId', 'title');
    
    // Calculate analytics
    const totalRevenue = courses.reduce((sum, course) => sum + (course.price * (course.enrolledStudents?.length || 0)), 0);
    const averageRating = courses.length > 0 ? 
      courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length : 0;
    
    const dashboardData = {
      totalStudents,
      totalCourses: courses.length,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      recentEnrollments,
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
    const teacherId = req.user.id;
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = { instructor: teacherId };
    
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
      .populate('enrolledStudents', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Course.countDocuments(query);
    
    res.json({
      success: true,
      data: courses,
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
    const teacherId = req.user.id;
    const courseData = {
      ...req.body,
      instructor: teacherId,
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
    const teacherId = req.user.id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
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
    const teacherId = req.user.id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
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
    const teacherId = req.user.id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
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
    const teacherId = req.user.id;
    const { page = 1, limit = 20, search } = req.query;
    
    // Get teacher's courses
    const teacherCourses = await Course.find({ instructor: teacherId }).select('_id');
    const courseIds = teacherCourses.map(c => c._id);
    
    let query = {
      'enrolledCourses.courseId': { $in: courseIds }
    };
    
    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const students = await User.find(query)
      .populate('enrolledCourses.courseId', 'title')
      .sort({ 'enrolledCourses.enrolledAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    // Process student data
    const processedStudents = students.map(student => {
      const teacherEnrollments = student.enrolledCourses.filter(e => 
        courseIds.includes(e.courseId._id)
      );
      
      const totalProgress = teacherEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0);
      const averageProgress = teacherEnrollments.length > 0 ? totalProgress / teacherEnrollments.length : 0;
      
      return {
        id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        enrolledDate: teacherEnrollments[0]?.enrolledAt,
        progress: Math.round(averageProgress),
        lastActive: teacherEnrollments[0]?.lastActive,
        completedCourses: teacherEnrollments.filter(e => e.progress === 100).length,
        totalCourses: teacherEnrollments.length
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
    const teacherId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = { instructor: teacherId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const sessions = await LiveSession.find(query)
      .populate('courseId', 'title')
      .sort({ scheduledDate: 1 })
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
    const teacherId = req.user.id;
    const { courseId, title, scheduledDate, duration, maxParticipants } = req.body;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    const session = new LiveSession({
      instructor: teacherId,
      courseId,
      title,
      scheduledDate: new Date(scheduledDate),
      duration: parseInt(duration),
      maxParticipants: parseInt(maxParticipants),
      status: 'scheduled',
      participants: []
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
    const teacherId = req.user.id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, instructor: teacherId });
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
    const teacherId = req.user.id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, instructor: teacherId });
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
    const teacherId = req.user.id;
    
    // Verify session belongs to teacher
    const session = await LiveSession.findOne({ _id: sessionId, instructor: teacherId });
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

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { period = 'month' } = req.query;
    
    // Get teacher's courses
    const courses = await Course.find({ instructor: teacherId });
    const courseIds = courses.map(c => c._id);
    
    // Calculate basic metrics
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0);
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
    
    const enrollments = await User.aggregate([
      {
        $match: {
          'enrolledCourses.courseId': { $in: courseIds },
          'enrolledCourses.enrolledAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$enrolledCourses.enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Calculate completion rate
    const totalEnrollments = await User.countDocuments({
      'enrolledCourses.courseId': { $in: courseIds }
    });
    
    const completedEnrollments = await User.countDocuments({
      'enrolledCourses.courseId': { $in: courseIds },
      'enrolledCourses.progress': 100
    });
    
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    
    const analytics = {
      totalStudents,
      totalCourses: courses.length,
      totalRevenue,
      averageRating: Math.round(averageRating * 10) / 10,
      completionRate: Math.round(completionRate),
      enrollmentTrends: enrollments,
      period
    };
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Send announcement to course students
router.post('/courses/:courseId/announcements', async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const { title, message, type = 'announcement' } = req.body;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    // Get enrolled students
    const students = await User.find({
      'enrolledCourses.courseId': courseId
    }).select('email name');
    
    // TODO: Send email notifications to students
    // This would integrate with your notification service
    
    const announcement = {
      courseId,
      instructor: teacherId,
      title,
      message,
      type,
      sentAt: new Date(),
      recipients: students.length
    };
    
    res.json({ 
      success: true, 
      data: announcement,
      message: `Announcement sent to ${students.length} students`
    });
  } catch (error) {
    console.error('Error sending announcement:', error);
    res.status(500).json({ success: false, error: 'Failed to send announcement' });
  }
});

// Get course assignments
router.get('/courses/:courseId/assignments', async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    const assignments = await Assignment.find({ courseId })
      .sort({ dueDate: 1 });
    
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
    const teacherId = req.user.id;
    const { title, description, dueDate, maxScore, instructions } = req.body;
    
    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, instructor: teacherId });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    
    const assignment = new Assignment({
      courseId,
      title,
      description,
      dueDate: new Date(dueDate),
      maxScore: parseInt(maxScore),
      instructions,
      createdBy: teacherId
    });
    
    await assignment.save();
    
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

module.exports = router;
