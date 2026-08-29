'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import useChatSocket from '@/hooks/useChatSocket';
import {
  Hash,
  Send,
  Lock,
  Crown,
  Shield,
  X,
  Trash2,
  MessageSquare,
  Users,
  Radio,
  RefreshCw,
  Sparkles,
  User,
  Eraser,
  Pin,
  Reply,
  Search,
  Smile,
  Paperclip,
  Copy,
  AtSign,
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { isCommunityModerator } from '@/utils/communityPermissions';
import AdminRowActionsMenu from '../../admin/components/AdminRowActionsMenu';
import {
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminPanel,
  AdminSearchField,
  AdminStatCard,
  AdminStatGrid,
} from '../../admin/components/AdminUI';
import {
  QUICK_EMOJIS,
  getMentionQuery,
  insertMention,
  readLastReadMap,
  renderMessageContent,
  userReacted,
  writeLastRead,
  type MessageReaction,
} from '../../teacher/components/communityUtils';

interface ChannelMember {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  profileImage?: string;
  avatar?: string;
}

interface Channel {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  isLocked: boolean;
  createdBy: { _id: string; firstName: string; lastName: string };
  createdAt: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    author: { _id: string; firstName: string; lastName: string };
  };
}

interface MessageAttachment {
  url: string;
  originalName?: string;
  mimeType?: string;
}

interface ParentMessage {
  _id: string;
  content: string;
  author: { _id: string; firstName: string; lastName: string; role?: string };
}

