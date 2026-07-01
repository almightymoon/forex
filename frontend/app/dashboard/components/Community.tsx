'use client';

import React, { useState, useEffect, useRef } from 'react';
import useChatSocket from '@/hooks/useChatSocket';
import { 
  Hash, 
  Send, 
  Lock,
  Crown,
  Shield,
  Trash2,
  MoreVertical,
  Edit,
  Check,
  X,
  ChevronLeft
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useLanguage } from '../../../context/LanguageContext';
import { canDeleteCommunityMessage, isCommunityModerator } from '@/utils/communityPermissions';

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
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
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
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
  const [useWebSocket, setUseWebSocket] = useState(true);
  /** Mobile: full-width channel list vs chat (desktop always shows both). */
  const [mobilePanel, setMobilePanel] = useState<'channels' | 'chat'>('channels');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isNarrowScreen = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  const selectChannel = (channelId: string) => {
    setActiveChannel(channelId);
    if (isNarrowScreen()) setMobilePanel('chat');
  };

  const backToChannels = () => {
    setMobilePanel('channels');
  };
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket event handler with better deduplication
  const handleWebSocketEvent = (event: any) => {
    console.log('Student WebSocket event:', event.type, event.data);
    
    switch (event.type) {
      case 'new':
        // Add new message if not already present and not from current user
        setMessages(prev => {
          const exists = prev.some(m => m._id === event.data._id);
          if (exists) {
            console.log('Message already exists, skipping:', event.data._id);
            return prev;
          }
          // Don't add if it's from current user (optimistic update already handled)
          if (event.data.author?._id === currentUser?.id) {
            console.log('Message from current user, skipping WebSocket update:', event.data._id);
            return prev;
          }
          console.log('Adding new message from WebSocket:', event.data._id);
          return sortMessages([...prev, event.data]);
        });
        break;
      case 'update':
        // Update existing message
        setMessages(prev => prev.map(m => 
          m._id === event.data._id ? event.data : m
        ));
        break;
      case 'delete':
        // Remove deleted message and add to deleted set
        setMessages(prev => prev.filter(m => m._id !== event.data));
        setDeletedMessageIds(prev => new Set([...prev, event.data]));
        console.log('Message deleted via WebSocket:', event.data);
        break;
      case 'channel:new':
        // Add new channel if not already present
        setChannels(prev => {
          const exists = prev.some(c => c._id === event.data._id);
          if (exists) return prev;
          return [...prev, event.data];
        });
        break;
      case 'channel:delete':
        // Remove deleted channel
        setChannels(prev => prev.filter(c => c._id !== event.data));
        if (activeChannel === event.data) {
          setActiveChannel('');
          setMobilePanel('channels');
        }
        break;
    }
  };

  // Initialize WebSocket
  useChatSocket({
    channelId: activeChannel,
    onEvent: handleWebSocketEvent,
    enabled: useWebSocket
  });

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

  // Sort messages by timestamp (oldest → newest)
  const sortMessages = (msgs: Message[]) => {
    return [...msgs].sort(
      (a, b) =>
        new Date(a.createdAt || a.timestamp || '').getTime() -
        new Date(b.createdAt || b.timestamp || '').getTime()
    );
  };

  // Smart scroll management
  const checkIfUserScrolledUp = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    setIsUserScrolledUp(!isAtBottom);
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    if (!timestamp) {
      return 'Just now';
    }
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(messageTime.getTime())) {
      return 'Just now';
    }
    
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months}mo`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years}y`;
    }
  };

  // Check if user can delete a message
  const canDeleteMessage = (message: Message) => {
    if (!currentUser || !message.author) return false;
    return canDeleteCommunityMessage(currentUser.id, currentUser.role, message.author._id);
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
  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/community/messages/${editingMessage}`, {
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
          showToast('Message edited successfully', 'success');
          // Update message in local state
          setMessages(prev => prev.map(msg => 
            msg._id === editingMessage 
              ? { ...msg, content: editContent.trim(), isEdited: true }
              : msg
          ));
          setEditingMessage(null);
          setEditContent('');
          
          // INSTANT refresh to sync with other users immediately (only if WebSocket disabled)
          if (!useWebSocket) {
            setTimeout(() => fetchMessages(activeChannel, false), 100);
          }
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to edit message', 'error');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      showToast('Failed to edit message', 'error');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
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
  const fetchMessages = async (channelId: string, isInitialLoad = false) => {
    if (!channelId) return;

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

      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      if (!data.success) throw new Error("Failed to fetch messages");

      const serverMessages: Message[] = data.messages || [];

      if (isInitialLoad) {
        // For initial load, set messages directly but filter out deleted ones
        const filteredMessages = serverMessages.filter(m => !deletedMessageIds.has(m._id));
        setMessages(sortMessages(filteredMessages));
        if (serverMessages.length > 0) {
          setLastMessageId(serverMessages[serverMessages.length - 1]._id);
        }
      } else {
        // For auto-refresh, merge server messages with optimistic messages
        setMessages(prevMessages => {
          if (!serverMessages.length) return prevMessages;

          // separate optimistic vs confirmed
          const optimistic = prevMessages.filter(m => m._id.startsWith("temp-"));
          const confirmed = prevMessages.filter(m => !m._id.startsWith("temp-"));

          // find new server messages not already in confirmed and not deleted
          const newServerMessages = serverMessages.filter(
            m => !confirmed.some(pm => pm._id === m._id) && !deletedMessageIds.has(m._id)
          );

          // replace optimistic if server version exists
          const stillOptimistic = optimistic.filter(
            om =>
              !serverMessages.some(
                sm =>
                  sm.content === om.content &&
                  sm.channelId === om.channelId &&
                  sm.author?._id === om.author?._id
              )
          );

          // merge and sort, but exclude deleted messages
          const allMessages = [...confirmed, ...newServerMessages, ...stillOptimistic];
          const filteredMessages = allMessages.filter(m => !deletedMessageIds.has(m._id));
          return sortMessages(filteredMessages);
        });

        // update last message id
        const lastServerMessage = serverMessages[serverMessages.length - 1];
        if (lastServerMessage?._id) {
          setLastMessageId(lastServerMessage._id);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      showToast('Failed to fetch messages', 'error');
    }
  };

  // Send message to channel
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || sendingMessage) return;

    setSendingMessage(true);
    setIsSendingMessage(true);

    const optimisticMessage: Message = {
      _id: `temp-${Date.now()}`,
      content: messageInput.trim(),
      author: {
        _id: currentUser?.id || 'temp',
        firstName: 'You',
        lastName: '',
        role: currentUser?.role || 'user',
      },
      createdAt: new Date(Date.now() + 1000).toISOString(), // ensures it sorts to bottom
      timestamp: new Date().toISOString(),
      channelId: activeChannel,
      isEdited: false,
      isPinned: false,
    };

    // add optimistic immediately and sort
    setMessages(prev => sortMessages([...prev, optimisticMessage]));
    setMessageInput('');

    // ensure scroll to bottom
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

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
          // Replace optimistic message with real message and sort
          setMessages(prev =>
            sortMessages([
              ...prev.filter(msg => msg._id !== optimisticMessage._id),
              data.message,
            ])
          );
          setLastMessageId(data.message._id);
          
          // INSTANT refresh to sync with other users immediately (only if WebSocket disabled)
          if (!useWebSocket) {
            setTimeout(() => fetchMessages(activeChannel, false), 100);
          }
          
          // Refresh channels to update last message
          await fetchChannels();
        }
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        showToast('Failed to send message', 'error');
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
      // Wait longer before allowing auto-refresh to prevent conflicts
      setTimeout(() => setIsSendingMessage(false), 10000); // 10 seconds
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    // Prevent duplicate delete requests
    if (deletingMessageIds.has(messageId)) return;
    
    // Optimistically remove the message from UI immediately
    const originalMessages = messages;
    setMessages(prev => prev.filter(m => m._id !== messageId));
    setDeletedMessageIds(prev => new Set([...prev, messageId]));
    setDeletingMessageIds(prev => new Set([...prev, messageId]));
    setShowMessageMenu(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Restore message if no token
        setMessages(originalMessages);
        setDeletedMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        setDeletingMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        return;
      }
      
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
          // Message is already removed from UI and marked as deleted
          // The deletedMessageIds will prevent it from reappearing during polling
          
          // INSTANT refresh to sync with other users immediately (only if WebSocket disabled)
          if (!useWebSocket) {
            setTimeout(() => fetchMessages(activeChannel, false), 100);
          }
          
          await fetchChannels();
        } else {
          // Restore message if deletion failed
          setMessages(originalMessages);
          setDeletedMessageIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });
          showToast('Failed to delete message', 'error');
        }
      } else {
        // If message not found (404), it's already deleted - treat as success
        if (response.status === 404) {
          showToast('Message deleted successfully', 'success');
          // Message is already removed from UI and marked as deleted
          setDeletingMessageIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });
          await fetchChannels();
          return;
        }
        
        const errorData = await response.json();
        // Restore message on other failures
        setMessages(originalMessages);
        setDeletedMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        setDeletingMessageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        showToast(errorData.message || 'Failed to delete message', 'error');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      // Restore message on error
      setMessages(originalMessages);
      setDeletedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      setDeletingMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      showToast('Failed to delete message', 'error');
    }
  };

  // Load messages when channel changes
  useEffect(() => {
    if (activeChannel) {
      // Clear deleted messages and deleting state when switching channels
      setDeletedMessageIds(new Set());
      setDeletingMessageIds(new Set());
      fetchMessages(activeChannel, true);
    }
  }, [activeChannel]);

  // Auto-refresh messages INSTANTLY like Discord (fallback when WebSocket disabled)
  useEffect(() => {
    if (!activeChannel || useWebSocket) return;

    const interval = setInterval(() => {
      // Only refresh if we're not sending a message
      if (!isSendingMessage) {
        fetchMessages(activeChannel, false);
      }
    }, 500); // Ultra-fast polling for instant updates

    return () => clearInterval(interval);
  }, [activeChannel, isSendingMessage, useWebSocket]);

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isUserScrolledUp]);

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

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop === messagesContainer.clientHeight;
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
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
      <div className="flex h-[min(70dvh,calc(100vh-12rem))] min-h-[320px] items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 md:h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[min(70dvh,calc(100vh-12rem))] min-h-[320px] flex-col overflow-hidden rounded-lg bg-gray-50 shadow-lg dark:bg-gray-800 md:h-[calc(100vh-200px)] md:flex-row">
      {/* Left Sidebar - Channels (full width on mobile; split on md+) */}
      <div
        className={`flex min-h-0 w-full min-w-0 flex-col border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:w-80 md:shrink-0 md:border-r ${
          mobilePanel === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Trading Community</h2>
            {/* Students cannot create channels - removed add button */}
          </div>
          <p className="text-blue-100 text-sm mt-1">Connect • Learn • Grow</p>
        </div>

        {/* Join Telegram - Navigators Fighters */}
        <a
          href="https://t.me/+p7P6zC16xJk3ZmJk"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-[#0088cc]/30 bg-[#0088cc]/10 p-3 text-[#0088cc] dark:border-[#54a9eb]/30 dark:bg-[#0088cc]/20 dark:text-[#54a9eb] hover:bg-[#0088cc]/20 dark:hover:bg-[#0088cc]/30 transition-colors"
        >
          <svg className="h-8 w-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Navigators Fighters</p>
            <p className="text-xs opacity-90">Join us on Telegram →</p>
          </div>
        </a>

        {/* Join WhatsApp - Forex Navigators Channel */}
        <a
          href="https://chat.whatsapp.com/HGYm1azZa9k8KeEZdGDQQS"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 p-3 text-[#25D366] dark:border-[#34e077]/30 dark:bg-[#25D366]/20 dark:text-[#34e077] hover:bg-[#25D366]/20 dark:hover:bg-[#25D366]/30 transition-colors"
        >
          <svg className="h-8 w-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Forex Navigators</p>
            <p className="text-xs opacity-90">Join us on WhatsApp →</p>
          </div>
        </a>
        
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Channels ({channels.length})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">WebSocket</span>
              <button
                type="button"
                onClick={() => setUseWebSocket(!useWebSocket)}
                className={`h-4 w-8 rounded-full transition-colors ${
                  useWebSocket ? 'bg-green-500' : 'bg-gray-400'
                }`}
                aria-pressed={useWebSocket}
                aria-label="Toggle WebSocket"
              >
                <div
                  className={`h-3 w-3 rounded-full bg-white transition-transform ${
                    useWebSocket ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel._id}
                type="button"
                onClick={() => selectChannel(channel._id)}
                className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors ${
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
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-gray-800 ${
          mobilePanel === 'channels' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Channel Header */}
        <div className="flex shrink-0 items-start gap-2 border-b border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-4">
          <button
            type="button"
            onClick={backToChannels}
            className="mt-0.5 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 md:hidden"
            aria-label="Back to channels"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {channels.find(c => c._id === activeChannel)?.name
                ? `#${channels.find(c => c._id === activeChannel)?.name}`
                : 'Select a channel'}
            </h3>
            {channels.find(c => c._id === activeChannel)?.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {channels.find(c => c._id === activeChannel)?.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
          onScroll={checkIfUserScrolledUp}
        >
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
            <div className="flex flex-col space-y-4">
              {messages.map((message) => {
                return (
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
                        {formatRelativeTime(message.timestamp || message.createdAt)}
                      </span>
                      {message.author?.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {message.author?.role === 'teacher' && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    {/* Message Content */}
                    {editingMessage === message._id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelEdit();
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          rows={2}
                          autoFocus
                          placeholder="Edit your message..."
                        />
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Press Enter to save, Escape to cancel
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                            >
                              <Check className="w-4 h-4" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
                            >
                              <X className="w-4 h-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
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
                              <Edit className="w-4 h-4" />
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
                );
              })}
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
