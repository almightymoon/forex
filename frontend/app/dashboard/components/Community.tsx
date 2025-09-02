'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, 
  Send, 
  Lock,
  Crown,
  Shield,
  Trash2,
  MoreVertical,
  Pencil
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useLanguage } from '../../../context/LanguageContext';

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

export default function Community() {
  const { t } = useLanguage();
  
  // Safety check for t function
  const safeT = (key: string) => {
    try {
      return t(key);
    } catch (error) {
      console.warn('Translation function not ready:', error);
      return key;
    }
  };
  
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
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
    if (!currentUser || !message.author) return false;
    
    // Users can only delete their own messages
    return message.author._id === currentUser.id;
  };

  // Check if user can edit a message
  const canEditMessage = (message: Message) => {
    if (!currentUser || !message.author) return false;
    
    // Users can only edit their own messages
    return message.author._id === currentUser.id;
  };

  // Start editing a message
  const startEditMessage = (message: Message) => {
    setEditingMessage(message._id);
    setEditContent(message.content);
    setShowMessageMenu(null);
  };

  // Save edited message
  const saveEditMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/community/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('Message updated successfully', 'success');
          // Update message in local state
          setMessages(prev => prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, content: editContent.trim(), isEdited: true }
              : msg
          ));
          setEditingMessage(null);
          setEditContent('');
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to update message', 'error');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      showToast('Failed to update message', 'error');
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
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

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setChannels([...channels]);
      setMessages([...messages]);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [channels, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMessageMenu && !(event.target as Element).closest('.message-menu')) {
        setShowMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMessageMenu]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Left Sidebar - Channels */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Trading Community</h2>
            {/* Students cannot create channels - removed add button */}
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
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {channel.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate">#{channel.name}</span>
                    {channel.isPrivate && <Lock className="w-3 h-3 text-gray-400" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{channel.description}</p>
                  {channel.lastMessage && channel.lastMessage.author && (
                    <p className="text-xs text-gray-400 truncate">
                      {channel.lastMessage.author.firstName}: {channel.lastMessage.content}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{channel.memberCount}</span>
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
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message._id} className="flex space-x-3 group relative p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 border border-gray-100 dark:border-gray-600">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {message.author?.firstName?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {message.author?.firstName || 'Unknown'} {message.author?.lastName || 'User'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                      {message.author?.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {message.author?.role === 'teacher' && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    {editingMessage === message._id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEditMessage(message._id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-gray-700 dark:text-gray-300">{message.content}</p>
                        {message.isEdited && (
                          <p className="text-xs text-gray-400 mt-1 italic">(edited)</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Message Actions Menu */}
                  {(canDeleteMessage(message) || canEditMessage(message)) && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMessageMenu(showMessageMenu === message._id ? null : message._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all duration-200"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {showMessageMenu === message._id && (
                        <div className="message-menu absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                          {canEditMessage(message) && (
                            <button
                              onClick={() => startEditMessage(message)}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                          )}
                          {canDeleteMessage(message) && (
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          )}
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
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    </div>
  );
}
