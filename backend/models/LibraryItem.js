const mongoose = require('mongoose');

const libraryItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: [true, 'Item ID is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Item ID can only contain lowercase letters, numbers, and hyphens']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  description: {
    type: String,
    trim: true
  },
  resourceType: {
    type: String,
    enum: ['link', 'google_sheet', 'pdf', 'document', 'book', 'video'],
    default: 'link'
  },
  externalUrl: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    trim: true
  },
  coverImage: {
    type: String,
    trim: true
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
  /** null = all package tiers; otherwise array of package prices e.g. [100, 250, 1000] */
  allowedPackages: {
    type: [Number],
    default: null,
    validate: {
      validator: function (value) {
        if (value === null || value === undefined) return true;
        if (!Array.isArray(value)) return false;
        const validPrices = [100, 250, 1000];
        return value.every((price) => validPrices.includes(price));
      },
      message: 'Allowed packages must be null (all tiers) or prices 100, 250, or 1000'
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'authenticated', 'subscribers'],
    default: 'public'
  },
  author: {
    type: String,
    trim: true,
    maxlength: [120, 'Author cannot exceed 120 characters']
  },
  sortOrder: {
    type: Number,
    default: 0
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

libraryItemSchema.index({ status: 1 });
libraryItemSchema.index({ category: 1 });
libraryItemSchema.index({ resourceType: 1 });
libraryItemSchema.index({ allowedPackages: 1 });
libraryItemSchema.index({ sortOrder: 1, updatedAt: -1 });

module.exports = mongoose.model('LibraryItem', libraryItemSchema);
