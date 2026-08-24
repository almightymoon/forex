const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { authenticateToken, requireVerifiedPayment } = require('../middleware/auth');
const { canModerateCommunity, canDeleteCommunityMessage } = require('../utils/communityPermissions');
const { broadcastMessage, broadcastToAll } = require('../websocket');
const { uploadImage } = require('../config/cloudinary');

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/** Extract @handles from chat text, e.g. @Ali or @moon. */
function extractMentionHandles(content) {
  const text = String(content || '');
  const matches = text.match(/@([A-Za-z][\w.-]{0,40})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/**
 * Push + bell for replies and @mentions on a community message.
 */
async function notifyCommunityRecipients({ message, channel, author }) {
  const User = require('../models/User');
  const notificationService = require('../services/notificationService');

  const authorId = String(author?._id || author?.id || '');
  const authorName =
    [author?.firstName, author?.lastName].filter(Boolean).join(' ').trim() ||
    message?.author?.firstName ||
    'Someone';
  const channelName = channel?.name ? `#${channel.name}` : 'community';
  const snippet = String(message.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  const link = '/(app)/community';

  /** @type {Map<string, { title: string, message: string }>} */
  const byUser = new Map();

  // 1) Reply → notify original author
  const parentAuthorId =
    message.parentMessage?.author?._id?.toString?.() ||
    message.parentMessage?.author?.toString?.() ||
    null;
  if (parentAuthorId && parentAuthorId !== authorId) {
    byUser.set(parentAuthorId, {
      title: `${authorName} replied to you`,
      message: snippet ? `${channelName}: ${snippet}` : `New reply in ${channelName}`,
    });
  }

  // 2) @mentions → match firstName / lastName / email local-part against channel members (or all active for public)
  const handles = extractMentionHandles(message.content);
  if (handles.length > 0) {
    let candidates = [];
    const memberIds = (channel.members || [])
      .map((m) => m.userId)
      .filter(Boolean);

    if (channel.isPrivate && memberIds.length > 0) {
      candidates = await User.find({ _id: { $in: memberIds }, isActive: { $ne: false } })
        .select('_id firstName lastName email')
        .lean();
    } else {
      candidates = await User.find({ isActive: { $ne: false } })
        .select('_id firstName lastName email')
        .limit(500)
        .lean();
    }

    for (const user of candidates) {
      const uid = user._id.toString();
      if (uid === authorId) continue;
      const first = String(user.firstName || '').toLowerCase();
      const last = String(user.lastName || '').toLowerCase();
      const full = `${first}${last}`;
      const emailLocal = String(user.email || '')
        .split('@')[0]
        .toLowerCase();
      const hit = handles.some(
        (h) =>
          h === first ||
          h === last ||
          h === full ||
          h === `${first}.${last}` ||
          h === emailLocal
      );
      if (!hit) continue;
      byUser.set(uid, {
        title: `${authorName} mentioned you`,
        message: snippet ? `${channelName}: ${snippet}` : `You were mentioned in ${channelName}`,
      });
    }
  }

  if (byUser.size === 0) return;

  // Persist mention refs on the message (best-effort)
  try {
    const mentionDocs = [...byUser.keys()].map((userId) => ({ userId, type: 'user' }));
    if (mentionDocs.length > 0) {
      message.mentions = mentionDocs;
      await message.save();
    }
  } catch (e) {
    console.warn('[Community] Failed to persist mentions:', e.message);
  }

  // One notification per recipient (title may differ for reply vs mention)
  await Promise.all(
    [...byUser.entries()].map(([userId, copy]) =>
      notificationService.createNotification({
        user: userId,
        type: 'message',
        title: copy.title,
        message: copy.message,
        link,
        data: {
          type: 'message',
          channelId: channel._id?.toString?.() || String(channel._id || ''),
          messageId: message._id?.toString?.() || String(message._id || ''),
          link,
        },
      }).catch((err) => {
        console.error('[Community] createNotification failed:', err.message);
      })
    )
  );
}

const communityImageDir = path.join(__dirname, '..', 'uploads', 'community-images');
if (!fs.existsSync(communityImageDir)) {
  fs.mkdirSync(communityImageDir, { recursive: true });
}

const communityImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, communityImageDir),
    filename: (_req, file, cb) =>
      cb(null, `community-${Date.now()}-${(file.originalname || 'image').replace(/\s+/g, '-')}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed.'));
  },
});

// Get all public channels
router.get('/channels', authenticateToken, requireVerifiedPayment, async (req, res) => {
  try {
    const channels = await Channel.findPublic();
    res.json({ success: true, channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch channels' });
  }
});

// Get channels by user membership
router.get('/channels/my', authenticateToken, requireVerifiedPayment, async (req, res) => {
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
    
    // Broadcast new channel via WebSocket
    broadcastToAll('channel:new', channel);
    
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

// Send message to channel (JSON or multipart with optional image)
router.post('/channels/:id/messages', authenticateToken, (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }
  communityImageUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid image file' });
    }
    next();
  });
}, async (req, res) => {
  let tempFilePath = null;
  try {
    const rawContent = req.body?.content;
    const content = String(Array.isArray(rawContent) ? rawContent[0] : rawContent || '').trim();
    const rawParentId = req.body?.parentMessageId;
    const parentMessageId = String(Array.isArray(rawParentId) ? rawParentId[0] : rawParentId || '').trim() || null;
    const hasImage = !!req.file;

    if (!content && !hasImage) {
      return res.status(400).json({ success: false, message: 'Message text or image is required' });
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

    let parentMessage = null;
    if (parentMessageId) {
      parentMessage = await Message.findById(parentMessageId);
      if (!parentMessage || parentMessage.channelId.toString() !== req.params.id) {
        return res.status(400).json({ success: false, message: 'Invalid reply target' });
      }
    }

    const attachments = [];
    if (hasImage) {
      tempFilePath = req.file.path;
      let imageUrl = `/uploads/community-images/${req.file.filename}`;

      if (useCloudinary) {
        try {
          const result = await uploadImage(tempFilePath, 'forex/community-images');
          if (result?.url) imageUrl = result.url;
        } catch (cloudErr) {
          console.error('Cloudinary community image upload failed (using local):', cloudErr.message);
        }
      }

      attachments.push({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: imageUrl,
      });
    }

    // Create message
    const message = new Message({
      content: content || (hasImage ? '📷' : ''),
      author: req.user.id,
      channelId: req.params.id,
      attachments,
      ...(parentMessage ? { parentMessage: parentMessage._id } : {}),
    });

    await message.save();

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }

    if (parentMessage) {
      parentMessage.threadCount = (parentMessage.threadCount || 0) + 1;
      await parentMessage.save();
    }
    
    // Populate author info
    await message.populate('author', 'firstName lastName role');
    await message.populate({
      path: 'parentMessage',
      select: 'content author',
      populate: { path: 'author', select: 'firstName lastName role' },
    });

    // In-app + push for replies and @mentions (same delivery path as signals / test push)
    void notifyCommunityRecipients({
      message,
      channel,
      author: req.user,
    }).catch((err) => {
      console.error('[Community] Notify recipients failed:', err.message);
    });
    
    // Broadcast new message via WebSocket
    broadcastMessage(req.params.id, 'message:new', message);
    
    res.status(201).json({ success: true, message });
  } catch (error) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
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
    
    // Broadcast message update via WebSocket
    broadcastMessage(message.channelId.toString(), 'message:update', message);
    
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

    // Users can delete their own messages; developers, admins, and teachers can delete any message
    if (!canDeleteCommunityMessage(req.user, message.author)) {
      return res.status(403).json({ success: false, message: 'Cannot delete this message' });
    }

    const channelId = message.channelId.toString();
    const messageId = message._id.toString();
    
    await message.deleteOne();
    
    // Broadcast message deletion via WebSocket
    broadcastMessage(channelId, 'message:delete', messageId);
    
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// Purge all messages in a channel (admin/teacher only)
router.delete('/channels/:id/purge', authenticateToken, async (req, res) => {
  try {
    if (!canModerateCommunity(req.user)) {
      return res.status(403).json({ success: false, message: 'Only moderators can purge channels' });
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

// Add/Remove reaction to message
router.post('/messages/:id/reaction', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    console.log('Reaction request:', { messageId: req.params.id, emoji, userId: req.user.id });
    
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      console.log('Message not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    console.log('Found message:', message._id, 'Current reactions:', message.reactions);

    // Check if user is member (for private channels)
    const channel = await Channel.findById(message.channelId);
    if (channel.isPrivate) {
      const isMember = channel.members.some(m => m.userId.toString() === req.user.id);
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    const userAlreadyReacted = existingReaction && existingReaction.users.includes(req.user.id);

    console.log('Existing reaction:', existingReaction, 'User already reacted:', userAlreadyReacted);

    if (userAlreadyReacted) {
      // Remove reaction
      console.log('Removing reaction');
      await message.removeReaction(emoji, req.user.id);
    } else {
      // Add reaction
      console.log('Adding reaction');
      await message.addReaction(emoji, req.user.id);
    }

    // Populate author info
    await message.populate('author', 'firstName lastName role');
    
    console.log('Final message with reactions:', message.reactions);
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error handling reaction:', error);
    res.status(500).json({ success: false, message: 'Failed to handle reaction' });
  }
});

// Delete channel (teachers and admins only)
router.delete('/channels/:id', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (!canModerateCommunity(req.user)) {
      return res.status(403).json({ success: false, message: 'Only moderators can delete channels' });
    }

    const channelId = req.params.id;
    
    // Delete all messages in the channel
    await Message.deleteMany({ channelId });

    // Delete the channel
    await Channel.findByIdAndDelete(channelId);

    // Broadcast channel deletion via WebSocket
    broadcastToAll('channel:delete', channelId);

    res.json({ success: true, message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ success: false, message: 'Failed to delete channel' });
  }
});

module.exports = router;
