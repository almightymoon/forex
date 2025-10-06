const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "https://thefxnavigators.com",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userEmail = user.email;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userEmail} connected to WebSocket`);

    // Track user's current channel
    socket.currentChannel = null;

    // Join channel room
    socket.on('join-channel', (data) => {
      const { channelId } = data;
      
      // Leave previous channel if any
      if (socket.currentChannel && socket.currentChannel !== channelId) {
        socket.leave(`channel-${socket.currentChannel}`);
        console.log(`User ${socket.userEmail} left channel ${socket.currentChannel}`);
      }
      
      socket.join(`channel-${channelId}`);
      socket.currentChannel = channelId;
      console.log(`User ${socket.userEmail} joined channel ${channelId}`);
    });

    // Leave channel room
    socket.on('leave-channel', (data) => {
      const { channelId } = data;
      socket.leave(`channel-${channelId}`);
      if (socket.currentChannel === channelId) {
        socket.currentChannel = null;
      }
      console.log(`User ${socket.userEmail} left channel ${channelId}`);
    });

    // Handle new message
    socket.on('message-created', (data) => {
      const { channelId, message } = data;
      // Broadcast to all users in the channel except sender
      socket.to(`channel-${channelId}`).emit('message:new', message);
      console.log(`Message broadcasted to channel ${channelId} (excluding sender)`);
    });

    // Handle message update
    socket.on('message-updated', (data) => {
      const { channelId, message } = data;
      // Broadcast to all users in the channel
      io.to(`channel-${channelId}`).emit('message:update', message);
      console.log(`Message update broadcasted to channel ${channelId}`);
    });

    // Handle message deletion
    socket.on('message-deleted', (data) => {
      const { channelId, messageId } = data;
      // Broadcast to all users in the channel
      io.to(`channel-${channelId}`).emit('message:delete', messageId);
      console.log(`Message deletion broadcasted to channel ${channelId}`);
    });

    // Handle channel creation
    socket.on('channel-created', (data) => {
      const { channel } = data;
      // Broadcast to all connected users
      io.emit('channel:new', channel);
      console.log(`New channel broadcasted to all users`);
    });

    // Handle channel deletion
    socket.on('channel-deleted', (data) => {
      const { channelId } = data;
      // Broadcast to all connected users
      io.emit('channel:delete', channelId);
      console.log(`Channel deletion broadcasted to all users`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userEmail} disconnected from WebSocket`);
    });
  });

  return io;
};

// Helper function to broadcast events from API routes
const broadcastMessage = (channelId, event, data) => {
  if (io) {
    console.log(`Broadcasting ${event} to channel ${channelId}:`, data);
    io.to(`channel-${channelId}`).emit(event, data);
  }
};

const broadcastToAll = (event, data) => {
  if (io) {
    console.log(`Broadcasting ${event} to all users:`, data);
    io.emit(event, data);
  }
};

module.exports = {
  initializeWebSocket,
  broadcastMessage,
  broadcastToAll
};