interface Message {
  _id: string;
  content: string;
  author: { _id: string; firstName: string; lastName: string; role: string };
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
  channelId: string;
  isEdited?: boolean;
  isPinned?: boolean;
  reactions?: MessageReaction[];
  parentMessage?: ParentMessage;
  attachments?: MessageAttachment[];
}
export default function StudentCommunity() {
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState<number>(0);
  const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
  const [useWebSocket] = useState(true);
  const [channelSearch, setChannelSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [composerCursor, setComposerCursor] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // WebSocket event handler with better deduplication
  const handleWebSocketEvent = (event: any) => {
    console.log('Teacher WebSocket event:', event.type, event.data);
    
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
          bumpUnread(event.data.channelId);
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

  const filteredChannels = useMemo(() => {
    const q = channelSearch.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [channels, channelSearch]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return channelMembers;
    return channelMembers.filter((s) => {
      const name = `${s.firstName || ''} ${s.lastName || ''} ${s.name || ''} ${s.email || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [channelMembers, memberSearch]);

  const activeChannelData = useMemo(
    () => channels.find((c) => c._id === activeChannel),
    [channels, activeChannel]
  );

  const totalMemberCount = useMemo(
    () => Math.max(channelMembers.length, activeChannelData?.memberCount || 0),
    [channelMembers.length, activeChannelData?.memberCount]
  );

  const messageGroups = useMemo(() => {
    const groups: { author: Message['author']; messages: Message[] }[] = [];
    for (const message of messages) {
      const last = groups[groups.length - 1];
      if (last && last.author._id === message.author._id) {
        last.messages.push(message);
      } else {
        groups.push({ author: message.author, messages: [message] });
      }
    }
    return groups;
  }, [messages]);

  const getMemberName = (member: ChannelMember) => {
    if (member.firstName && member.lastName) return `${member.firstName} ${member.lastName}`;
    return member.name || member.email || 'Member';
  };

  const getMemberInitials = (member: ChannelMember) => {
    const first = member.firstName || member.name?.split(' ')[0] || member.email || '?';
    const last = member.lastName || member.name?.split(' ')[1] || '';
    if (last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return first.charAt(0).toUpperCase();
  };

  const roleBadge = (role?: string) => {
    if (role === 'admin') return { label: 'Admin', tone: 'amber' as const, icon: Crown };
    if (role === 'teacher') return { label: 'Teacher', tone: 'sky' as const, icon: Shield };
    return { label: 'Student', tone: 'emerald' as const, icon: User };
  };

  const mentionSuggestions = useMemo(() => {
    const query = getMentionQuery(messageInput, composerCursor);
    if (query === null) return [];
    return channelMembers
      .filter((s) => {
        const first = (s.firstName || '').toLowerCase();
        const last = (s.lastName || '').toLowerCase();
        const email = (s.email || '').split('@')[0].toLowerCase();
        return first.startsWith(query) || last.startsWith(query) || email.startsWith(query);
      })
      .slice(0, 6);
  }, [messageInput, composerCursor, channelMembers]);

  const markChannelRead = (channelId: string) => {
    if (!channelId) return;
    writeLastRead(channelId, new Date().toISOString());
    setUnreadByChannel((prev) => ({ ...prev, [channelId]: 0 }));
  };

  const bumpUnread = (channelId: string) => {
    if (!channelId || channelId === activeChannel) return;
    setUnreadByChannel((prev) => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
  };

  const fetchPinnedMessages = async (channelId: string) => {
    if (!channelId) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/channels/${channelId}/pinned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setPinnedMessages(data.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        showToast('Failed to update reaction', 'error');
        return;
      }
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? data.message : m)));
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to update reaction', 'error');
    } finally {
      setReactionPickerId(null);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.message || 'Failed to pin message', 'error');
        return;
      }
      const data = await res.json();
      if (data.success) {
        showToast(data.message.isPinned ? 'Message pinned' : 'Message unpinned', 'success');
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, isPinned: data.message.isPinned } : m))
        );
        if (activeChannel) await fetchPinnedMessages(activeChannel);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to pin message', 'error');
    }
  };

  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const params = new URLSearchParams({ q: searchQuery.trim() });
      if (activeChannel) params.set('channelId', activeChannel);
      const res = await fetch(`/api/community/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        showToast('Search failed', 'error');
        return;
      }
      const data = await res.json();
      setSearchResults(data.messages || []);
    } catch (e) {
      console.error(e);
      showToast('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Could not copy', 'error');
    }
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are supported', 'error');
      return;
    }
    setPendingImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearPendingImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setPendingImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyMention = (member: ChannelMember) => {
    const handle = member.firstName || (member.email || 'user').split('@')[0];
    const { value, cursor } = insertMention(messageInput, composerCursor, handle);
    setMessageInput(value);
    setComposerCursor(cursor);
    composerRef.current?.focus();
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
        const lastRead = readLastReadMap();
        setUnreadByChannel((prev) => {
          const next = { ...prev };
          data.channels.forEach((c: Channel) => {
            const ts = c.lastMessage?.timestamp;
            if (ts && lastRead[c._id] && new Date(ts) > new Date(lastRead[c._id])) {
              next[c._id] = (next[c._id] || 0) + 1;
            }
          });
          return next;
        });
        if (!activeChannel && data.channels.length > 0) setActiveChannel(data.channels[0]._id);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to fetch channels', 'error');
    }
  };

  const fetchChannelMembers = async (channelId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/community/channels/${channelId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.channel?.members) {
        const members: ChannelMember[] = data.channel.members
          .map((m: { userId?: ChannelMember & { _id: string } }) => {
            const user = m.userId;
            if (!user?._id) return null;
            return {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
            };
          })
          .filter(Boolean) as ChannelMember[];
        setChannelMembers(members);
      }
    } catch (e) {
      console.error(e);
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
        setLastMessageCount(serverMessages.length);
        setHasNewMessages(false);
        if (serverMessages.length > 0) {
          setLastMessageId(serverMessages[serverMessages.length - 1]._id);
        }
      } else {
        // Check for new messages
        const newMessageCount = serverMessages.length;
        if (newMessageCount > lastMessageCount) {
          setHasNewMessages(true);
        }
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

        // update last message id and count
        const lastServerMessage = serverMessages[serverMessages.length - 1];
        if (lastServerMessage?._id) {
          setLastMessageId(lastServerMessage._id);
        }
        setLastMessageCount(newMessageCount);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      showToast('Failed to fetch messages', 'error');
    }
  };

  // --- send message (optimistic) ---
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !pendingImage && !imagePreview) || !activeChannel || sendingMessage) return;

    // support commands quickly
    if (messageInput.startsWith('/') && !pendingImage) {
      const cmd = messageInput.toLowerCase().trim();
      if (cmd === '/help') {
        showToast('Commands: /clear, /search <query>, /pin (reply to a message first)', 'info');
        setMessageInput('');
        return;
      }
      if (cmd === '/clear') {
        if (isCommunityModerator(currentUser?.role)) {
          await handlePurgeChannel(activeChannel);
          setMessageInput('');
          return;
        }
        showToast('Only moderators can use this command', 'error');
        setMessageInput('');
        return;
      }
      if (cmd.startsWith('/search ')) {
        const q = messageInput.slice(8).trim();
        setSearchQuery(q);
        setShowSearchPanel(true);
        setMessageInput('');
        void (async () => {
          setSearchLoading(true);
          try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const params = new URLSearchParams({ q });
            if (activeChannel) params.set('channelId', activeChannel);
            const res = await fetch(`/api/community/search?${params}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setSearchResults(data.messages || []);
            }
          } finally {
            setSearchLoading(false);
          }
        })();
        return;
      }
      if (cmd === '/pin' && replyingTo) {
        await handlePinMessage(replyingTo._id);
        setMessageInput('');
        setReplyingTo(null);
        return;
      }
    }

    setSendingMessage(true);
    setIsSendingMessage(true);

    const content = messageInput.trim();
    const parentMessageId = replyingTo?._id;
    const imageFile = pendingImage;
    const previewUrl = imagePreview;

    const optimisticMessage: Message = {
      _id: `temp-${Date.now()}`,
      content: content || (pendingImage ? '📷' : ''),
      author: {
        _id: currentUser?.id || 'temp',
        firstName: 'You',
        lastName: '',
        role: currentUser?.role || 'user',
      },
      createdAt: new Date(Date.now() + 1000).toISOString(),
      timestamp: new Date().toISOString(),
      channelId: activeChannel,
      isEdited: false,
      isPinned: false,
      ...(replyingTo
        ? {
            parentMessage: {
              _id: replyingTo._id,
              content: replyingTo.content,
              author: replyingTo.author,
            },
          }
        : {}),
      ...(previewUrl ? { attachments: [{ url: previewUrl }] } : {}),
    };

    setMessages((prev) => sortMessages([...prev, optimisticMessage]));
    setMessageInput('');
    setReplyingTo(null);
    if (composerRef.current) composerRef.current.style.height = 'auto';
    clearPendingImage();

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let res: Response;
      if (imageFile) {
        const form = new FormData();
        if (content) form.append('content', content);
        if (parentMessageId) form.append('parentMessageId', parentMessageId);
        form.append('image', imageFile);
        res = await fetch(`/api/community/channels/${activeChannel}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
      } else {
        res = await fetch(`/api/community/channels/${activeChannel}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            ...(parentMessageId ? { parentMessageId } : {}),
          }),
        });
      }

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
        showToast('Failed to send message', 'error');
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
        showToast(data.message || 'Failed to send message', 'error');
        return;
      }

      setMessages((prev) =>
        sortMessages([...prev.filter((msg) => msg._id !== optimisticMessage._id), data.message])
      );

      if (!useWebSocket) {
        setTimeout(() => fetchMessages(activeChannel, false), 100);
      }

      await fetchChannels();
      markChannelRead(activeChannel);
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
      showToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
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
        
          // INSTANT refresh to sync with other users immediately (only if WebSocket disabled)
          if (!useWebSocket) {
            setTimeout(() => fetchMessages(activeChannel, false), 100);
          }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to edit message', 'error');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Prevent duplicate delete requests
    if (deletingMessageIds.has(messageId)) return;
    
    // Optimistically remove the message from UI immediately
    const originalMessages = messages;
    setMessages(prev => prev.filter(m => m._id !== messageId));
    setDeletedMessageIds(prev => new Set([...prev, messageId]));
    setDeletingMessageIds(prev => new Set([...prev, messageId]));
    
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
      
      const res = await fetch(`/api/community/messages/${messageId}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        // If message not found (404), it's already deleted - treat as success
        if (res.status === 404) {
          showToast('Message deleted', 'success');
          // Message is already removed from UI and marked as deleted
          setDeletingMessageIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            return newSet;
          });
          return;
        }
        
        const err = await res.json();
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
        showToast(err.message || 'Failed to delete', 'error');
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        showToast('Message deleted', 'success');
        // Message is already removed from UI and marked as deleted
        // The deletedMessageIds will prevent it from reappearing during polling
        
          // INSTANT refresh to sync with other users immediately (only if WebSocket disabled)
          if (!useWebSocket) {
            setTimeout(() => fetchMessages(activeChannel, false), 100);
          }
      } else {
        // Restore message if deletion failed
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
    } catch (e) {
      console.error(e);
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
    setDeletedMessageIds(new Set());
    setDeletingMessageIds(new Set());
    setReplyingTo(null);
    setReactionPickerId(null);
    fetchMessages(activeChannel, true);
    fetchPinnedMessages(activeChannel);
    fetchChannelMembers(activeChannel);
    markChannelRead(activeChannel);
  }, [activeChannel]);

  // poll for messages (server is authoritative) - Fallback when WebSocket is disabled
  useEffect(() => {
    if (!activeChannel || useWebSocket) return;
    const id = setInterval(() => {
      if (!isSendingMessage) fetchMessages(activeChannel, false);
    }, 500); // Ultra-fast polling for instant updates
    return () => clearInterval(id);
  }, [activeChannel, isSendingMessage, useWebSocket]);

  // user scrolled up detection
  const checkIfUserScrolledUp = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    const isAtBottom = c.scrollHeight - c.scrollTop <= c.clientHeight + 100;
    setIsUserScrolledUp(!isAtBottom);
  };

  // scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessages(false);
  };

  // scroll to bottom when new messages arrive (only if the user isn't scrolled up)
  useEffect(() => {
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setHasNewMessages(false);
    }
  }, [messages, isUserScrolledUp]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="student-community-loading">
        <div className="student-community-loading__spinner" />
        <p>Loading community workspace…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="student-community-loading">
        <div className="student-community-loading__spinner" />
        <p>Loading channels and messages…</p>
      </div>
    );
  }

  return (
    <div className="student-community">
      <div className="student-community__stats">
        <AdminStatGrid>
        <AdminStatCard label="Channels" value={channels.length} icon={Hash} tone="sky" />
        <AdminStatCard label="Channel members" value={totalMemberCount} icon={Users} tone="indigo" />
        <AdminStatCard
          label="Messages in view"
          value={messages.length}
          icon={MessageSquare}
          tone="violet"
          hint={activeChannelData ? `#${activeChannelData.name}` : undefined}
        />
        <AdminStatCard
          label="Real-time"
          value="Live"
          icon={Radio}
          tone="sky"
        />
        </AdminStatGrid>
      </div>

      <AdminPanel className="student-community__workspace">
        <div className="student-community__layout">
          {/* Channel sidebar */}
          <aside className="student-community__sidebar">
            <div className="student-community__sidebar-head">
              <div className="student-community__sidebar-head-mesh" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  <h2 className="text-base font-bold text-white">Trading Community</h2>
                </div>
                <p className="mt-0.5 text-xs text-sky-100/80">Connect · Learn · Grow</p>
              </div>
            </div>

            <div className="student-community__external-links">
              <a
                href="https://t.me/+p7P6zC16xJk3ZmJk"
                target="_blank"
                rel="noopener noreferrer"
                className="student-community__external-link student-community__external-link--telegram"
              >
                <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">Navigators Fighters</span>
                  <span className="block truncate text-xs opacity-80">Join on Telegram →</span>
                </span>
              </a>
              <a
                href="https://chat.whatsapp.com/HGYm1azZa9k8KeEZdGDQQS"
                target="_blank"
                rel="noopener noreferrer"
                className="student-community__external-link student-community__external-link--whatsapp"
              >
                <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">Forex Navigators</span>
                  <span className="block truncate text-xs opacity-80">Join on WhatsApp →</span>
                </span>
              </a>
            </div>

            <div className="student-community__sidebar-tools">
              <AdminSearchField
                value={channelSearch}
                onChange={setChannelSearch}
                placeholder="Search channels…"
              />
            </div>

            <div className="student-community__channel-list">
              <p className="student-community__section-label">Channels ({filteredChannels.length})</p>
              {filteredChannels.length === 0 ? (
                <div className="student-community__sidebar-empty">
                  <Hash className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">No channels yet</p>
                  <p className="mt-1 text-xs opacity-70">Check back soon for new discussion channels.</p>
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isActive = activeChannel === channel._id;
                  return (
                    <div
                      key={channel._id}
                      className={`student-community__channel ${isActive ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveChannel(channel._id)}
                        className="student-community__channel-btn"
                      >
                        <span className="student-community__channel-icon">
                          {channel.isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-semibold">#{channel.name}</span>
                          {channel.description ? (
                            <span className="block truncate text-xs opacity-70">{channel.description}</span>
                          ) : null}
                        </span>
                        <span className="text-xs tabular-nums opacity-60">{channel.memberCount}</span>
                        {(unreadByChannel[channel._id] || 0) > 0 && activeChannel !== channel._id ? (
                          <span className="student-community__unread">{unreadByChannel[channel._id]}</span>
                        ) : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chat main */}
          <section className="student-community__chat">
            <header className="student-community__chat-head">
              <div className="min-w-0">
                {activeChannelData ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-[var(--admin-text)]">
                        #{activeChannelData.name}
                      </h3>
                      {activeChannelData.isPrivate ? (
                        <AdminBadge tone="amber">
                          <Lock className="mr-1 inline h-3 w-3" />
                          Private
                        </AdminBadge>
                      ) : (
                        <AdminBadge tone="emerald">Public</AdminBadge>
                      )}
                      {useWebSocket ? (
                        <span className="student-community__pulse">
                          <Radio className="h-3 w-3" />
                          Live
                        </span>
                      ) : null}
                    </div>
                    {activeChannelData.description ? (
                      <p className="mt-0.5 truncate text-sm text-[var(--admin-muted)]">
                        {activeChannelData.description}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <h3 className="text-base font-bold text-[var(--admin-text)]">Select a channel</h3>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasNewMessages ? (
                  <AdminBadge tone="sky">New messages</AdminBadge>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowMembersPanel((v) => !v)}
                  className="student-community__icon-btn"
                  title={showMembersPanel ? 'Hide members' : 'Show members'}
                >
                  <Users className="h-4 w-4" />
                </button>
                {activeChannel && isCommunityModerator(currentUser?.role) ? (
                  <AdminRowActionsMenu
                    variant="icon"
                    align="right"
                    label="Channel tools"
                    items={[
                      {
                        id: 'purge',
                        label: 'Clear messages',
                        icon: Eraser,
                        tone: 'warning',
                        onClick: () => void handlePurgeChannel(activeChannel),
                      },
                    ]}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowSearchPanel((v) => !v)}
                  className="student-community__icon-btn"
                  title="Search messages"
                  disabled={!activeChannel}
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => activeChannel && fetchMessages(activeChannel, false)}
                  className="student-community__icon-btn"
                  title="Refresh messages"
                  disabled={!activeChannel}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </header>

            {showSearchPanel && activeChannel ? (
              <div className="student-community__search-bar">
                <AdminSearchField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search in channel…"
                />
                <AdminButton variant="primary" onClick={() => void handleSearchMessages()} disabled={searchLoading}>
                  {searchLoading ? 'Searching…' : 'Search'}
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setShowSearchPanel(false)}>
                  Close
                </AdminButton>
              </div>
            ) : null}

            {searchResults.length > 0 && showSearchPanel ? (
              <div className="student-community__search-results">
                {searchResults.map((result) => (
                  <button
                    key={result._id}
                    type="button"
                    className="student-community__search-hit"
                    onClick={() => {
                      const el = document.getElementById(`msg-${result._id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <span className="font-semibold">{result.author.firstName} {result.author.lastName}</span>
                    <span className="truncate text-sm text-[var(--admin-muted)]">{result.content}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {pinnedMessages.length > 0 && activeChannel ? (
              <div className="student-community__pinned">
                <Pin className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--admin-muted)]">Pinned</p>
                  <p className="truncate text-sm text-[var(--admin-text)]">
                    <strong>{pinnedMessages[0].author.firstName}:</strong> {pinnedMessages[0].content}
                  </p>
                </div>
                {pinnedMessages.length > 1 ? (
                  <AdminBadge tone="amber">{pinnedMessages.length}</AdminBadge>
                ) : null}
              </div>
            ) : null}

            <div
              ref={messagesContainerRef}
              className="student-community__messages"
              onScroll={checkIfUserScrolledUp}
            >
              {!activeChannel ? (
                <AdminEmptyState
                  icon={Hash}
                  title="Select a channel"
                  description="Pick a channel from the sidebar to join the conversation."
                />
              ) : messages.length === 0 ? (
                <AdminEmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Be the first to say hello in this channel."
                />
              ) : (
                <div className="student-community__message-stack">
                  {messageGroups.map((group) => {
                    const badge = roleBadge(group.author.role);
                    const RoleIcon = badge.icon;
                    const firstMessage = group.messages[0];
                    return (
                      <article key={firstMessage._id} className="student-community__message-group">
                        <div className="student-community__avatar">
                          {group.author.firstName?.charAt(0) ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="student-community__message-meta">
                            <span className="font-semibold text-[var(--admin-text)]">
                              {group.author.firstName} {group.author.lastName}
                            </span>
                            <AdminBadge tone={badge.tone}>
                              <RoleIcon className="mr-1 inline h-3 w-3" />
                              {badge.label}
                            </AdminBadge>
                            <span className="text-xs text-[var(--admin-muted)]">
                              {formatRelativeTime(firstMessage.timestamp || firstMessage.createdAt)}
                            </span>
                          </div>
                          <div className="student-community__bubbles">
                            {group.messages.map((message) => (
                              <div key={message._id} id={`msg-${message._id}`} className="student-community__bubble-wrap group">
                                {editingMessage === message._id ? (
                                  <div className="student-community__edit">
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      rows={3}
                                      className="student-community__edit-input"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <AdminButton variant="ghost" onClick={() => { setEditingMessage(null); setEditContent(''); }}>
                                        Cancel
                                      </AdminButton>
                                      <AdminButton variant="primary" onClick={() => void handleSaveEdit()}>Save</AdminButton>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="student-community__bubble">
                                      {message.parentMessage ? (
                                        <div className="student-community__reply-quote">
                                          <Reply className="h-3 w-3 shrink-0" />
                                          <span className="truncate">
                                            <strong>{message.parentMessage.author.firstName}</strong>{' '}
                                            {message.parentMessage.content}
                                          </span>
                                        </div>
                                      ) : null}
                                      {message.attachments?.map((att, idx) =>
                                        att.url ? (
                                          <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="student-community__attachment">
                                            <img src={att.url} alt={att.originalName || 'attachment'} />
                                          </a>
                                        ) : null
                                      )}
                                      {message.content ? (
                                        <p>{renderMessageContent(message.content)}</p>
                                      ) : null}
                                      {message.isEdited ? (
                                        <span className="student-community__edited">edited</span>
                                      ) : null}
                                      {message.isPinned ? (
                                        <span className="student-community__pinned-tag">
                                          <Pin className="h-3 w-3" /> pinned
                                        </span>
                                      ) : null}
                                    </div>
                                    {message.reactions && message.reactions.length > 0 ? (
                                      <div className="student-community__reactions">
                                        {message.reactions.map((reaction) => (
                                          <button
                                            key={reaction.emoji}
                                            type="button"
                                            className={`student-community__reaction ${userReacted(reaction, currentUser?.id) ? 'is-mine' : ''}`}
                                            onClick={() => void handleToggleReaction(message._id, reaction.emoji)}
                                          >
                                            <span>{reaction.emoji}</span>
                                            <span>{reaction.count}</span>
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                    <div className="student-community__msg-actions">
                                      <button
                                        type="button"
                                        className="student-community__react-btn"
                                        onClick={() => setReactionPickerId(reactionPickerId === message._id ? null : message._id)}
                                        title="Add reaction"
                                      >
                                        <Smile className="h-4 w-4" />
                                      </button>
                                      {reactionPickerId === message._id ? (
                                        <div className="student-community__emoji-picker">
                                          {QUICK_EMOJIS.map((emoji) => (
                                            <button
                                              key={emoji}
                                              type="button"
                                              onClick={() => void handleToggleReaction(message._id, emoji)}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                      <AdminRowActionsMenu
                                        variant="icon"
                                        align="right"
                                        className="student-community__msg-menu"
                                        label="Message actions"
                                        items={[
                                          {
                                            id: 'reply',
                                            label: 'Reply',
                                            icon: Reply,
                                            tone: 'info',
                                            onClick: () => {
                                              setReplyingTo(message);
                                              composerRef.current?.focus();
                                            },
                                          },
                                          {
                                            id: 'react',
                                            label: 'Add reaction',
                                            icon: Smile,
                                            tone: 'info',
                                            onClick: () => setReactionPickerId(message._id),
                                          },
                                          {
                                            id: 'copy',
                                            label: 'Copy text',
                                            icon: Copy,
                                            onClick: () => void handleCopyMessage(message.content),
                                          },
                                          {
                                            id: 'pin',
                                            label: message.isPinned ? 'Unpin message' : 'Pin message',
                                            icon: Pin,
                                            tone: 'warning',
                                            hidden: !isCommunityModerator(currentUser?.role),
                                            onClick: () => void handlePinMessage(message._id),
                                          },
                                          {
                                            id: 'edit',
                                            label: 'Edit message',
                                            tone: 'info',
                                            hidden: message.author._id !== currentUser?.id,
                                            onClick: () => startEditMessage(message),
                                          },
                                          {
                                            id: 'delete',
                                            label: 'Delete message',
                                            tone: 'danger',
                                            loading: deletingMessageIds.has(message._id),
                                            hidden: !(isCommunityModerator(currentUser?.role) || message.author._id === currentUser?.id),
                                            onClick: () => void handleDeleteMessage(message._id),
                                          },
                                        ]}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {hasNewMessages && isUserScrolledUp ? (
                <div className="student-community__new-banner">
                  <button type="button" onClick={scrollToBottom} className="student-community__new-btn">
                    New messages
                  </button>
                </div>
              ) : null}
            </div>

            {activeChannel ? (
              <footer className="student-community__composer">
                {replyingTo ? (
                  <div className="student-community__reply-bar">
                    <Reply className="h-4 w-4 shrink-0 text-sky-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--admin-muted)]">
                        Replying to {replyingTo.author.firstName}
                      </p>
                      <p className="truncate text-sm">{replyingTo.content}</p>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="student-community__icon-btn">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {imagePreview ? (
                  <div className="student-community__image-preview">
                    <img src={imagePreview} alt="Upload preview" />
                    <button type="button" onClick={clearPendingImage} className="student-community__icon-btn">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <div className="student-community__composer-box">
                  <div className="student-community__composer-toolbar" aria-label="Quick reactions">
                    {QUICK_EMOJIS.slice(0, 6).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="student-community__emoji-chip"
                        onClick={() => setMessageInput((v) => `${v}${emoji}`)}
                        title={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="student-community__composer-row">
                    <button
                      type="button"
                      className="student-community__composer-action"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach image"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                    />
                    <div className="student-community__composer-input-wrap">
                      <textarea
                        ref={composerRef}
                        value={messageInput}
                        rows={1}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          setComposerCursor(e.target.selectionStart || e.target.value.length);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                        }}
                        onClick={(e) =>
                          setComposerCursor((e.target as HTMLTextAreaElement).selectionStart || 0)
                        }
                        onKeyDown={(e) => {
                          if (mentionSuggestions.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setMentionIndex((i) => Math.min(i + 1, mentionSuggestions.length - 1));
                              return;
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setMentionIndex((i) => Math.max(i - 1, 0));
                              return;
                            }
                            if (e.key === 'Tab' || (e.key === 'Enter' && mentionSuggestions.length > 0)) {
                              e.preventDefault();
                              applyMention(mentionSuggestions[mentionIndex]);
                              return;
                            }
                          }
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder={`Message #${activeChannelData?.name || 'channel'}`}
                        className="student-community__composer-input"
                        disabled={sendingMessage}
                      />
                      {mentionSuggestions.length > 0 ? (
                        <div className="student-community__mention-menu">
                          {mentionSuggestions.map((member, idx) => (
                            <button
                              key={member._id || member.email}
                              type="button"
                              className={idx === mentionIndex ? 'is-active' : ''}
                              onClick={() => applyMention(member)}
                            >
                              <AtSign className="h-3.5 w-3.5" />
                              {getMemberName(member)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="student-community__composer-send"
                      onClick={() => void handleSendMessage()}
                      disabled={(!messageInput.trim() && !pendingImage && !imagePreview) || sendingMessage}
                      title="Send message"
                    >
                      {sendingMessage ? (
                        <span className="student-community-loading__spinner student-community-loading__spinner--sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="student-community__composer-hint">
                  <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> new line · <code>@name</code> · <code>/search</code>
                </p>
              </footer>
            ) : null}
          </section>

          {/* Members panel */}
          {showMembersPanel ? (
            <aside className="student-community__members is-visible">
              <div className="student-community__members-head">
                <h4 className="font-bold text-[var(--admin-text)]">Members</h4>
                <AdminBadge tone="indigo">{filteredMembers.length}</AdminBadge>
              </div>
              <div className="student-community__members-search">
                <AdminSearchField
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Search members…"
                />
              </div>
              <div className="student-community__member-list">
                {filteredMembers.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[var(--admin-muted)]">No members found.</p>
                ) : (
                  filteredMembers.map((member) => {
                    const id = member._id || member.email;
                    const badge = roleBadge(member.role);
                    const BadgeIcon = badge.icon;
                    return (
                      <div key={id} className="student-community__member">
                        <div className="student-community__member-btn">
                          <span className="student-community__member-avatar">
                            {member.profileImage || member.avatar ? (
                              <img src={member.profileImage || member.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              getMemberInitials(member)
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="flex items-center gap-1.5">
                              <span className="block truncate text-sm font-semibold text-[var(--admin-text)]">
                                {getMemberName(member)}
                              </span>
                              <AdminBadge tone={badge.tone} className="shrink-0 text-[10px]">
                                <BadgeIcon className="mr-0.5 inline h-2.5 w-2.5" />
                                {badge.label}
                              </AdminBadge>
                            </span>
                            {member.email ? (
                              <span className="block truncate text-xs text-[var(--admin-muted)]">{member.email}</span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          ) : null}
        </div>
      </AdminPanel>
    </div>
  );
}
