const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: Date,
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['user', 'channel'],
      default: 'user'
    }
  }],
  reactions: [{
    emoji: String,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: {
      type: Number,
      default: 0
    }
  }],
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  threadMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  isThread: {
    type: Boolean,
    default: false
  },
  threadCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ author: 1, createdAt: -1 });
messageSchema.index({ isPinned: 1, channelId: 1 });
messageSchema.index({ 'mentions.userId': 1 });
messageSchema.index({ parentMessage: 1 });

// Virtual for formatted content
messageSchema.virtual('displayContent').get(function() {
  if (this.isEdited) {
    return `${this.content} (edited)`;
  }
  return this.content;
});

// Method to add reaction
messageSchema.methods.addReaction = function(emoji, userId) {
  let reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (!reaction) {
    reaction = { emoji, users: [userId], count: 1 };
    this.reactions.push(reaction);
  } else {
    if (!reaction.users.includes(userId)) {
      reaction.users.push(userId);
      reaction.count = reaction.users.length;
    }
  }
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(emoji, userId) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    reaction.users = reaction.users.filter(id => id.toString() !== userId.toString());
    reaction.count = reaction.users.length;
    
    if (reaction.count === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
  }
  
  return this.save();
};

// Method to edit message
messageSchema.methods.edit = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Method to pin/unpin message
messageSchema.methods.togglePin = function(userId) {
  this.isPinned = !this.isPinned;
  if (this.isPinned) {
    this.pinnedAt = new Date();
    this.pinnedBy = userId;
  } else {
    this.pinnedAt = undefined;
    this.pinnedBy = undefined;
  }
  return this.save();
};

// Static method to find messages by channel
messageSchema.statics.findByChannel = function(channelId, limit = 50, skip = 0) {
  return this.find({ channelId })
    .populate('author', 'firstName lastName role')
    .populate('attachments')
    .populate('mentions.userId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to find pinned messages by channel
messageSchema.statics.findPinnedByChannel = function(channelId) {
  return this.find({ channelId, isPinned: true })
    .populate('author', 'firstName lastName role')
    .populate('pinnedBy', 'firstName lastName')
    .sort({ pinnedAt: -1 });
};

// Static method to search messages
messageSchema.statics.search = function(query, channelId = null) {
  const searchQuery = {
    content: { $regex: query, $options: 'i' }
  };
  
  if (channelId) {
    searchQuery.channelId = channelId;
  }
  
  return this.find(searchQuery)
    .populate('author', 'firstName lastName role')
    .populate('channelId', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
};

// Pre-save middleware to update channel's last message
messageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Channel = mongoose.model('Channel');
      await Channel.findByIdAndUpdate(this.channelId, {
        lastMessage: {
          content: this.content,
          timestamp: this.createdAt,
          author: this.author
        }
      });
    } catch (error) {
      console.error('Error updating channel last message:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
