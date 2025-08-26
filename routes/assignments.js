const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');

// Get all assignments for a student
router.get('/', authenticateToken, async (req, res) => {
  // Disable caching to ensure fresh data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const userId = req.user.userId || req.user._id;
    console.log('Fetching assignments for user:', userId);
    
    // Get all published assignments from courses the student is enrolled in
    let courseIds = [];
    try {
      const student = await User.findById(userId).populate('enrolledCourses.courseId');
      
      if (!student) {
        console.log('Student not found:', userId);
        return res.json([]);
      }
      
      console.log('Student found:', {
        id: student._id,
        email: student.email,
        enrolledCoursesCount: student.enrolledCourses?.length || 0
      });
      
      if (!student.enrolledCourses || student.enrolledCourses.length === 0) {
        console.log('Student has no enrolled courses:', userId);
        return res.json([]);
      }
      
      console.log('Student enrolled courses:', student.enrolledCourses.length);
      
      // Check if courseId population worked
      courseIds = student.enrolledCourses.map(enrollment => {
        if (enrollment.courseId && enrollment.courseId._id) {
          return enrollment.courseId._id;
        } else if (enrollment.courseId) {
          return enrollment.courseId;
        } else {
          console.log('Enrollment missing courseId:', enrollment);
          return null;
        }
      }).filter(Boolean); // Remove null entries
      
      console.log('Course IDs:', courseIds);
      console.log('Course IDs types:', courseIds.map(id => typeof id));
      console.log('Student enrolled courses:', student.enrolledCourses.map(ec => ({
        courseId: ec.courseId,
        courseIdType: typeof ec.courseId,
        hasId: !!ec.courseId,
        isObjectId: ec.courseId && ec.courseId._id
      })));
      
      if (courseIds.length === 0) {
        console.log('No valid course IDs found');
        return res.json([]);
      }
    } catch (error) {
      console.error('Error processing student data:', error);
      return res.status(500).json({ error: 'Failed to process student data', details: error.message });
    }
    
    // First, let's check if there are any assignments at all
    const allAssignments = await Assignment.find({});
    console.log('Total assignments in database:', allAssignments.length);
    
    // Check if there are any published assignments
    const publishedAssignments = await Assignment.find({ isPublished: true });
    console.log('Published assignments in database:', publishedAssignments.length);
    
    // Find all published assignments for enrolled courses with submissions populated
    const assignments = await Assignment.find({
      course: { $in: courseIds },
      isPublished: true
    }).populate('course', 'title').populate('submissions.student', 'firstName lastName email');
    
    console.log('Found assignments for enrolled courses:', assignments.length);
    if (assignments.length > 0) {
      console.log('Sample assignment structure:', {
        _id: assignments[0]._id,
        course: assignments[0].course,
        hasCourse: !!assignments[0].course,
        courseId: assignments[0].course?._id,
        courseType: typeof assignments[0].course,
        courseKeys: assignments[0].course ? Object.keys(assignments[0].course) : 'N/A'
      });
    } else {
      console.log('No assignments found for enrolled courses');
    }
    
    // Get student's submissions for these assignments - FIXED LOGIC
    const assignmentsWithSubmissions = assignments.map(assignment => {
      // Check if course is properly populated
      if (!assignment.course || !assignment.course._id) {
        console.log('Assignment missing course data:', assignment._id);
        return null; // Skip this assignment
      }
      
      // Find the student's submission directly from the assignment
      const studentSubmission = assignment.submissions?.find(s => 
        s.student.toString() === userId
      );
      
      console.log(`Assignment ${assignment._id}:`, {
        hasSubmissions: !!assignment.submissions,
        submissionsCount: assignment.submissions?.length || 0,
        studentSubmission: studentSubmission ? {
          hasSubmission: true,
          hasTextContent: !!studentSubmission.textContent,
          hasFiles: studentSubmission.files?.length > 0,
          grade: studentSubmission.grade,
          status: studentSubmission.status
        } : { hasSubmission: false }
      });
      
      return {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        courseId: assignment.course._id,
        courseTitle: assignment.course.title,
        dueDate: assignment.dueDate,
        maxPoints: assignment.maxPoints,
        passingScore: assignment.passingScore,
        assignmentType: assignment.assignmentType,
        instructions: assignment.instructions,
        difficulty: assignment.difficulty,
        estimatedTime: assignment.estimatedTime,
        isPublished: assignment.isPublished,
        allowLateSubmission: assignment.allowLateSubmission,
        latePenalty: assignment.latePenalty,
        tags: assignment.tags,
        submission: studentSubmission ? {
          submittedAt: studentSubmission.submittedAt,
          files: studentSubmission.files || [],
          textContent: studentSubmission.textContent || '',
          status: studentSubmission.status || 'submitted'
        } : undefined,
        grade: studentSubmission?.grade,
        feedback: studentSubmission?.feedback,
        gradedAt: studentSubmission?.gradedAt,
        gradedBy: studentSubmission?.gradedBy
      };
    }).filter(Boolean); // Remove null entries
    
    console.log('Returning assignments:', assignmentsWithSubmissions.length);
    
    // Log the final data being returned
    if (assignmentsWithSubmissions.length > 0) {
      console.log('Final assignment data:', assignmentsWithSubmissions[0]);
      console.log('Submission data:', assignmentsWithSubmissions[0].submission);
      console.log('Grade data:', assignmentsWithSubmissions[0].grade);
      console.log('Full response data:', JSON.stringify(assignmentsWithSubmissions[0], null, 2));
    }
    
    // If no assignments found, return sample data for demonstration
    if (assignmentsWithSubmissions.length === 0) {
      console.log('No assignments found, returning sample data');
      console.log('This could be because:');
      console.log('- No assignments exist in the database');
      console.log('- No assignments are published');
      console.log('- No assignments match the enrolled courses');
      console.log('- Course population failed');
      
      const sampleAssignments = [
        {
          _id: 'sample-1',
          title: 'Risk Management Quiz',
          description: 'Test your understanding of risk management principles in forex trading',
          courseId: 'sample-course-1',
          courseTitle: 'Forex Fundamentals',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          maxPoints: 100,
          passingScore: 60,
          assignmentType: 'quiz',
          instructions: 'Answer all questions based on the course material covered in modules 1-3.',
          difficulty: 'intermediate',
          estimatedTime: 45,
          isPublished: true,
          allowLateSubmission: false,
          latePenalty: 0,
          tags: ['risk-management', 'quiz'],
          status: 'pending'
        },
        {
          _id: 'sample-2',
          title: 'Chart Analysis Assignment',
          description: 'Analyze the EUR/USD chart and identify key support and resistance levels',
          courseId: 'sample-course-2',
          courseTitle: 'Technical Analysis',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          maxPoints: 150,
          passingScore: 90,
          assignmentType: 'analysis',
          instructions: 'Use the chart analysis tools provided and submit your findings with screenshots.',
          difficulty: 'advanced',
          estimatedTime: 90,
          isPublished: true,
          allowLateSubmission: true,
          latePenalty: 10,
          tags: ['chart-analysis', 'technical-analysis'],
          status: 'pending'
        }
      ];
      return res.json(sampleAssignments);
    }
    
    res.json(assignmentsWithSubmissions);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message });
  }
});

