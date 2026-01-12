const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const StudentCertificateAssignment = require('../models/StudentCertificateAssignment');
const TeacherCertificate = require('../models/TeacherCertificate');
const User = require('../models/User');
const Course = require('../models/Course');

const router = express.Router();

// @route   POST /api/certificate-assignments
// @desc    Assign a certificate to students
// @access  Private (Teacher only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can assign certificates'
      });
    }

    const { 
      teacherCertificateId, 
      studentIds, 
      courseId, 
      message, 
      dueDate 
    } = req.body;

    // Validate required fields
    if (!teacherCertificateId || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'Teacher certificate ID and student IDs are required'
      });
    }

    // Verify the teacher owns the certificate
    const teacherCertificate = await TeacherCertificate.findOne({
      _id: teacherCertificateId,
      teacherId: req.user.id
    });

    if (!teacherCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or you do not own this certificate'
      });
    }

    // Verify students exist and are students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more students not found or invalid'
      });
    }

    // Verify course exists if provided
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Create assignments
    const assignments = [];
    for (const studentId of studentIds) {
      // Check if assignment already exists
      const existingAssignment = await StudentCertificateAssignment.findOne({
        studentId,
        teacherCertificateId,
        status: { $in: ['assigned', 'viewed'] }
      });

      if (existingAssignment) {
        continue; // Skip if already assigned
      }

      const assignment = new StudentCertificateAssignment({
        studentId,
        teacherId: req.user.id,
        teacherCertificateId,
        courseId: courseId || null,
        message: message || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedDate: new Date() // Explicitly set the assignment date
      });

      await assignment.save();
      assignments.push(assignment);
    }

    // Populate the assignments for response
    const populatedAssignments = await StudentCertificateAssignment.find({
      _id: { $in: assignments.map(a => a._id) }
    })
    .populate('studentId', 'name email')
    .populate('teacherCertificateId')
    .populate('courseId', 'title');

    res.status(201).json({
      success: true,
      message: `Successfully assigned certificate to ${assignments.length} student(s)`,
      assignments: populatedAssignments
    });

  } catch (error) {
    console.error('Error assigning certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning certificate',
      error: error.message
    });
  }
});

// @route   GET /api/certificate-assignments/teacher
// @desc    Get assignments made by teacher
// @access  Private (Teacher only)
router.get('/teacher', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access this endpoint'
      });
    }

    const { status, studentId, courseId, page = 1, limit = 20 } = req.query;
    
    const options = {};
    if (status) options.status = status;
    if (studentId) options.studentId = studentId;
    if (courseId) options.courseId = courseId;

    const assignments = await StudentCertificateAssignment.getTeacherAssignments(
      req.user.id, 
      options
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedAssignments = assignments.slice(startIndex, endIndex);

    res.json({
      success: true,
      assignments: paginatedAssignments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(assignments.length / limit),
        count: assignments.length
      }
    });

  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments',
      error: error.message
    });
  }
});

// @route   GET /api/certificate-assignments/student
// @desc    Get assignments for student
// @access  Private (Student only)
router.get('/student', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access this endpoint'
      });
    }

    const { status, courseId, page = 1, limit = 20 } = req.query;
    
    const options = {};
    if (status) options.status = status;
    if (courseId) options.courseId = courseId;

    const assignments = await StudentCertificateAssignment.getStudentAssignments(
      req.user.id, 
      options
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedAssignments = assignments.slice(startIndex, endIndex);

    res.json({
      success: true,
      assignments: paginatedAssignments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(assignments.length / limit),
        count: assignments.length
      }
    });

  } catch (error) {
    console.error('Error fetching student assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignments',
      error: error.message
    });
  }
});

// @route   PUT /api/certificate-assignments/:id/view
// @desc    Mark assignment as viewed by student
// @access  Private (Student only)
router.put('/:id/view', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can mark assignments as viewed'
      });
    }

    const assignment = await StudentCertificateAssignment.findOne({
      _id: req.params.id,
      studentId: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    await assignment.markAsViewed();

    res.json({
      success: true,
      message: 'Assignment marked as viewed',
      assignment
    });

  } catch (error) {
    console.error('Error marking assignment as viewed:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating assignment',
      error: error.message
    });
  }
});

// @route   PUT /api/certificate-assignments/:id/complete
// @desc    Mark assignment as completed by student
// @access  Private (Student only)
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can complete assignments'
      });
    }

    const { studentNotes } = req.body;

    const assignment = await StudentCertificateAssignment.findOne({
      _id: req.params.id,
      studentId: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    await assignment.markAsCompleted(studentNotes);

    res.json({
      success: true,
      message: 'Assignment marked as completed',
      assignment
    });

  } catch (error) {
    console.error('Error completing assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing assignment',
      error: error.message
    });
  }
});

// @route   PUT /api/certificate-assignments/:id/feedback
// @desc    Add teacher feedback to assignment
// @access  Private (Teacher only)
router.put('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can add feedback'
      });
    }

    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required'
      });
    }

    const assignment = await StudentCertificateAssignment.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    await assignment.addTeacherFeedback(feedback);

    res.json({
      success: true,
      message: 'Feedback added successfully',
      assignment
    });

  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding feedback',
      error: error.message
    });
  }
});

// @route   DELETE /api/certificate-assignments/:id
// @desc    Delete/cancel an assignment
// @access  Private (Teacher only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can delete assignments'
      });
    }

    const assignment = await StudentCertificateAssignment.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Only allow deletion if not completed
    if (assignment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed assignments'
      });
    }

    await StudentCertificateAssignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting assignment',
      error: error.message
    });
  }
});

// @route   GET /api/certificate-assignments/:id
// @desc    Get specific assignment details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await StudentCertificateAssignment.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('teacherId', 'name email')
      .populate('teacherCertificateId')
      .populate('courseId', 'title');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user has access to this assignment
    if (req.user.role === 'student' && assignment.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'teacher' && assignment.teacherId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assignment',
      error: error.message
    });
  }
});

module.exports = router;

