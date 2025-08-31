const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');

// Get all public channels
router.get('/channels', authenticateToken, async (req, res) => {
  try {
    const channels = await Channel.findPublic();
    res.json({ success: true, channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch channels' });
  }
});

// Get channels by user membership
router.get('/channels/my', authenticateToken, async (req, res) => {
  try {
    const channels = await Channel.findByUserMembership(req.user.id);
    res.json({ success: true, channels });
  } catch (error) {
    console.error('Error fetching user channels:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user channels' });
  }
});

// Create new channel
router.post('/channels', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    // Check if channel name already exists
    const existingChannel = await Channel.findOne({ name: name.toLowerCase() });
    if (existingChannel) {
      return res.status(400).json({ 
        success: false, 
        message: 'Channel name already exists' 
      });
    }

    // Create new channel
    const channel = new Channel({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      isPrivate: isPrivate || false,
      createdBy: req.user.id,
      members: [{ userId: req.user.id, role: 'admin' }],
      memberCount: 1
    });

    await channel.save();
    
    // Populate creator info
    await channel.populate('createdBy', 'firstName lastName');
    
    res.status(201).json({ success: true, channel });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ success: false, message: 'Failed to create channel' });
  }
});

// Get channel by ID
router.get('/channels/:id', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('members.userId', 'firstName lastName role')
      .populate('lastMessage.author', 'firstName lastName');
    
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Check if user is member (for private channels)
    if (channel.isPrivate) {
      const isMember = channel.members.some(m => m.userId._id.toString() === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, channel });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch channel' });
  }
});

// Join channel
router.post('/channels/:id/join', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.isLocked) {
      return res.status(403).json({ success: false, message: 'Channel is locked' });
    }

    await channel.addMember(req.user.id);
    res.json({ success: true, message: 'Joined channel successfully' });
  } catch (error) {
    console.error('Error joining channel:', error);
    res.status(500).json({ success: false, message: 'Failed to join channel' });
  }
});

// Leave channel
router.post('/channels/:id/leave', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Prevent leaving if user is the only admin
    const userMembership = channel.members.find(m => m.userId.toString() === req.user.id);
    if (userMembership?.role === 'admin' && channel.members.filter(m => m.role === 'admin').length === 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot leave channel as the only admin. Transfer ownership first.' 
      });
    }

    await channel.removeMember(req.user.id);
    res.json({ success: true, message: 'Left channel successfully' });
  } catch (error) {
    console.error('Error leaving channel:', error);
    res.status(500).json({ success: false, message: 'Failed to leave channel' });
  }
});

// Get messages for a channel
router.get('/channels/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    // Check if user is member (for private channels)
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.isPrivate) {
      const isMember = channel.members.some(m => m.userId.toString() === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const messages = await Message.findByChannel(req.params.id, parseInt(limit), parseInt(skip));
    res.json({ success: true, messages: messages.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Send message to channel
router.post('/channels/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    // Check if user is member (for private channels)
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.isPrivate) {
      const isMember = channel.members.some(m => m.userId.toString() === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Check if user can send messages
    if (!channel.permissions.canSendMessages) {
      return res.status(403).json({ success: false, message: 'Cannot send messages in this channel' });
    }

    // Create message
    const message = new Message({
      content: content.trim(),
      author: req.user.id,
      channelId: req.params.id
    });

    await message.save();
    
    // Populate author info
    await message.populate('author', 'firstName lastName role');
    
    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Edit message
router.put('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check if user can edit this message
    if (message.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Cannot edit this message' });
    }

    await message.edit(content.trim());
    
    // Populate author info
    await message.populate('author', 'firstName lastName role');
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, message: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/messages/:id', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Users can delete their own messages
    // Teachers and admins can delete any message
    if (message.author.toString() !== req.user.id && 
        req.user.role !== 'teacher' && 
        req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete this message' });
    }

    await message.deleteOne();
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// Purge all messages in a channel (admin/teacher only)
router.delete('/channels/:id/purge', authenticateToken, async (req, res) => {
  try {
    // Only admins and teachers can purge channels
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only admins and teachers can purge channels' });
    }

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    // Delete all messages in the channel
    await Message.deleteMany({ channelId: req.params.id });
    
    // Update channel's lastMessage
    await channel.updateLastMessage(null);
    
    res.json({ success: true, message: 'Channel purged successfully' });
  } catch (error) {
    console.error('Error purging channel:', error);
    res.status(500).json({ success: false, message: 'Failed to purge channel' });
  }
});

// Search messages
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, channelId } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const messages = await Message.search(query.trim(), channelId);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to search messages' });
  }
});

// Get pinned messages for a channel
router.get('/channels/:id/pinned', authenticateToken, async (req, res) => {
  try {
    // Check if user is member (for private channels)
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.isPrivate) {
      const isMember = channel.members.some(m => m.userId.toString() === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const pinnedMessages = await Message.findPinnedByChannel(req.params.id);
    res.json({ success: true, messages: pinnedMessages });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pinned messages' });
  }
});

// Pin/Unpin message
router.post('/messages/:id/pin', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check if user can pin messages
    const channel = await Channel.findById(message.channelId);
    const userMembership = channel.members.find(m => m.userId.toString() === req.user.id);
    
    if (userMembership?.role !== 'admin' && userMembership?.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Cannot pin messages' });
    }

    await message.togglePin(req.user.id);
    
    // Populate author info
    await message.populate('author', 'firstName lastName role');
    
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({ success: false, message: 'Failed to pin message' });
  }
});

module.exports = router;
