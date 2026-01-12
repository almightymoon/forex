const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['academic', 'professional', 'achievement', 'completion', 'custom'],
    default: 'academic'
  },
  
  // Template Design
  backgroundImage: {
    type: String, // URL to uploaded image
    required: true
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  
  // Text Elements Configuration
  elements: [{
    type: {
      type: String,
      enum: ['text', 'image', 'signature', 'logo', 'border', 'stamp'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    width: {
      type: Number,
      default: 200
    },
    height: {
      type: Number,
      default: 50
    },
    
    // Text-specific properties
    text: {
      type: String,
      default: ''
    },
    fontFamily: {
      type: String,
      default: 'Arial'
    },
    fontSize: {
      type: Number,
      default: 16
    },
    fontWeight: {
      type: String,
      enum: ['normal', 'bold', 'italic', 'bold-italic'],
      default: 'normal'
    },
    textColor: {
      type: String,
      default: '#000000'
    },
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'center'
    },
    
    // Dynamic content mapping
    dynamicContent: {
      type: String,
      enum: ['studentName', 'courseTitle', 'instructorName', 'completionDate', 'grade', 'certificateNumber', 'custom'],
      default: 'custom'
    },
    
    // Image-specific properties
    imageUrl: {
      type: String,
      default: ''
    },
    
    // Signature properties
    signatureType: {
      type: String,
      enum: ['text', 'image', 'drawing'],
      default: 'text'
    }
  }],
  
  // Layout settings
  dimensions: {
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 600
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Usage statistics
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Tags for search
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
certificateTemplateSchema.index({ name: 1 });
certificateTemplateSchema.index({ category: 1 });
certificateTemplateSchema.index({ isPublic: 1 });
certificateTemplateSchema.index({ tags: 1 });
certificateTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
