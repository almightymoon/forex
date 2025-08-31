const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');

// Get all assignments for a student
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    console.log('=== FETCHING ASSIGNMENTS ===');
    console.log('User ID:', userId);
    console.log('User object:', { id: req.user._id, userId: req.user.userId, email: req.user.email });
    
    // Get student's enrolled courses
    const student = await User.findById(userId);
    if (!student || !student.enrolledCourses || student.enrolledCourses.length === 0) {
      console.log('No enrolled courses found for student');
      return res.json([]);
    }
    
    const courseIds = student.enrolledCourses.map(ec => ec.courseId).filter(Boolean);
    console.log('Enrolled course IDs:', courseIds);
    
    // Get ALL assignments for enrolled courses (including unpublished for debugging)
    const allAssignments = await Assignment.find({
      course: { $in: courseIds }
    }).populate('course', 'title');
    
    console.log('Total assignments found:', allAssignments.length);
    
    // Process each assignment to find student submissions
    const processedAssignments = allAssignments.map(assignment => {
      console.log(`\n--- Processing Assignment: ${assignment._id} ---`);
      console.log(`Title: ${assignment.title}`);
      console.log(`Course: ${assignment.course?.title}`);
      console.log(`Submissions count: ${assignment.submissions?.length || 0}`);
      
      // Find this student's submission
      let studentSubmission = null;
      let submissionFound = false;
      
      if (assignment.submissions && assignment.submissions.length > 0) {
        console.log('All submissions in this assignment:');
        assignment.submissions.forEach((sub, index) => {
          const subStudentId = sub.student?.toString();
          const isMatch = subStudentId === userId.toString();
          console.log(`  Submission ${index}:`, {
            student: sub.student,
            studentId: subStudentId,
            matchesCurrentUser: isMatch,
            submittedAt: sub.submittedAt,
            grade: sub.grade,
            status: sub.status,
            textContent: sub.textContent ? 'Has text' : 'No text',
            files: sub.files?.length || 0
          });
          
          if (isMatch) {
            studentSubmission = sub;
            submissionFound = true;
            console.log(`  *** FOUND MATCHING SUBMISSION ***`);
          }
        });
      }
      
      console.log(`Final result for assignment ${assignment._id}:`, {
        hasSubmission: submissionFound,
        submission: studentSubmission ? {
          grade: studentSubmission.grade,
          status: studentSubmission.status,
          submittedAt: studentSubmission.submittedAt
        } : null
      });
      
      // Return processed assignment
      return {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        courseId: assignment.course?._id,
        courseTitle: assignment.course?.title,
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
        // Map submission data
        submission: studentSubmission ? {
          submittedAt: studentSubmission.submittedAt,
          files: studentSubmission.files || [],
          textContent: studentSubmission.textContent || '',
          status: studentSubmission.status || 'submitted'
        } : undefined,
        // Map grade data
        grade: studentSubmission?.grade,
        feedback: studentSubmission?.feedback,
        gradedAt: studentSubmission?.gradedAt,
        gradedBy: studentSubmission?.gradedBy
      };
    });
    
    console.log('\n=== FINAL RESULTS ===');
    console.log('Processed assignments:', processedAssignments.length);
    
    // Filter to only published assignments for final response
    const publishedAssignments = processedAssignments.filter(a => a.isPublished);
    console.log('Published assignments:', publishedAssignments.length);
    
    if (publishedAssignments.length > 0) {
      console.log('Sample published assignment:', {
        id: publishedAssignments[0]._id,
        title: publishedAssignments[0].title,
        hasSubmission: !!publishedAssignments[0].submission,
        grade: publishedAssignments[0].grade,
        status: publishedAssignments[0].submission?.status
      });
    }
    
    res.json(publishedAssignments);
    
  } catch (error) {
    console.error('Error in assignments route:', error);
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
    
    // Check if submission already exists - PREVENT MULTIPLE SUBMISSIONS
    const existingSubmissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === userId
    );
    
    if (existingSubmissionIndex >= 0) {
      return res.status(400).json({ error: 'You have already submitted this assignment. Multiple submissions are not allowed.' });
    }
    
    const submissionData = {
      student: userId,
      submittedAt: new Date(),
      textContent: textContent.trim(),
      files: files,
      status: new Date() > assignment.dueDate ? 'late' : 'submitted'
    };
    
    console.log('Saving submission data:', submissionData);
    
    // Add new submission (no updates allowed)
    assignment.submissions.push(submissionData);
    
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
    const { grade, feedback, studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required for grading' });
    }
    
    // Find the assignment and update the specific student's submission
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Find the student's submission
    const submissionIndex = assignment.submissions.findIndex(
      sub => sub.student.toString() === studentId
    );
    
    if (submissionIndex === -1) {
      return res.status(404).json({ error: 'Student submission not found' });
    }
    
    // Update the specific submission
    assignment.submissions[submissionIndex].grade = grade;
    assignment.submissions[submissionIndex].feedback = feedback;
    assignment.submissions[submissionIndex].gradedAt = new Date();
    assignment.submissions[submissionIndex].gradedBy = req.user.userId;
    assignment.submissions[submissionIndex].status = 'graded';
    
    await assignment.save();
    
    res.json({ 
      success: true, 
      message: 'Assignment graded successfully',
      submission: assignment.submissions[submissionIndex]
    });
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
