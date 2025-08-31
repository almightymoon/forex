const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  memberCount: {
    type: Number,
    default: 0
  },
  lastMessage: {
    content: String,
    timestamp: Date,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  permissions: {
    canSendMessages: {
      type: Boolean,
      default: true
    },
    canAttachFiles: {
      type: Boolean,
      default: true
    },
    canEditMessages: {
      type: Boolean,
      default: false
    },
    canDeleteMessages: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
channelSchema.index({ name: 1 });
channelSchema.index({ isPrivate: 1 });
channelSchema.index({ createdAt: -1 });
channelSchema.index({ 'lastMessage.timestamp': -1 });

// Virtual for formatted name
channelSchema.virtual('displayName').get(function() {
  return `#${this.name}`;
});

// Method to add member
channelSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
  if (!existingMember) {
    this.members.push({ userId, role });
    this.memberCount = this.members.length;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove member
channelSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.userId.toString() !== userId.toString());
  this.memberCount = this.members.length;
  return this.save();
};

// Method to update last message
channelSchema.methods.updateLastMessage = function(content, authorId) {
  this.lastMessage = {
    content,
    timestamp: new Date(),
    author: authorId
  };
  return this.save();
};

// Static method to find channels by user membership
channelSchema.statics.findByUserMembership = function(userId) {
  return this.find({
    'members.userId': userId,
    isPrivate: false
  }).populate('createdBy', 'firstName lastName');
};

// Static method to find public channels
channelSchema.statics.findPublic = function() {
  return this.find({ isPrivate: false })
    .populate('createdBy', 'firstName lastName')
    .populate('lastMessage.author', 'firstName lastName')
    .sort({ 'lastMessage.timestamp': -1, createdAt: -1 });
};

module.exports = mongoose.model('Channel', channelSchema);
