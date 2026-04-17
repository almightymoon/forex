const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String },
      role: { type: String }
    },
    action: { type: String, required: true, index: true },
    entity: {
      type: { type: String, index: true },
      id: { type: mongoose.Schema.Types.ObjectId },
      label: { type: String }
    },
    metadata: { type: Object, default: {} },
    ip: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

