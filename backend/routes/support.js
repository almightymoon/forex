const express = require('express');
const { body, validationResult } = require('express-validator');
const SupportTicket = require('../models/SupportTicket');
const { INQUIRY_TYPES } = require('../models/SupportTicket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'thefxnavigators@gmail.com';

const ticketValidators = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 20, max: 5000 }),
  body('inquiryType').optional().isIn(INQUIRY_TYPES).withMessage('Invalid inquiry type'),
  body('name').optional().trim().isLength({ max: 120 }),
  body('email').optional().trim().isEmail().withMessage('Valid email is required').isLength({ max: 200 }),
];

function formatErrors(errors) {
  return errors.array().map((e) => ({ msg: e.msg, path: e.path }));
}

async function notifyAdminsAndSupport(ticket) {
  try {
    const notificationService = require('../services/notificationService');
    const admins = await User.find({ role: 'admin' }).select('_id');

    const title = `New support ticket: ${ticket.ticketNumber}`;
    const message = `${ticket.name} (${ticket.inquiryType}): ${ticket.subject}`;

    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'system',
        title,
        message,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          inquiryType: ticket.inquiryType,
        },
        priority: ticket.inquiryType === 'billing' || ticket.inquiryType === 'withdrawal' ? 'high' : 'medium',
        link: `/admin?tab=support&ticket=${ticket._id}`,
      });
    }

    const html = `
      <h2>New Support Ticket — ${ticket.ticketNumber}</h2>
      <p><strong>From:</strong> ${ticket.name} &lt;${ticket.email}&gt;</p>
      <p><strong>Type:</strong> ${ticket.inquiryType}</p>
      <p><strong>Source:</strong> ${ticket.source}</p>
      <p><strong>Subject:</strong> ${ticket.subject}</p>
      <hr />
      <p style="white-space:pre-wrap">${ticket.message}</p>
    `;
    const text = `New Support Ticket ${ticket.ticketNumber}\nFrom: ${ticket.name} <${ticket.email}>\nType: ${ticket.inquiryType}\nSubject: ${ticket.subject}\n\n${ticket.message}`;

    await notificationService.sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[${ticket.ticketNumber}] ${ticket.subject}`,
      html,
      text,
      type: 'support_ticket',
    });
  } catch (err) {
    console.error('Support ticket notification error:', err);
  }
}

async function createTicket(payload) {
  let ticketNumber = SupportTicket.generateTicketNumber();
  for (let i = 0; i < 5; i++) {
    const exists = await SupportTicket.findOne({ ticketNumber }).lean();
    if (!exists) break;
    ticketNumber = SupportTicket.generateTicketNumber();
  }

  const ticket = await SupportTicket.create({
    ticketNumber,
    user: payload.userId || null,
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
    inquiryType: payload.inquiryType || 'general',
    source: payload.source || 'web',
  });

  await notifyAdminsAndSupport(ticket);

  if (payload.userId) {
    try {
      await Notification.create({
        userId: payload.userId,
        type: 'system',
        title: 'Support request received',
        message: `We received your message (${ticket.ticketNumber}). Our team will reply within 24 hours.`,
        data: { ticketId: ticket._id, ticketNumber: ticket.ticketNumber },
        priority: 'low',
      });
    } catch (err) {
      console.error('User ticket confirmation notification error:', err);
    }
  }

  return ticket;
}

// @route   POST /api/support/contact
// @desc    Public contact form (website visitors)
// @access  Public
router.post('/contact', ticketValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: formatErrors(errors) });
    }

    const { name, email, subject, message, inquiryType } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, errors: [{ msg: 'Name is required', path: 'name' }] });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, errors: [{ msg: 'Email is required', path: 'email' }] });
    }

    const ticket = await createTicket({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      inquiryType: inquiryType || 'general',
      source: 'web',
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been submitted. We will respond within 24 hours.',
      ticket: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    console.error('Create contact ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit your message. Please try again.' });
  }
});

// Authenticated student routes
router.use(authenticateToken);

// @route   POST /api/support/tickets
// @desc    Submit support ticket (logged-in users / mobile app)
// @access  Private
router.post('/tickets', ticketValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: formatErrors(errors) });
    }

    const { subject, message, inquiryType } = req.body;
    const ticket = await createTicket({
      userId: req.user._id,
      name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      email: req.user.email,
      subject: subject.trim(),
      message: message.trim(),
      inquiryType: inquiryType || 'general',
      source: 'mobile',
    });

    res.status(201).json({
      success: true,
      message: 'Your support ticket has been submitted. We will respond within 24 hours.',
      ticket: {
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        inquiryType: ticket.inquiryType,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit ticket. Please try again.' });
  }
});

// @route   GET /api/support/tickets
// @desc    List current user's support tickets
// @access  Private
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('ticketNumber subject inquiryType status createdAt updatedAt resolvedAt')
      .lean();

    res.json({ success: true, tickets });
  } catch (error) {
    console.error('List support tickets error:', error);
    res.status(500).json({ success: false, error: 'Failed to load tickets' });
  }
});

// @route   GET /api/support/tickets/:id
// @desc    Get a single support ticket (own tickets only)
// @access  Private
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to load ticket' });
  }
});

// Admin routes
router.get('/admin/tickets', requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'firstName lastName email')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    res.json({
      success: true,
      tickets,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    console.error('Admin list tickets error:', error);
    res.status(500).json({ success: false, error: 'Failed to load tickets' });
  }
});

router.patch('/admin/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    if (status) ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }
    await ticket.save();

    if (ticket.user && (status === 'resolved' || status === 'closed')) {
      try {
        await Notification.create({
          userId: ticket.user,
          type: 'system',
          title: 'Support ticket updated',
          message: `Your ticket ${ticket.ticketNumber} has been marked as ${status}.`,
          data: { ticketId: ticket._id, ticketNumber: ticket.ticketNumber, status },
        });
      } catch (err) {
        console.error('Ticket status user notification error:', err);
      }
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Admin update ticket error:', error);
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

module.exports = router;
