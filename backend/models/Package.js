const mongoose = require('mongoose');

const commissionRatesSchema = new mongoose.Schema(
  {
    1: { type: Number, default: 0.2 },
    2: { type: Number, default: 0.15 },
    3: { type: Number, default: 0.15 },
    4: { type: Number, default: 0.1 },
    5: { type: Number, default: 0.1 }
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    features: { type: [String], default: [] },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },

    // Commission configuration
    packageCommissionEnabled: { type: Boolean, default: true },
    referralPoolPercentage: { type: Number, default: 0, min: 0, max: 1 },
    commissionRates: { type: commissionRatesSchema, default: () => ({}) },

    // Monthly fee policy
    monthlyFeeEnabled: { type: Boolean, default: false },
    monthlyFeeAmount: { type: Number, default: 50, min: 0 },
    monthlyFeeGraceDays: { type: Number, default: 3, min: 0, max: 31 },
    monthlyFeeFreeMonths: { type: Number, default: 0, min: 0, max: 120 },

    // Monthly fee commission distribution (separate from one-time package purchase).
    // If not set, services fall back to the package's main referralPoolPercentage/commissionRates.
    monthlyFeeReferralPoolPercentage: { type: Number, default: null, min: 0, max: 1 },
    monthlyFeeCommissionRates: { type: commissionRatesSchema, default: null },

    // Withdrawals
    // If null/undefined, system fallback is used.
    minWithdrawalAmount: { type: Number, default: null, min: 0 }
  },
  { timestamps: true }
);

packageSchema.statics.ensureDefaults = async function ensureDefaults() {
  const defaults = [
    {
      name: 'FX Launch',
      subtitle: 'Launch your trading journey',
      price: 100,
      features: [
        'Forex Trading Signals',
        'Forex Basic Mentorship',
        'Premium Indicators',
        'Auto Trading Access',
        'Community Support',
        'Email Support'
      ],
      image: '/pkg1.jpg',
      sortOrder: 1,
      referralPoolPercentage: 0.7,
      commissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 },
      monthlyFeeReferralPoolPercentage: 0.7,
      monthlyFeeCommissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 },
      monthlyFeeEnabled: true,
      monthlyFeeAmount: 50,
      monthlyFeeGraceDays: 3,
      monthlyFeeFreeMonths: 0
    },
    {
      name: 'FX Scale',
      subtitle: 'Grow with structure',
      price: 250,
      features: [
        'Forex Trading Signals',
        'Live Online Mentorship Sessions',
        'Premium Indicators',
        'Auto Trading Access',
        'Priority Support',
        'Weekly Market Analysis',
        'Risk Management Strategies'
      ],
      image: '/pkg2.jpg',
      sortOrder: 2,
      referralPoolPercentage: 0.4,
      commissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 },
      monthlyFeeReferralPoolPercentage: 0.4,
      monthlyFeeCommissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 },
      monthlyFeeEnabled: true,
      monthlyFeeAmount: 50,
      monthlyFeeGraceDays: 3,
      monthlyFeeFreeMonths: 6
    },
    {
      name: 'FX Legacy',
      subtitle: 'Trade for life',
      price: 1000,
      features: [
        'Forex Trading Signals',
        'Forex Pro Mentorship',
        'Premium Indicators',
        'Auto Trading Access',
        'Physical (On-Ground) Classes',
        '1-on-1 Coaching Sessions',
        'Advanced Trading Strategies',
        'Lifetime Access',
        'VIP Community Access'
      ],
      image: '/pkg3.jpg',
      sortOrder: 3,
      referralPoolPercentage: 0.25,
      commissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 },
      monthlyFeeReferralPoolPercentage: 0.25,
      monthlyFeeCommissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 },
      monthlyFeeEnabled: false,
      monthlyFeeAmount: 0,
      monthlyFeeGraceDays: 3,
      monthlyFeeFreeMonths: 999
    }
  ];

  // Insert-only defaults for full document (preserves admin edits to name/price/features on existing rows).
  for (const def of defaults) {
    await this.updateOne(
      { name: def.name },
      { $setOnInsert: { ...def, isActive: true, currency: def.currency || 'USD' } },
      { upsert: true }
    );
  }

  // Sync monthly-fee policy from code defaults when the tier still has the same `price`
  // (fixes older DBs where Launch/Scale were created before monthlyFeeEnabled existed).
  const policyKeys = [
    'monthlyFeeEnabled',
    'monthlyFeeAmount',
    'monthlyFeeGraceDays',
    'monthlyFeeFreeMonths',
    'monthlyFeeReferralPoolPercentage',
    'monthlyFeeCommissionRates'
  ];
  for (const def of defaults) {
    // IMPORTANT: do NOT overwrite admin-edited policy values.
    // Only fill missing fields for existing rows that were created before these keys existed.
    const existing = await this.findOne({ name: def.name, price: def.price })
      .select(policyKeys.join(' '))
      .lean();
    if (!existing) continue;

    const policyPatch = {};
    for (const k of policyKeys) {
      if (def[k] === undefined) continue;
      const current = existing[k];
      const isMissing = current === undefined || current === null;
      if (isMissing) policyPatch[k] = def[k];
    }
    if (Object.keys(policyPatch).length > 0) {
      await this.updateOne({ _id: existing._id }, { $set: policyPatch });
    }
  }
};

module.exports = mongoose.model('Package', packageSchema);

