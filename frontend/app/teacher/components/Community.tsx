'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, 
  Plus, 
  Send, 
  Lock,
  Crown,
  Shield,
  X,
  Trash2,
  MoreVertical,
  Edit,
  Check,
} from 'lucide-react';
import { showToast } from '@/utils/toast';

interface Channel { /* ... same as before ... */ _id: string; name: string; description: string; memberCount: number; isPrivate: boolean; isLocked: boolean; createdBy: { _id: string; firstName: string; lastName: string }; createdAt: string; lastMessage?: { content: string; timestamp: string; author: { _id: string; firstName: string; lastName: string } }; }
interface Message { /* ... same as before ... */ _id: string; content: string; author: { _id: string; firstName: string; lastName: string; role: string }; timestamp?: string; createdAt?: string; updatedAt?: string; channelId: string; isEdited?: boolean; isPinned?: boolean; }
interface CommunityProps { students: any[]; courses: any[]; }

export default function Community({ students, courses }: CommunityProps) {
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [showChannelCreator, setShowChannelCreator] = useState(false);
  const [messageInput, setMessageInput] = useState('');
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
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // --- helpers ---
  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.userId, role: payload.role };
    } catch (e) {
      console.error('Error decoding token', e);
      return null;
    }
  };

  const toTime = (m?: Message) => new Date(m?.createdAt || m?.timestamp || 0).getTime();

  // sort ascending (oldest -> newest)
  const sortMessagesAsc = (arr: Message[]) =>
    [...arr].sort((a, b) => toTime(a) - toTime(b));

  // Sort messages by timestamp (oldest → newest)
  const sortMessages = (msgs: Message[]) => {
    return [...msgs].sort(
      (a, b) =>
        new Date(a.createdAt || a.timestamp || '').getTime() -
        new Date(b.createdAt || b.timestamp || '').getTime()
    );
  };

  // small heuristic to dedupe optimistic vs server messages:
  const isSameMessage = (a: Message, b: Message) => {
    if (!a || !b) return false;
    if (a.author._id !== b.author._id) return false;
    if (a.content !== b.content) return false;
    const ta = toTime(a);
    const tb = toTime(b);
    // if both have timestamps, check within 5s
    if (ta && tb) return Math.abs(ta - tb) < 5000;
    // otherwise fallback to content+author
      return true;
  };

  const formatRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const messageTime = new Date(timestamp).getTime();
    if (isNaN(messageTime)) return 'Just now';
    const diff = Math.floor((now - messageTime) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
    return `${Math.floor(diff / 31536000)}y`;
  };

  // --- fetch channels/messages ---
  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/community/channels', {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
        if (data.success) {
          setChannels(data.channels);
        if (!activeChannel && data.channels.length > 0) setActiveChannel(data.channels[0]._id);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to fetch channels', 'error');
    }
  };

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
        // For initial load, set messages directly
        setMessages(sortMessages(serverMessages));
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

          // find new server messages not already in confirmed
          const newServerMessages = serverMessages.filter(
            m => !confirmed.some(pm => pm._id === m._id)
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

          // merge and sort
          return sortMessages([...confirmed, ...newServerMessages, ...stillOptimistic]);
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

  // --- send message (optimistic) ---
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || sendingMessage) return;

    // support commands quickly
    if (messageInput.startsWith('/')) {
      const cmd = messageInput.toLowerCase().trim();
      if (cmd === '/help') {
        showToast('Available commands: /clear, /help', 'info');
        setMessageInput('');
        return;
      }
      if (cmd === '/clear') {
        // permission check
        if (currentUser?.role === 'admin' || currentUser?.role === 'teacher') {
          await handlePurgeChannel(activeChannel);
          setMessageInput('');
          return;
        }
        showToast('Only teachers and admins can use this command', 'error');
        setMessageInput('');
        return;
      }
    }

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
      const res = await fetch(`/api/community/channels/${activeChannel}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimisticMessage.content }),
      });

      if (!res.ok) {
        // remove optimistic
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        showToast('Failed to send message', 'error');
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
        showToast(data.message || 'Failed to send message', 'error');
        return;
      }

      // Replace optimistic message with real message and sort
      setMessages(prev =>
        sortMessages([
          ...prev.filter(msg => msg._id !== optimisticMessage._id),
          data.message,
        ])
      );

      // Update channels last message
      await fetchChannels();
    } catch (e) {
      console.error(e);
      // remove optimistic on error
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      showToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
      // delay re-polling conflicts
      setTimeout(() => setIsSendingMessage(false), 10000);
    }
  };

  // --- other operations (edit/delete/create/purge) ---
  const handlePurgeChannel = async (channelId: string) => {
    if (!channelId) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/channels/${channelId}/purge`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || 'Failed to clear channel', 'error');
        return;
      }
      const data = await res.json();
        if (data.success) {
        showToast('Channel messages cleared', 'success');
          setMessages([]);
          await fetchChannels();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to clear channel messages', 'error');
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessage(message._id);
    setEditContent(message.content);
    setShowMessageMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/messages/${editingMessage}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || 'Failed to edit', 'error');
        return;
      }
      const data = await res.json();
      if (data.success) {
        showToast('Message edited', 'success');
        setMessages(prev => prev.map(m => (m._id === editingMessage ? { ...m, content: editContent.trim(), isEdited: true } : m)));
        setEditingMessage(null);
        setEditContent('');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to edit message', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/messages/${messageId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || 'Failed to delete', 'error');
        return;
      }
      const data = await res.json();
        if (data.success) {
        showToast('Message deleted', 'success');
        setMessages(prev => prev.filter(m => m._id !== messageId));
          await fetchChannels();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to delete message', 'error');
    } finally {
      setShowMessageMenu(null);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/community/channels', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName.trim(), description: newChannelDescription.trim(), isPrivate: isPrivateChannel }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || 'Failed to create channel', 'error');
        return;
      }
      const data = await res.json();
        if (data.success) {
        showToast('Channel created', 'success');
          setNewChannelName('');
          setNewChannelDescription('');
          setIsPrivateChannel(false);
          setShowChannelCreator(false);
          await fetchChannels();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to create channel', 'error');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) return;
    
    setDeletingChannel(channelId);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`/api/community/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        await fetchChannels();
        if (activeChannel === channelId) {
          setActiveChannel('');
          setMessages([]);
        }
        showToast('Channel deleted successfully!', 'success');
      } else {
        const error = await res.json();
        showToast(error.message || 'Failed to delete channel', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to delete channel', 'error');
    } finally {
      setDeletingChannel(null);
    }
  };

  // --- lifecycle ---
  useEffect(() => {
    // Set client flag to prevent hydration mismatch
    setIsClient(true);
    
    const load = async () => {
      setLoading(true);
      setCurrentUser(getCurrentUser());
      await fetchChannels();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    fetchMessages(activeChannel, true);
  }, [activeChannel]);

  // poll for messages (server is authoritative)
  useEffect(() => {
    if (!activeChannel) return;
    const id = setInterval(() => {
      if (!isSendingMessage) fetchMessages(activeChannel, false);
    }, 5000);
    return () => clearInterval(id);
  }, [activeChannel, isSendingMessage]);

  // user scrolled up detection
  const checkIfUserScrolledUp = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const isAtBottom = c.scrollHeight - c.scrollTop <= c.clientHeight + 100;
    setIsUserScrolledUp(!isAtBottom);
  };

  // scroll to bottom when new messages arrive (only if the user isn't scrolled up)
  useEffect(() => {
    if (!isUserScrolledUp) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isUserScrolledUp]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading community...</p>
        </div>
      </div>
    );
  }

  // --- render ---
  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Trading Community</h2>
            <button onClick={() => setShowChannelCreator(true)} className="p-2 hover:bg-white/20 rounded-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">Connect • Learn • Grow</p>
        </div>
        
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Channels ({channels.length})</h3>
          <div className="space-y-1">
            {channels.map(c => (
              <div
                key={c._id}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                  activeChannel === c._id ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <button
                  onClick={() => setActiveChannel(c._id)}
                  className="flex items-center space-x-3 flex-1 min-w-0 text-left"
                >
                  {c.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">#{c.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.description}</p>
                  </div>
                  <span className="text-xs text-gray-400">{c.memberCount}</span>
                </button>
                <button
                  onClick={() => handleDeleteChannel(c._id)}
                  disabled={deletingChannel === c._id}
                  className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700 disabled:opacity-50"
                  title="Delete channel"
                >
                  {deletingChannel === c._id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {channels.find(x => x._id === activeChannel)?.name ? `#${channels.find(x => x._id === activeChannel)?.name}` : 'Select a channel'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{channels.find(x => x._id === activeChannel)?.description}</p>
        </div>
        
        <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto" onScroll={checkIfUserScrolledUp}>
          {!activeChannel ? (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Select a Channel</h3>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No messages yet</h3>
              <p className="text-gray-500">Be the first to start the conversation!</p>
            </div>
          ) : (
            // Important: normal column order (oldest at top, newest at bottom)
            <div className="flex flex-col space-y-4">
              {messages.map(m => (
                <div key={m._id} className="flex space-x-3 group relative">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {m.author.firstName?.charAt(0) ?? '?'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">{m.author.firstName} {m.author.lastName}</span>
                      <span className="text-xs text-gray-500">{formatRelativeTime(m.timestamp || m.createdAt)}</span>
                      {m.isEdited && <span className="text-xs text-gray-400 italic">(edited)</span>}
                      {m.author.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                      {m.author.role === 'teacher' && <Shield className="w-4 h-4 text-blue-500" />}
                    </div>

                    {editingMessage === m._id ? (
                      <div className="mt-2 space-y-2">
                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg bg-white" />
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={handleSaveEdit} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                          <button onClick={() => { setEditingMessage(null); setEditContent(''); }} className="px-3 py-1 bg-gray-500 text-white rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 mt-1">{m.content}</p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    { /* permissions check inline */}
                    { (currentUser?.role === 'admin' || currentUser?.role === 'teacher' || m.author._id === currentUser?.id) && (
                    <div className="relative">
                        <button onClick={() => setShowMessageMenu(showMessageMenu === m._id ? null : m._id)} className="p-1 rounded hover:bg-gray-100">
                          <MoreVertical className="w-4 h-4" />
                      </button>
                      
                        {showMessageMenu === m._id && (
                          <div className="absolute right-0 top-8 bg-white border rounded shadow z-10 min-w-[120px]">
                            { (currentUser?.role === 'admin' || currentUser?.role === 'teacher' || m.author._id === currentUser?.id) && (
                              <button onClick={() => startEditMessage(m)} className="w-full px-3 py-2 text-left hover:bg-gray-50">Edit</button>
                            )}
                            <button onClick={() => handleDeleteMessage(m._id)} className="w-full px-3 py-2 text-left hover:bg-gray-50 text-red-600">Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* input */}
        {activeChannel && (
          <div className="p-4 border-t">
            <div className="flex space-x-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border rounded-lg"
                disabled={sendingMessage}
              />
              <button onClick={handleSendMessage} disabled={!messageInput.trim() || sendingMessage} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                {sendingMessage ? <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Channel modal */}
      <AnimatePresence>
        {showChannelCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-lg p-6 w-96">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Channel</h3>
                <button onClick={() => setShowChannelCreator(false)}><X /></button>
              </div>
              <div className="space-y-4">
                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="Channel name" />
                <textarea value={newChannelDescription} onChange={e => setNewChannelDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded" placeholder="Description" />
                <div className="flex items-center justify-end space-x-2">
                  <button onClick={() => setShowChannelCreator(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={handleCreateChannel} disabled={!newChannelName.trim() || creatingChannel} className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
