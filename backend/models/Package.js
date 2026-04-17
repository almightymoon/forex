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
    referralPoolPercentage: { type: Number, default: 0, min: 0, max: 1 },
    commissionRates: { type: commissionRatesSchema, default: () => ({}) }
  },
  { timestamps: true }
);

packageSchema.statics.ensureDefaults = async function ensureDefaults() {
  const count = await this.countDocuments();
  if (count > 0) return;

  await this.insertMany([
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
      commissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 }
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
      commissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 }
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
      commissionRates: { 1: 0.2, 2: 0.15, 3: 0.15, 4: 0.1, 5: 0.1 }
    }
  ]);
};

module.exports = mongoose.model('Package', packageSchema);

