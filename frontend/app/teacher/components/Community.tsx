'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import useChatSocket from '@/hooks/useChatSocket';
import {
  Hash,
  Plus,
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
  Wifi,
  WifiOff,
  Eraser,
  BarChart3,
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
import TeacherStudentDetailsModal, { TeacherStudentDetailsTab } from './TeacherStudentDetailsModal';
import { Student } from '../types';
import {
  QUICK_EMOJIS,
  getMentionQuery,
  insertMention,
  readLastReadMap,
  renderMessageContent,
  userReacted,
  writeLastRead,
  type MessageReaction,
} from './communityUtils';

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
interface CommunityProps { students: Student[]; courses: any[]; }

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
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<string | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState<number>(0);
  const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
  const [useWebSocket, setUseWebSocket] = useState(true);
  const [channelSearch, setChannelSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Student | null>(null);
  const [studentDetailsTab, setStudentDetailsTab] = useState<TeacherStudentDetailsTab>('overview');
  const [showStudentModal, setShowStudentModal] = useState(false);
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
    if (!q) return students;
    return students.filter((s) => {
      const name = `${s.firstName || ''} ${s.lastName || ''} ${s.name || ''} ${s.email}`.toLowerCase();
      return name.includes(q);
    });
  }, [students, memberSearch]);

  const activeChannelData = useMemo(
    () => channels.find((c) => c._id === activeChannel),
    [channels, activeChannel]
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

  const getMemberName = (student: Student) => {
    if (student.firstName && student.lastName) return `${student.firstName} ${student.lastName}`;
    return student.name || student.email;
  };

  const getMemberInitials = (student: Student) => {
    const first = student.firstName || student.name?.split(' ')[0] || student.email || '?';
    const last = student.lastName || student.name?.split(' ')[1] || '';
    if (last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    return first.charAt(0).toUpperCase();
  };

  const openMemberProfile = (student: Student, tab: TeacherStudentDetailsTab = 'overview') => {
    setSelectedMember(student);
    setStudentDetailsTab(tab);
    setShowStudentModal(true);
  };

  const roleBadge = (role?: string) => {
    if (role === 'admin') return { label: 'Admin', tone: 'amber' as const, icon: Crown };
    if (role === 'teacher') return { label: 'Teacher', tone: 'sky' as const, icon: Shield };
    return { label: 'Student', tone: 'emerald' as const, icon: User };
  };

  const mentionSuggestions = useMemo(() => {
    const query = getMentionQuery(messageInput, composerCursor);
    if (query === null) return [];
    return students
      .filter((s) => {
        const first = (s.firstName || '').toLowerCase();
        const last = (s.lastName || '').toLowerCase();
        const email = (s.email || '').split('@')[0].toLowerCase();
        return first.startsWith(query) || last.startsWith(query) || email.startsWith(query);
      })
      .slice(0, 6);
  }, [messageInput, composerCursor, students]);

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

  const applyMention = (student: Student) => {
    const handle = student.firstName || student.email.split('@')[0];
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
          
          // INSTANT refresh to sync with other users immediately (only if WebSocket disabled)
          if (!useWebSocket) {
            setTimeout(() => fetchChannels(), 100);
          }
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
    setDeletedMessageIds(new Set());
    setDeletingMessageIds(new Set());
    setReplyingTo(null);
    setReactionPickerId(null);
    fetchMessages(activeChannel, true);
    fetchPinnedMessages(activeChannel);
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

  useEffect(() => {
    if (!showChannelCreator) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowChannelCreator(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showChannelCreator]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="teacher-community-loading">
        <div className="teacher-community-loading__spinner" />
        <p>Loading community workspace…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="teacher-community-loading">
        <div className="teacher-community-loading__spinner" />
        <p>Loading channels and messages…</p>
      </div>
    );
  }

  return (
    <div className="teacher-community">
      <div className="teacher-community__stats">
        <AdminStatGrid>
        <AdminStatCard label="Channels" value={channels.length} icon={Hash} tone="emerald" />
        <AdminStatCard label="Community members" value={students.length} icon={Users} tone="indigo" />
        <AdminStatCard
          label="Messages in view"
          value={messages.length}
          icon={MessageSquare}
          tone="violet"
          hint={activeChannelData ? `#${activeChannelData.name}` : undefined}
        />
        <AdminStatCard
          label="Live sync"
          value={useWebSocket ? 'On' : 'Polling'}
          icon={useWebSocket ? Wifi : WifiOff}
          tone={useWebSocket ? 'sky' : 'amber'}
        />
        </AdminStatGrid>
      </div>

      <AdminPanel className="teacher-community__workspace">
        <div className="teacher-community__layout">
          {/* Channel sidebar */}
          <aside className="teacher-community__sidebar">
            <div className="teacher-community__sidebar-head">
              <div className="teacher-community__sidebar-head-mesh" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-200" />
                    <h2 className="text-base font-bold text-white">Trading Community</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-emerald-100/80">Connect · Learn · Grow</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChannelCreator(true)}
                  className="rounded-lg bg-white/15 p-2 text-white transition hover:bg-white/25"
                  aria-label="Create channel"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="teacher-community__sidebar-tools">
              <AdminSearchField
                value={channelSearch}
                onChange={setChannelSearch}
                placeholder="Search channels…"
              />
              <div className="teacher-community__live-toggle">
                <span className="teacher-community__live-label">
                  {useWebSocket ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-amber-500" />}
                  Real-time
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useWebSocket}
                  onClick={() => setUseWebSocket(!useWebSocket)}
                  className={`teacher-community__toggle ${useWebSocket ? 'is-on' : ''}`}
                >
                  <span className="teacher-community__toggle-knob" />
                </button>
              </div>
            </div>

            <div className="teacher-community__channel-list">
              <p className="teacher-community__section-label">Channels ({filteredChannels.length})</p>
              {filteredChannels.length === 0 ? (
                <div className="teacher-community__sidebar-empty">
                  <Hash className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">No channels yet</p>
                  <p className="mt-1 text-xs opacity-70">Create one to start the conversation.</p>
                  <AdminButton variant="primary" onClick={() => setShowChannelCreator(true)}>
                    <Plus className="h-4 w-4" />
                    New channel
                  </AdminButton>
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isActive = activeChannel === channel._id;
                  return (
                    <div
                      key={channel._id}
                      className={`teacher-community__channel ${isActive ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveChannel(channel._id)}
                        className="teacher-community__channel-btn"
                      >
                        <span className="teacher-community__channel-icon">
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
                          <span className="teacher-community__unread">{unreadByChannel[channel._id]}</span>
                        ) : null}
                      </button>
                      <AdminRowActionsMenu
                        variant="icon"
                        align="right"
                        label={`Channel actions for ${channel.name}`}
                        items={[
                          {
                            id: 'delete',
                            label: 'Delete channel',
                            icon: Trash2,
                            tone: 'danger',
                            loading: deletingChannel === channel._id,
                            onClick: () => void handleDeleteChannel(channel._id),
                          },
                        ]}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chat main */}
          <section className="teacher-community__chat">
            <header className="teacher-community__chat-head">
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
                        <span className="teacher-community__pulse">
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
                  className="teacher-community__icon-btn"
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
                      {
                        id: 'delete',
                        label: 'Delete channel',
                        icon: Trash2,
                        tone: 'danger',
                        loading: deletingChannel === activeChannel,
                        onClick: () => void handleDeleteChannel(activeChannel),
                      },
                    ]}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowSearchPanel((v) => !v)}
                  className="teacher-community__icon-btn"
                  title="Search messages"
                  disabled={!activeChannel}
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => activeChannel && fetchMessages(activeChannel, false)}
                  className="teacher-community__icon-btn"
                  title="Refresh messages"
                  disabled={!activeChannel}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </header>

            {showSearchPanel && activeChannel ? (
              <div className="teacher-community__search-bar">
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
              <div className="teacher-community__search-results">
                {searchResults.map((result) => (
                  <button
                    key={result._id}
                    type="button"
                    className="teacher-community__search-hit"
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
              <div className="teacher-community__pinned">
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
              className="teacher-community__messages"
              onScroll={checkIfUserScrolledUp}
            >
              {!activeChannel ? (
                <AdminEmptyState
                  icon={Hash}
                  title="Select a channel"
                  description="Pick a channel from the sidebar or create a new one to start moderating discussions."
                    action={
                    <AdminButton variant="primary" onClick={() => setShowChannelCreator(true)}>
                      <Plus className="h-4 w-4" />
                      Create channel
                    </AdminButton>
                  }
                />
              ) : messages.length === 0 ? (
                <AdminEmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Be the first to post in this channel and welcome your students."
                />
              ) : (
                <div className="teacher-community__message-stack">
                  {messageGroups.map((group) => {
                    const badge = roleBadge(group.author.role);
                    const RoleIcon = badge.icon;
                    const firstMessage = group.messages[0];
                    return (
                      <article key={firstMessage._id} className="teacher-community__message-group">
                        <div className="teacher-community__avatar">
                          {group.author.firstName?.charAt(0) ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="teacher-community__message-meta">
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
                          <div className="teacher-community__bubbles">
                            {group.messages.map((message) => (
                              <div key={message._id} id={`msg-${message._id}`} className="teacher-community__bubble-wrap group">
                                {editingMessage === message._id ? (
                                  <div className="teacher-community__edit">
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      rows={3}
                                      className="teacher-community__edit-input"
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
                                    <div className="teacher-community__bubble">
                                      {message.parentMessage ? (
                                        <div className="teacher-community__reply-quote">
                                          <Reply className="h-3 w-3 shrink-0" />
                                          <span className="truncate">
                                            <strong>{message.parentMessage.author.firstName}</strong>{' '}
                                            {message.parentMessage.content}
                                          </span>
                                        </div>
                                      ) : null}
                                      {message.attachments?.map((att, idx) =>
                                        att.url ? (
                                          <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="teacher-community__attachment">
                                            <img src={att.url} alt={att.originalName || 'attachment'} />
                                          </a>
                                        ) : null
                                      )}
                                      {message.content ? (
                                        <p>{renderMessageContent(message.content)}</p>
                                      ) : null}
                                      {message.isEdited ? (
                                        <span className="teacher-community__edited">edited</span>
                                      ) : null}
                                      {message.isPinned ? (
                                        <span className="teacher-community__pinned-tag">
                                          <Pin className="h-3 w-3" /> pinned
                                        </span>
                                      ) : null}
                                    </div>
                                    {message.reactions && message.reactions.length > 0 ? (
                                      <div className="teacher-community__reactions">
                                        {message.reactions.map((reaction) => (
                                          <button
                                            key={reaction.emoji}
                                            type="button"
                                            className={`teacher-community__reaction ${userReacted(reaction, currentUser?.id) ? 'is-mine' : ''}`}
                                            onClick={() => void handleToggleReaction(message._id, reaction.emoji)}
                                          >
                                            <span>{reaction.emoji}</span>
                                            <span>{reaction.count}</span>
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                    <div className="teacher-community__msg-actions">
                                      <button
                                        type="button"
                                        className="teacher-community__react-btn"
                                        onClick={() => setReactionPickerId(reactionPickerId === message._id ? null : message._id)}
                                        title="Add reaction"
                                      >
                                        <Smile className="h-4 w-4" />
                                      </button>
                                      {reactionPickerId === message._id ? (
                                        <div className="teacher-community__emoji-picker">
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
                                        className="teacher-community__msg-menu"
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
                <div className="teacher-community__new-banner">
                  <button type="button" onClick={scrollToBottom} className="teacher-community__new-btn">
                    New messages
                  </button>
                </div>
              ) : null}
            </div>

            {activeChannel ? (
              <footer className="teacher-community__composer">
                {replyingTo ? (
                  <div className="teacher-community__reply-bar">
                    <Reply className="h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--admin-muted)]">
                        Replying to {replyingTo.author.firstName}
                      </p>
                      <p className="truncate text-sm">{replyingTo.content}</p>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="teacher-community__icon-btn">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {imagePreview ? (
                  <div className="teacher-community__image-preview">
                    <img src={imagePreview} alt="Upload preview" />
                    <button type="button" onClick={clearPendingImage} className="teacher-community__icon-btn">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <div className="teacher-community__composer-box">
                  <div className="teacher-community__composer-toolbar" aria-label="Quick reactions">
                    {QUICK_EMOJIS.slice(0, 6).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="teacher-community__emoji-chip"
                        onClick={() => setMessageInput((v) => `${v}${emoji}`)}
                        title={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="teacher-community__composer-row">
                    <button
                      type="button"
                      className="teacher-community__composer-action"
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
                    <div className="teacher-community__composer-input-wrap">
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
                        className="teacher-community__composer-input"
                        disabled={sendingMessage}
                      />
                      {mentionSuggestions.length > 0 ? (
                        <div className="teacher-community__mention-menu">
                          {mentionSuggestions.map((student, idx) => (
                            <button
                              key={student.id || student._id}
                              type="button"
                              className={idx === mentionIndex ? 'is-active' : ''}
                              onClick={() => applyMention(student)}
                            >
                              <AtSign className="h-3.5 w-3.5" />
                              {getMemberName(student)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="teacher-community__composer-send"
                      onClick={() => void handleSendMessage()}
                      disabled={(!messageInput.trim() && !pendingImage && !imagePreview) || sendingMessage}
                      title="Send message"
                    >
                      {sendingMessage ? (
                        <span className="teacher-community-loading__spinner teacher-community-loading__spinner--sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="teacher-community__composer-hint">
                  <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> new line · <code>@name</code> · <code>/search</code>
                </p>
              </footer>
            ) : null}
          </section>

          {/* Members panel */}
          {showMembersPanel ? (
            <aside className="teacher-community__members is-visible">
              <div className="teacher-community__members-head">
                <h4 className="font-bold text-[var(--admin-text)]">Members</h4>
                <AdminBadge tone="indigo">{filteredMembers.length}</AdminBadge>
              </div>
              <div className="teacher-community__members-search">
                <AdminSearchField
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Search students…"
                />
              </div>
              <div className="teacher-community__member-list">
                {filteredMembers.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[var(--admin-muted)]">No members found.</p>
                ) : (
                  filteredMembers.map((student) => {
                    const id = student.id || student._id || student.email;
                    return (
                      <div key={id} className="teacher-community__member">
                        <button
                          type="button"
                          onClick={() => openMemberProfile(student, 'overview')}
                          className="teacher-community__member-btn"
                        >
                          <span className="teacher-community__member-avatar">
                            {student.profileImage || student.avatar ? (
                              <img src={student.profileImage || student.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              getMemberInitials(student)
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-sm font-semibold text-[var(--admin-text)]">
                              {getMemberName(student)}
                            </span>
                            <span className="block truncate text-xs text-[var(--admin-muted)]">{student.email}</span>
                          </span>
                        </button>
                        <AdminRowActionsMenu
                          variant="icon"
                          align="right"
                          label={`Actions for ${getMemberName(student)}`}
                          items={[
                            {
                              id: 'view',
                              label: 'View student',
                              icon: User,
                              tone: 'info',
                              onClick: () => openMemberProfile(student, 'overview'),
                            },
                            {
                              id: 'performance',
                              label: 'View performance',
                              icon: BarChart3,
                              tone: 'info',
                              onClick: () => openMemberProfile(student, 'performance'),
                            },
                          ]}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          ) : null}
        </div>
      </AdminPanel>

      {showStudentModal && selectedMember ? (
        <TeacherStudentDetailsModal
          student={selectedMember}
          initialTab={studentDetailsTab}
          onClose={() => setShowStudentModal(false)}
        />
      ) : null}

      {showChannelCreator &&
        createPortal(
          <div
            className="teacher-community-modal"
            onClick={(e) => e.target === e.currentTarget && setShowChannelCreator(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="teacher-community-modal__surface"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="teacher-community-modal__header">
                <div>
                  <h3 className="text-lg font-bold text-white">Create channel</h3>
                  <p className="text-sm text-emerald-100/80">Start a new discussion space for your students.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChannelCreator(false)}
                  className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="teacher-community-modal__body">
                <label className="teacher-community-modal__field">
                  <span>Channel name</span>
                  <input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. market-analysis"
                    className="teacher-community-modal__input"
                  />
                </label>
                <label className="teacher-community-modal__field">
                  <span>Description</span>
                  <textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    rows={3}
                    placeholder="What is this channel for?"
                    className="teacher-community-modal__input"
                  />
                </label>
                <label className="teacher-community-modal__privacy">
                  <input
                    type="checkbox"
                    checked={isPrivateChannel}
                    onChange={(e) => setIsPrivateChannel(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                  />
                  <span>
                    <strong>Private channel</strong>
                    <span className="teacher-community-modal__privacy-hint">
                      Only invited members can see messages.
                    </span>
                  </span>
                </label>
              </div>
              <div className="teacher-community-modal__footer">
                <AdminButton variant="ghost" onClick={() => setShowChannelCreator(false)}>
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="primary"
                  className="teacher-community-modal__submit"
                  onClick={() => void handleCreateChannel()}
                  disabled={!newChannelName.trim() || creatingChannel}
                >
                  {creatingChannel ? 'Creating…' : 'Create channel'}
                </AdminButton>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
