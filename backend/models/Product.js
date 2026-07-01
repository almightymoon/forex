const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Product ID can only contain lowercase letters, numbers, and hyphens']
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  longDescription: {
    type: String,
    trim: true
  },
  outcomePromise: {
    type: String,
    trim: true,
    maxlength: [300, 'Outcome/Promise cannot exceed 300 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each tag cannot exceed 50 characters']
  }],
  primaryImage: {
    type: String,
    trim: true
  },
  galleryImages: [{
    type: String,
    trim: true
  }],
  requirements: {
    type: String,
    trim: true,
    maxlength: [500, 'Requirements cannot exceed 500 characters']
  },
  currentVersion: {
    type: String,
    trim: true,
    default: 'v1.0',
    maxlength: [20, 'Version cannot exceed 20 characters']
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [70, 'SEO title should not exceed 70 characters']
  },
  seoMetaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO meta description should not exceed 160 characters']
  },
  stripeProductId: {
    type: String,
    trim: true,
    sparse: true
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  deliveryUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.index({ status: 1 });
productSchema.index({ category: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Product', productSchema);
