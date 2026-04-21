const mongoose = require('mongoose');

const platformCommissionLedgerSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['credit', 'debit']
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

platformCommissionLedgerSchema.index({ createdAt: -1 });

platformCommissionLedgerSchema.statics.getCurrentBalance = async function getCurrentBalance() {
  const last = await this.findOne()
    .sort({ createdAt: -1 })
    .select('balanceAfter')
    .lean();
  const v = last?.balanceAfter;
  return typeof v === 'number' && !Number.isNaN(v) ? Math.round(v * 100) / 100 : 0;
};

/**
 * @param {{ type: 'credit'|'debit', amount: number, description: string, notes?: string, performedBy?: import('mongoose').Types.ObjectId }}
 */
platformCommissionLedgerSchema.statics.createEntry = async function createEntry(data) {
  const { type, description, notes, performedBy } = data;
  const raw = parseFloat(data.amount);
  const amt = Math.round(raw * 100) / 100;
  if (!Number.isFinite(amt) || amt < 0.01) {
    throw new Error('Amount must be at least 0.01');
  }
  if (type !== 'credit' && type !== 'debit') {
    throw new Error('Invalid entry type');
  }

  const balanceBefore = await this.getCurrentBalance();
  const delta = type === 'credit' ? amt : -amt;
  const balanceAfter = Math.round((balanceBefore + delta) * 100) / 100;
  if (balanceAfter < 0) {
    throw new Error('Insufficient platform commission balance');
  }

  const entry = new this({
    type,
    amount: amt,
    balanceBefore,
    balanceAfter,
    description: description.trim(),
    notes: notes ? String(notes).trim() : undefined,
    performedBy
  });
  await entry.save();
  return entry;
};

module.exports = mongoose.model('PlatformCommissionLedger', platformCommissionLedgerSchema);