// Get assignments for a specific course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      course: req.params.courseId,
      student: req.user.userId 
    }).populate('course', 'title');
    
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching course assignments:', error);
    res.status(500).json({ error: 'Failed to fetch course assignments' });
  }
});

// Submit an assignment
router.post('/:assignmentId/submit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { assignmentId } = req.params;
    
    // Handle FormData processed by multer
    let textContent = req.body.textContent || '';
    let files = [];
    
    // Process uploaded files from multer
    if (req.files && req.files.length > 0) {
      files = req.files.map(file => ({
        title: file.originalname,
        fileUrl: `uploads/${file.filename || file.originalname}`, // This would need proper file storage
        fileType: file.mimetype,
        fileSize: file.size
      }));
    }
    
    console.log('Received submission data:', { textContent, files, body: req.body, files: req.files });
    
    // Validate submission content
    if (!textContent.trim() && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Submission must contain text content or files' });
    }
    
    // Find the assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Check if assignment is published
    if (!assignment.isPublished) {
      return res.status(400).json({ error: 'Assignment is not published' });
    }
    
    // Check if due date has passed and late submission is not allowed
    if (new Date() > assignment.dueDate && !assignment.allowLateSubmission) {
      return res.status(400).json({ error: 'Assignment is overdue and late submissions are not allowed' });
    }
    
    // Check if student is enrolled in the course
    const student = await User.findById(userId);
    const isEnrolled = student.enrolledCourses.some(enrollment => 
      enrollment.courseId.toString() === assignment.course.toString()
    );
    
    if (!isEnrolled) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }
    
    // Check if submission already exists
    const existingSubmissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === userId
    );
    
    const submissionData = {
      student: userId,
      submittedAt: new Date(),
      textContent: textContent.trim(),
      files: files,
      status: new Date() > assignment.dueDate ? 'late' : 'submitted'
    };
    
    console.log('Saving submission data:', submissionData);
    
    if (existingSubmissionIndex >= 0) {
      // Update existing submission
      assignment.submissions[existingSubmissionIndex] = submissionData;
    } else {
      // Add new submission
      assignment.submissions.push(submissionData);
    }
    
    await assignment.save();
    console.log('Submission saved successfully');
    
    res.json({ 
      success: true, 
      message: 'Assignment submitted successfully',
      submission: submissionData
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Get assignment details
router.get('/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.assignmentId,
      student: req.user.userId
    }).populate('course', 'title description');
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Admin/Teacher: Create new assignment
router.post('/', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, description, courseId, dueDate, type, questions, totalPoints } = req.body;
    
    const assignment = new Assignment({
      title,
      description,
      course: courseId,
      dueDate,
      type,
      questions,
      totalPoints,
      createdBy: req.user.userId
    });
    
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Admin/Teacher: Update assignment
router.put('/:assignmentId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.assignmentId,
      req.body,
      { new: true }
    );
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Admin/Teacher: Grade assignment
router.post('/:assignmentId/grade', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.assignmentId,
      { 
        grade, 
        feedback, 
        status: 'graded',
        gradedAt: new Date(),
        gradedBy: req.user.userId
      },
      { new: true }
    );
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(assignment);
  } catch (error) {
    console.error('Error grading assignment:', error);
    res.status(500).json({ error: 'Failed to grade assignment' });
  }
});

// Admin/Teacher: Delete assignment
router.delete('/:assignmentId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

module.exports = router;
