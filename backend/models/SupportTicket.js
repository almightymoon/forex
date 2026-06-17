const mongoose = require('mongoose');

const INQUIRY_TYPES = [
  'general',
  'support',
  'billing',
  'course',
  'withdrawal',
  'consultation',
  'partnership',
];

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 200,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000,
  },
  inquiryType: {
    type: String,
    enum: INQUIRY_TYPES,
    default: 'general',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  source: {
    type: String,
    enum: ['mobile', 'web', 'admin'],
    default: 'web',
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  resolvedAt: Date,
  lastReplyAt: Date,
}, {
  timestamps: true,
});

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ email: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

supportTicketSchema.statics.generateTicketNumber = function generateTicketNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ST-${y}${m}${d}-${rand}`;
};

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
module.exports.INQUIRY_TYPES = INQUIRY_TYPES;
