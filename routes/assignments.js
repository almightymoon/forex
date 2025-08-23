const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');

// Get all assignments for a student
router.get('/', authenticateToken, async (req, res) => {
  try {
    // For now, return sample data since we don't have actual assignments yet
    const sampleAssignments = [
      {
        _id: '1',
        title: 'Risk Management Quiz',
        description: 'Test your understanding of risk management principles in forex trading',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'pending',
        type: 'quiz'
      },
      {
        _id: '2',
        title: 'Chart Analysis Assignment',
        description: 'Analyze the EUR/USD chart and identify key support and resistance levels',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'submitted',
        type: 'assignment'
      },
      {
        _id: '3',
        title: 'Trading Journal Entry',
        description: 'Document your trading decisions and outcomes for the past week',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'graded',
        grade: 85,
        feedback: 'Excellent analysis! Consider adding more detail about your risk management decisions.'
      }
    ];
    
    res.json(sampleAssignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
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
    const { submission, answers } = req.body;
    
    const assignment = await Assignment.findOneAndUpdate(
      { 
        _id: req.params.assignmentId, 
        student: req.user.userId 
      },
      { 
        submission,
        answers,
        status: 'submitted',
        submittedAt: new Date()
      },
      { new: true }
    );
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json(assignment);
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

// Admin/Instructor: Create new assignment
router.post('/', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
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

// Admin/Instructor: Update assignment
router.put('/:assignmentId', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
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

// Admin/Instructor: Grade assignment
router.post('/:assignmentId/grade', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
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

// Admin/Instructor: Delete assignment
router.delete('/:assignmentId', authenticateToken, requireRole(['admin', 'instructor']), async (req, res) => {
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
