'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Plus, 
  Hash,
  Settings,
  Crown,
  Shield,
  User,
  Send,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  Volume2,
  Mic,
  Headphones,
  Search,
  Bell,
  AtSign,
  Smile,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Video,
  Code,
  X,
  MessageCircle
} from 'lucide-react';
import { useToast } from '../../components/Toast';

interface Channel {
  _id: string;
  name: string;
  type: 'text' | 'voice';
  isPrivate: boolean;
  isLocked: boolean;
  createdBy: string;
  createdAt: string;
  lastMessageAt?: string;
  memberCount: number;
}

interface Message {
  _id: string;
  content: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    avatar?: string;
    isOnline: boolean;
    status?: 'online' | 'idle' | 'dnd' | 'offline';
  };
  channelId: string;
  timestamp: string;
  editedAt?: string;
  attachments?: Array<{
    type: 'image' | 'file' | 'video';
    url: string;
    name: string;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  isOnline: boolean;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
}

export default function CommunityPage() {
  const { showToast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    channel: string;
    author: string;
    timestamp: string;
    isRead: boolean;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDirectMessage, setShowDirectMessage] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [directMessages, setDirectMessages] = useState<Array<{
    _id: string;
    content: string;
    author: string;
    recipient: string;
    timestamp: string;
  }>>([]);
  const [isDirectMessageMode, setIsDirectMessageMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Sample data for demonstration
  const sampleChannels: Channel[] = [
    {
      _id: 'general',
      name: 'general',
      type: 'text',
      isPrivate: false,
      isLocked: false,
      createdBy: 'admin',
      createdAt: '2025-08-26T00:00:00Z',
      lastMessageAt: '2025-08-26T14:30:00Z',
      memberCount: 24
    },
    {
      _id: 'trading-discussion',
      name: 'trading-discussion',
      type: 'text',
      isPrivate: false,
      isLocked: false,
      createdBy: 'teacher1',
      createdAt: '2025-08-25T00:00:00Z',
      lastMessageAt: '2025-08-26T13:45:00Z',
      memberCount: 18
    },
    {
      _id: 'study-group',
      name: 'study-group',
      type: 'text',
      isPrivate: false,
      isLocked: false,
      createdBy: 'teacher2',
      createdAt: '2025-08-24T00:00:00Z',
      lastMessageAt: '2025-08-26T12:20:00Z',
      memberCount: 12
    },
    {
      _id: 'voice-chat',
      name: 'voice-chat',
      type: 'voice',
      isPrivate: false,
      isLocked: false,
      createdBy: 'admin',
      createdAt: '2025-08-23T00:00:00Z',
      lastMessageAt: '2025-08-26T11:15:00Z',
      memberCount: 8
    }
  ];

  const sampleMessages: Message[] = [
    {
      _id: '1',
      content: 'Welcome everyone to the Forex Navigators community! 🚀',
      author: {
        _id: 'admin1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        role: 'admin',
        isOnline: true
      },
      channelId: 'general',
      timestamp: '2025-08-26T10:00:00Z'
    },
    {
      _id: '2',
      content: 'Hi everyone! I\'m new to forex trading. Any tips for beginners?',
      author: {
        _id: 'student1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'student',
        isOnline: true
      },
      channelId: 'general',
      timestamp: '2025-08-26T10:05:00Z'
    },
    {
      _id: '3',
      content: 'Welcome John! I\'d recommend starting with the basics - understanding currency pairs and market structure.',
      author: {
        _id: 'teacher1',
        firstName: 'Sarah',
        lastName: 'Smith',
        email: 'sarah@example.com',
        role: 'teacher',
        isOnline: true
      },
      channelId: 'general',
      timestamp: '2025-08-26T10:08:00Z'
    },
    {
      _id: '4',
      content: 'Great advice Sarah! Also check out our beginner course in the courses section.',
      author: {
        _id: 'admin1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        role: 'admin',
        isOnline: true
      },
      channelId: 'general',
      timestamp: '2025-08-26T10:10:00Z'
    }
  ];

  const sampleUsers: User[] = [
    {
      _id: 'admin1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      role: 'admin',
      isOnline: true,
      status: 'online'
    },
    {
      _id: 'teacher1',
      firstName: 'Sarah',
      lastName: 'Smith',
      email: 'sarah@example.com',
      role: 'teacher',
      isOnline: true,
      status: 'online'
    },
    {
      _id: 'teacher2',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael@example.com',
      role: 'teacher',
      isOnline: true,
      status: 'idle'
    },
    {
      _id: 'student1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'student',
      isOnline: true,
      status: 'online'
    },
    {
      _id: 'student2',
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma@example.com',
      role: 'student',
      isOnline: false,
      status: 'offline'
    }
  ];

  useEffect(() => {
    setChannels(sampleChannels);
    setOnlineUsers(sampleUsers.filter(user => user.isOnline));
    setMessages(sampleMessages);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, directMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    if (isDirectMessageMode && selectedRecipient) {
      // Send direct message
      const newDirectMessage = {
        _id: Date.now().toString(),
        content: messageInput,
        author: 'current-user',
        recipient: selectedRecipient._id,
        timestamp: new Date().toISOString()
      };

      setDirectMessages(prev => [...prev, newDirectMessage]);
      setMessageInput('');
      createNotification({
        _id: Date.now().toString(),
        content: messageInput,
        author: {
          _id: 'current-user',
          firstName: 'Current',
          lastName: 'User',
          email: 'current@example.com',
          role: 'student',
          isOnline: true
        },
        channelId: 'dm',
        timestamp: new Date().toISOString()
      });
      showToast('Direct message sent!', 'success');
    } else {
      // Send channel message
      const newMessage: Message = {
        _id: Date.now().toString(),
        content: messageInput,
        author: {
          _id: 'current-user',
          firstName: 'Current',
          lastName: 'User',
          email: 'current@example.com',
          role: 'student',
          isOnline: true
        },
        channelId: selectedChannel,
        timestamp: new Date().toISOString()
      };

      setMessages([...messages, newMessage]);
      setMessageInput('');
      createNotification(newMessage);
      showToast('Message sent!', 'success');
    }
  };

  const startDirectMessage = (user: User) => {
    setSelectedRecipient(user);
    setIsDirectMessageMode(true);
    setShowDirectMessage(false);
    showToast(`Started DM with ${user.firstName} ${user.lastName}`, 'success');
  };

  const createNotification = (message: Message) => {
    const channelName = message.channelId === 'dm' ? 'Direct Message' : 
      channels.find(c => c._id === message.channelId)?.name || 'general';
    const authorName = `${message.author.firstName} ${message.author.lastName}`;
    
    const notification = {
      id: Date.now().toString(),
      message: message.content,
      channel: channelName,
      author: authorName,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setUnreadCount(0);
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  const getChannelIcon = (channel: Channel) => {
    if (channel.type === 'voice') return <Volume2 className="w-4 h-4" />;
    return <Hash className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'teacher': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const switchToChannel = (channelId: string) => {
    setSelectedChannel(channelId);
    setIsDirectMessageMode(false);
    setSelectedRecipient(null);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Server Sidebar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-4 border-r border-gray-800">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
          <span className="text-white font-bold text-lg">FN</span>
        </div>
        
        <div className="w-8 h-0.5 bg-gray-700 rounded-full"></div>
        
        <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors">
          <MessageSquare className="w-6 h-6 text-gray-300" />
        </div>
        
        <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors">
          <Users className="w-6 h-6 text-gray-300" />
        </div>
      </div>

      {/* Channel Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Server Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
          <h1 className="font-semibold text-white">Forex Navigators</h1>
          <button className="text-gray-400 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Categories */}
        <div className="flex-1 overflow-y-auto">
          {/* Direct Messages */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <span>Direct Messages</span>
              <button 
                onClick={() => setShowDirectMessage(true)}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {isDirectMessageMode && selectedRecipient && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded mb-1 bg-blue-600 text-white">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">{selectedRecipient.firstName} {selectedRecipient.lastName}</span>
              </div>
            )}
          </div>

          {/* Text Channels */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <span>Text Channels</span>
              <button 
                onClick={() => setShowCreateChannel(true)}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {channels.filter(c => c.type === 'text').map((channel) => (
              <div
                key={channel._id}
                onClick={() => switchToChannel(channel._id)}
                className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer mb-1 transition-colors ${
                  selectedChannel === channel._id && !isDirectMessageMode
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {getChannelIcon(channel)}
                <span className="text-sm">{channel.name}</span>
                {channel.isPrivate && <Lock className="w-3 h-3" />}
                {channel.isLocked && <Shield className="w-3 h-3" />}
              </div>
            ))}
          </div>

          {/* Voice Channels */}
          <div className="px-4 py-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Voice Channels
            </div>
            
            {channels.filter(c => c.type === 'voice').map((channel) => (
              <div
                key={channel._id}
                className="flex items-center space-x-2 px-2 py-1 rounded cursor-pointer mb-1 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {getChannelIcon(channel)}
                <span className="text-sm">{channel.name}</span>
                <span className="text-xs text-gray-500">({channel.memberCount})</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Info */}
        <div className="h-16 bg-gray-700 px-4 flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Current User</p>
            <p className="text-xs text-gray-300">Student</p>
          </div>
          <div className="flex space-x-1">
            <button className="text-gray-400 hover:text-white">
              <Mic className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <Headphones className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-700">
        {/* Channel Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-600">
          <div className="flex items-center space-x-2">
            {isDirectMessageMode ? (
              <>
                <MessageCircle className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white">
                  {selectedRecipient ? `${selectedRecipient.firstName} ${selectedRecipient.lastName}` : 'Select Recipient'}
                </h2>
                <span className="text-sm text-gray-400">Direct Message</span>
              </>
            ) : (
              <>
                <Hash className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-white capitalize">
                  {channels.find(c => c._id === selectedChannel)?.name || 'general'}
                </h2>
                <span className="text-sm text-gray-400">
                  {channels.find(c => c._id === selectedChannel)?.memberCount || 0} members
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-400 hover:text-white"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button className="text-gray-400 hover:text-white">
              <Shield className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <Search className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isDirectMessageMode ? (
            // Direct Messages
            directMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              directMessages.map((message, index) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 group hover:bg-gray-600 p-2 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">
                        {message.author === 'current-user' ? 'You' : 'Other User'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-gray-200">{message.content}</p>
                  </div>
                </motion.div>
              ))
            )
          ) : (
            // Channel Messages
            messages
              .filter(msg => msg.channelId === selectedChannel)
              .map((message, index) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 group hover:bg-gray-600 p-2 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(message.author.status || 'online')} rounded-full border-2 border-gray-700`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">
                        {message.author.firstName} {message.author.lastName}
                      </span>
                      {getRoleIcon(message.author.role)}
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-gray-200">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-sm text-blue-400">
                            {attachment.type === 'image' && <ImageIcon className="w-4 h-4" />}
                            {attachment.type === 'file' && <FileText className="w-4 h-4" />}
                            {attachment.type === 'video' && <Video className="w-4 h-4" />}
                            <span className="hover:underline cursor-pointer">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
          )}
          
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-400 italic">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>{typingUsers.join(', ')} is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-600">
          <div className="flex items-center space-x-3">
            <button className="text-gray-400 hover:text-white">
              <Paperclip className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-white">
              <Smile className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <input
                ref={messageInputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isDirectMessageMode 
                    ? selectedRecipient 
                      ? `Message ${selectedRecipient.firstName}...`
                      : 'Select a recipient to start DM...'
                    : `Message #${channels.find(c => c._id === selectedChannel)?.name || 'general'}`
                }
                className="w-full bg-gray-600 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isDirectMessageMode && !selectedRecipient}
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || (isDirectMessageMode && !selectedRecipient)}
              className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      <div className="w-60 bg-gray-800 flex flex-col">
        {/* Members Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="font-semibold text-white">Members</h3>
          <span className="text-sm text-gray-400">{onlineUsers.length} online</span>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sampleUsers.map((user) => (
            <div
              key={user._id}
              className="flex items-center space-x-3 px-2 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status || 'online')} rounded-full border-2 border-gray-800`}></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white truncate">
                    {user.firstName} {user.lastName}
                  </span>
                  {getRoleIcon(user.role)}
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {user.customStatus || user.role}
                </p>
              </div>
              
              <button
                onClick={() => startDirectMessage(user)}
                className="text-gray-400 hover:text-blue-400 transition-colors"
                title="Send direct message"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Message Modal */}
      {showDirectMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Start Direct Message</h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sampleUsers.map((user) => (
                <div
                  key={user._id}
                  onClick={() => startDirectMessage(user)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status || 'online')} rounded-full border-2 border-gray-800`}></div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-400">{user.role}</p>
                  </div>
                  
                  <button className="text-blue-400 hover:text-blue-300">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setShowDirectMessage(false)}
              className="w-full mt-6 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed top-16 right-4 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-700 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-gray-700/50' : ''
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium mb-1">
                          {notification.author}
                        </p>
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>#{notification.channel}</span>
                          <span>•</span>
                          <span>{formatNotificationTime(notification.timestamp)}</span>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Create Channel</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Channel Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., general"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Channel Type</label>
                <select className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="text">Text Channel</option>
                  <option value="voice">Voice Channel</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="private" className="rounded bg-gray-700 border-gray-600" />
                <label htmlFor="private" className="text-sm text-gray-300">Private Channel</label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateChannel(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {showUserProfile.firstName} {showUserProfile.lastName}
                </h3>
                <p className="text-sm text-gray-400">{showUserProfile.role}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 ${getStatusColor(showUserProfile.status || 'online')} rounded-full`}></div>
                <span className="text-sm text-gray-300 capitalize">
                  {showUserProfile.status || 'online'}
                </span>
              </div>
              
              {showUserProfile.customStatus && (
                <p className="text-sm text-gray-300">{showUserProfile.customStatus}</p>
              )}
            </div>
            
            <button
              onClick={() => setShowUserProfile(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
