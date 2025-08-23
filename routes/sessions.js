const express = require('express');
const { body, validationResult } = require('express-validator');
const LiveSession = require('../models/LiveSession');
const { authenticateToken, requireInstructor, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sessions
// @desc    Get all live sessions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, category, instructor } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (instructor) query.instructor = instructor;
    
    const sessions = await LiveSession.find(query)
      .populate('instructor', 'firstName lastName profileImage')
      .sort({ scheduledAt: 1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id)
      .populate('instructor', 'firstName lastName profileImage email')
      .populate('currentParticipants.student', 'firstName lastName profileImage');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// @route   POST /api/sessions
// @desc    Create new live session
// @access  Private/Instructor
router.post('/', [
  authenticateToken,
  requireInstructor,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('scheduledAt').isISO8601().withMessage('Valid date is required'),
  body('duration').isNumeric().withMessage('Duration is required'),
  body('category').isIn(['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general', 'qa']).withMessage('Invalid category'),
  body('level').isIn(['beginner', 'intermediate', 'advanced', 'all']).withMessage('Invalid level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sessionData = {
      ...req.body,
      instructor: req.user._id
    };

    const session = new LiveSession(sessionData);
    await session.save();

    res.status(201).json({
      message: 'Session created successfully',
      session
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session
// @access  Private/Instructor (owner)
router.put('/:id', [
  authenticateToken,
  requireOwnership('LiveSession'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('scheduledAt').optional().isISO8601().withMessage('Valid date is required'),
  body('duration').optional().isNumeric().withMessage('Duration must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await LiveSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName profileImage');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      message: 'Session updated successfully',
      session
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete session
// @access  Private/Instructor (owner)
router.delete('/:id', authenticateToken, requireOwnership('LiveSession'), async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await LiveSession.findByIdAndDelete(req.params.id);

    res.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// @route   POST /api/sessions/:id/book
// @desc    Book a session
// @access  Private
router.post('/:id/book', authenticateToken, async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({ error: 'Session is not available for booking' });
    }

    if (session.isFull) {
      return res.status(400).json({ error: 'Session is full' });
    }

    const success = session.bookStudent(req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'Already booked or session is full' });
    }

    await session.save();

    res.json({
      message: 'Session booked successfully',
      session
    });

  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({ error: 'Failed to book session' });
  }
});

// @route   POST /api/sessions/:id/cancel
// @desc    Cancel session booking
// @access  Private
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const success = session.cancelBooking(req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'No booking found' });
    }

    await session.save();

    res.json({
      message: 'Booking cancelled successfully',
      session
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
