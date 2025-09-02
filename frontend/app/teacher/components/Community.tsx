'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, 
  Users, 
  Plus, 
  Search, 
  Send, 
  Smile, 
  Paperclip, 
  Settings,
  Lock,
  Crown,
  Shield,
  X,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { showToast } from '@/utils/toast';

interface Channel {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  isLocked: boolean;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    author: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface Message {
  _id: string;
  content: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  timestamp: string;
  channelId: string;
  isEdited?: boolean;
  isPinned?: boolean;
}

interface CommunityProps {
  students: any[];
  courses: any[];
}

export default function Community({ students, courses }: CommunityProps) {
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [showChannelCreator, setShowChannelCreator] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user info from token
  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.userId,
        role: payload.role
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Check if user can delete a message
  const canDeleteMessage = (message: Message) => {
    if (!currentUser) return false;
    
    // Admins and teachers can delete any message
    if (currentUser.role === 'admin' || currentUser.role === 'teacher') {
      return true;
    }
    
    // Regular users can only delete their own messages
    return message.author._id === currentUser.id;
  };

  // Fetch channels from MongoDB
  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/community/channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChannels(data.channels);
          if (!activeChannel && data.channels.length > 0) {
            setActiveChannel(data.channels[0]._id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      showToast('Failed to fetch channels', 'error');
    }
  };

  // Fetch messages for a channel
  const fetchMessages = async (channelId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/community/channels/${channelId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to fetch messages', 'error');
    }
  };

  // Send message to channel
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || sendingMessage) return;

    // Check for special commands first
    if (messageInput.startsWith('/')) {
      if (handleSpecialCommand(messageInput)) {
        return;
      }
    }

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/community/channels/${activeChannel}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageInput.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessageInput('');
          // Add the new message to the list
          setMessages(prev => [data.message, ...prev]);
          // Refresh channels to update last message
          await fetchChannels();
        }
      } else {
        showToast('Failed to send message', 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle special commands for teachers
  const handleSpecialCommand = (input: string) => {
    const command = input.toLowerCase().trim();
    
    if (command === '/clear') {
      if (currentUser?.role === 'admin' || currentUser?.role === 'teacher') {
        handlePurgeChannel(activeChannel);
        setMessageInput('');
        return true;
      } else {
        showToast('Only teachers and admins can use this command', 'error');
        return true;
      }
    }
    
    if (command === '/help') {
      showToast('Available commands: /clear (clear all messages), /help', 'info');
      setMessageInput('');
      return true;
    }
    
    return false;
  };

  // Purge all messages from a channel (admin/teacher only)
  const handlePurgeChannel = async (channelId: string) => {
    if (!channelId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/community/channels/${channelId}/purge`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('Channel messages cleared successfully', 'success');
          // Clear messages from local state
          setMessages([]);
          // Refresh channels to update last message
          await fetchChannels();
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to clear channel messages', 'error');
      }
    } catch (error) {
      console.error('Error clearing channel messages:', error);
      showToast('Failed to clear channel messages', 'error');
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/community/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('Message deleted successfully', 'success');
          // Remove message from local state
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
          // Refresh channels to update last message
          await fetchChannels();
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to delete message', 'error');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Failed to delete message', 'error');
    } finally {
      setShowMessageMenu(null);
    }
  };

  // Create new channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;

    setCreatingChannel(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/community/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDescription.trim(),
          isPrivate: isPrivateChannel
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('Channel created successfully!', 'success');
          setNewChannelName('');
          setNewChannelDescription('');
          setIsPrivateChannel(false);
          setShowChannelCreator(false);
          // Refresh channels
          await fetchChannels();
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to create channel', 'error');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      showToast('Failed to create channel', 'error');
    } finally {
      setCreatingChannel(false);
    }
  };

  // Load messages when channel changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel);
    }
  }, [activeChannel]);

  // Auto-refresh messages every 3 seconds for real-time updates
  useEffect(() => {
    if (!activeChannel) return;

    const interval = setInterval(() => {
      fetchMessages(activeChannel);
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [activeChannel]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setCurrentUser(getCurrentUser());
      await fetchChannels();
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Left Sidebar - Channels */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Trading Community</h2>
            <button
              onClick={() => setShowChannelCreator(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Create New Channel"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">Connect • Learn • Grow</p>
        </div>
        
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Channels ({channels.length})
          </h3>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel._id}
                onClick={() => setActiveChannel(channel._id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeChannel === channel._id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {channel.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate">#{channel.name}</span>
                    {channel.isPrivate && <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{channel.description}</p>
                  {channel.lastMessage && channel.lastMessage.author && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {channel.lastMessage.author.firstName}: {channel.lastMessage.content}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{channel.memberCount}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {/* Channel Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {channels.find(c => c._id === activeChannel)?.name ? 
              `#${channels.find(c => c._id === activeChannel)?.name}` : 
              'Select a channel'
            }
          </h3>
          {channels.find(c => c._id === activeChannel)?.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {channels.find(c => c._id === activeChannel)?.description}
            </p>
          )}
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {!activeChannel ? (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Channel</h3>
              <p className="text-gray-500 dark:text-gray-400">Choose a channel from the sidebar to start chatting</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No messages yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message._id} className="flex space-x-3 group relative">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {message.author.firstName.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {message.author.firstName} {message.author.lastName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                      {message.author.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {message.author.role === 'teacher' && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{message.content}</p>
                  </div>
                  
                  {/* Message Actions Menu */}
                  {canDeleteMessage(message) && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMessageMenu(showMessageMenu === message._id ? null : message._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </button>
                      
                      {showMessageMenu === message._id && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        {activeChannel && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={sendingMessage}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingMessage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel Creator Modal */}
      <AnimatePresence>
        {showChannelCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Channel</h3>
                <button
                  onClick={() => setShowChannelCreator(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g., general, trading-tips"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="What is this channel about?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="privateChannel"
                    checked={isPrivateChannel}
                    onChange={(e) => setIsPrivateChannel(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="privateChannel" className="text-sm text-gray-700">
                    Make this channel private
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowChannelCreator(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateChannel}
                    disabled={!newChannelName.trim() || creatingChannel}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {creatingChannel ? 'Creating...' : 'Create Channel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
