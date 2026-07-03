const express = require('express');
const { body, validationResult } = require('express-validator');
const LiveSession = require('../models/LiveSession');
const {
  authenticateToken,
  optionalAuthenticateToken,
  requireTeacher,
  requireOwnership,
  requireVerifiedPayment,
} = require('../middleware/auth');
const { sanitizeAllowedPackages } = require('../utils/coursePayload');
const {
  serializeLiveSessionForClient,
  getUserPackagePrice,
  isPrivilegedCourseViewer,
  canAccessLiveSessionByPackage,
  isStudentBooked,
} = require('../utils/liveSessionAccess');

const router = express.Router();

async function buildSessionContext(req) {
  if (!req.user) {
    return { user: null, userPackagePrice: null, isPrivileged: false };
  }
  const pkg = await getUserPackagePrice(req.user);
  return {
    user: req.user,
    userPackagePrice: pkg.userPackagePrice,
    isPrivileged: pkg.isPrivileged || isPrivilegedCourseViewer(req.user.role),
  };
}

function listQueryFromReq(req) {
  const { status, category, instructor, upcoming } = req.query;
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (instructor) query.teacher = instructor;
  if (upcoming === 'true') {
    query.status = { $in: ['scheduled', 'rescheduled', 'live'] };
    query.scheduledAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  }
  return query;
}

// @route   GET /api/sessions
// @desc    List live sessions (visible to everyone; join/reserve is package-gated)
// @access  Public (+ optional auth for access metadata)
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const context = await buildSessionContext(req);
    const sessions = await LiveSession.find(listQueryFromReq(req))
      .populate('teacher', 'firstName lastName profileImage')
      .sort({ scheduledAt: 1 });

    res.json(sessions.map((session) => serializeLiveSessionForClient(session, context)));
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Public (+ optional auth for access metadata)
router.get('/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const context = await buildSessionContext(req);
    const session = await LiveSession.findById(req.params.id)
      .populate('teacher', 'firstName lastName profileImage email')
      .populate('currentParticipants.student', 'firstName lastName profileImage');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(serializeLiveSessionForClient(session, context));
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
  requireTeacher,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('scheduledAt').isISO8601().withMessage('Valid date is required'),
  body('duration').isNumeric().withMessage('Duration is required'),
  body('category').isIn(['forex', 'crypto', 'stocks', 'commodities', 'options', 'futures', 'general', 'qa']).withMessage('Invalid category'),
  body('level').isIn(['beginner', 'intermediate', 'advanced', 'all']).withMessage('Invalid level'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sessionData = {
      ...req.body,
      teacher: req.user._id,
      allowedPackages: sanitizeAllowedPackages(req.body.allowedPackages),
    };

    const session = new LiveSession(sessionData);
    await session.save();

    res.status(201).json({
      message: 'Session created successfully',
      session,
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
  body('duration').optional().isNumeric().withMessage('Duration must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patch = { ...req.body };
    if (patch.allowedPackages !== undefined) {
      patch.allowedPackages = sanitizeAllowedPackages(patch.allowedPackages);
    }

    const session = await LiveSession.findByIdAndUpdate(
      req.params.id,
      patch,
      { new: true, runValidators: true },
    ).populate('teacher', 'firstName lastName profileImage');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      message: 'Session updated successfully',
      session,
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
// @desc    Reserve a session (package-gated)
// @access  Private (Requires verified payment + matching package)
router.post('/:id/book', authenticateToken, requireVerifiedPayment, async (req, res) => {
  try {
    const context = await buildSessionContext(req);
    const session = await LiveSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!canAccessLiveSessionByPackage(session, context.userPackagePrice, { isPrivileged: context.isPrivileged })) {
      return res.status(403).json({
        error: 'Package upgrade required',
        code: 'PACKAGE_REQUIRED',
        message: 'This live session is not included in your current package.',
        requiredPackages: session.allowedPackages,
      });
    }

    if (session.status !== 'scheduled' && session.status !== 'rescheduled') {
      return res.status(400).json({ error: 'Session is not available for booking' });
    }

    if (session.isFull) {
      return res.status(400).json({ error: 'Session is full' });
    }

    if (isStudentBooked(session, req.user._id)) {
      return res.status(400).json({ error: 'Already reserved for this session' });
    }

    const success = session.bookStudent(req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'Already booked or session is full' });
    }

    await session.save();

    res.json({
      message: 'Session reserved successfully',
      session: serializeLiveSessionForClient(session, context),
    });
  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({ error: 'Failed to book session' });
  }
});

// @route   POST /api/sessions/:id/cancel
// @desc    Cancel session reservation
// @access  Private
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const context = await buildSessionContext(req);
    const session = await LiveSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const success = session.cancelBooking(req.user._id);
    if (!success) {
      return res.status(400).json({ error: 'No reservation found' });
    }

    await session.save();

    res.json({
      message: 'Reservation cancelled successfully',
      session: serializeLiveSessionForClient(session, context),
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
