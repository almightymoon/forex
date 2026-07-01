import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, apiUpload } from '../../utils/api';
import { AuthUser, getStoredUser } from '../../utils/auth';
import { getChatSocket, joinChannel, leaveChannel } from '../../utils/socket';
import { resolveMediaUrl } from '../../utils/normalize';
import { canDeleteCommunityMessage, isCommunityModerator } from '../../utils/communityPermissions';

type ChatTheme = {
  bg: string;
  sidebarBg: string;
  cardBg: string;
  inputBg: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryForeground: string;
  primaryDark: string;
  green: string;
  headerBg: string;
};

function createChatTheme(colors: AppColors, isDark: boolean): ChatTheme {
  return {
    bg: colors.background,
    sidebarBg: colors.background,
    cardBg: colors.backgroundElevated,
    inputBg: isDark ? colors.surfaceInset : '#F9F9F9',
    border: colors.border,
    text: colors.text,
    muted: colors.textMuted,
    primary: colors.primary,
    primaryForeground: colors.primaryForeground,
    primaryDark: colors.primaryDark,
    green: colors.success,
    headerBg: colors.background,
  };
}

function getRoleColors(textColor: string): Record<string, string> {
  return {
    admin: '#FF5A5A',
    teacher: '#A78BFA',
    instructor: '#A78BFA',
    developer: '#4ADE80',
    student: textColor,
  };
}

// Commonly used emojis — no library needed
const EMOJI_GROUPS = [
  { label: 'Common', emojis: ['👍','❤️','🔥','😂','🎯','✅','💯','🚀','⭐','👏','😍','🙏','💪','🤔','😅','👋','🎉','💰','📈','📊'] },
  { label: 'Trading', emojis: ['💹','📉','💸','🏦','💎','🔑','⚡','🎲','🏆','🥇','💡','🔔','📢','🌐','💼','🤝','📱','🖥️','⏰','🎪'] },
];

interface Channel {
  _id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  memberCount?: number;
  lastMessage?: { content?: string; author?: { firstName?: string; lastName?: string } };
}
interface MessageAttachment {
  url?: string;
  mimeType?: string;
  originalName?: string;
}
interface Message {
  _id: string;
  content: string;
  author: { _id?: string; firstName?: string; lastName?: string; role?: string };
  createdAt: string;
  isEdited?: boolean;
  attachments?: MessageAttachment[];
  parentMessage?: Message | string | null;
  reactions?: { emoji: string; count: number; users?: Array<{ _id?: string } | string> }[];
}
interface PendingImage {
  uri: string;
  mimeType: string;
}
interface ReplyMeta {
  parentId: string;
  parent: Pick<Message, '_id' | 'content' | 'author' | 'createdAt'>;
}
interface MsgGroup {
  key: string;
  author: Message['author'];
  messages: Message[];
  firstTime: string;
}

function groupMessages(msgs: Message[]): MsgGroup[] {
  const groups: MsgGroup[] = [];
  for (const msg of msgs) {
    const last = groups[groups.length - 1];
    const aid = String(msg.author?._id ?? msg.author?.firstName ?? '');
    const lastAid = last ? String(last.author?._id ?? last.author?.firstName ?? '') : '';
    const gapMin = last
      ? (new Date(msg.createdAt).getTime() - new Date(last.messages[last.messages.length - 1].createdAt).getTime()) / 60000
      : 99;
    const hasReply = !!getParentId(msg) || !!getParentMessage(msg);
    const lastHasReply = last?.messages.some((m) => m.parentMessage);
    if (last && lastAid === aid && aid && gapMin < 7 && !hasReply && !lastHasReply) {
      last.messages.push(msg);
    } else {
      groups.push({ key: msg._id, author: msg.author, messages: [msg], firstTime: msg.createdAt });
    }
  }
  return groups;
}

function timeStr(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today at ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
}

function displayName(a: Message['author']) {
  return `${a?.firstName ?? ''} ${a?.lastName ?? ''}`.trim() || 'Unknown';
}

function Avatar({
  author,
  size = 40,
  roleColors,
  accent,
}: {
  author: Message['author'];
  size?: number;
  roleColors: Record<string, string>;
  accent: string;
}) {
  const role = author?.role ?? 'student';
  const color = roleColors[role] ?? accent;
  const init = `${author?.firstName?.[0] ?? '?'}${author?.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={[avStyles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
      <Text style={[avStyles.text, { color, fontSize: size * 0.35 }]}>{init}</Text>
    </View>
  );
}
const avStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1 },
  text: { fontWeight: '900' },
});

function getParentId(msg: Message): string | null {
  if (!msg.parentMessage) return null;
  if (typeof msg.parentMessage === 'string') return msg.parentMessage;
  return msg.parentMessage._id ?? null;
}

function toParentSnapshot(msg: Message): ReplyMeta['parent'] {
  return {
    _id: msg._id,
    content: msg.content,
    author: msg.author,
    createdAt: msg.createdAt,
  };
}

/** Resolve reply quotes after fetch — API may return parentMessage as an id string or omit populate. */
function normalizeMessages(
  incoming: Message[],
  replyMeta: Map<string, ReplyMeta>,
  existing: Message[] = [],
): Message[] {
  const existingById = new Map(existing.map((m) => [m._id, m]));
  const byId = new Map(incoming.map((m) => [m._id, m]));

  return incoming.map((msg) => {
    let parentId = getParentId(msg);
    const cached = replyMeta.get(msg._id);
    if (!parentId && cached) parentId = cached.parentId;

    if (!parentId) {
      const prev = existingById.get(msg._id);
      if (prev?.parentMessage && typeof prev.parentMessage === 'object') {
        return { ...msg, parentMessage: prev.parentMessage };
      }
      return msg;
    }

    let parent: Message | null = null;
    if (msg.parentMessage && typeof msg.parentMessage === 'object' && msg.parentMessage.content) {
      parent = msg.parentMessage;
    } else if (cached?.parent) {
      parent = cached.parent as Message;
    } else {
      const parentMsg = byId.get(parentId) ?? existingById.get(parentId);
      if (parentMsg) parent = toParentSnapshot(parentMsg) as Message;
    }

    if (!parent) return msg;

    replyMeta.set(msg._id, { parentId, parent: toParentSnapshot(parent) });
    return { ...msg, parentMessage: parent };
  });
}

function getParentMessage(msg: Message): Message | null {
  const parent = msg.parentMessage;
  if (!parent || typeof parent === 'string') return null;
  return parent;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const chat = useMemo(() => createChatTheme(colors, isDark), [colors, isDark]);
  const roleColors = useMemo(() => getRoleColors(colors.text), [colors.text]);
  const s = useMemo(() => createCommunityStyles(colors, chat, isDark), [colors, chat, isDark]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmojiGroup, setSelectedEmojiGroup] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [actionTarget, setActionTarget] = useState<Message | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const replyMetaByChannelRef = useRef<Map<string, Map<string, ReplyMeta>>>(new Map());
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Awaited<ReturnType<typeof getChatSocket>>>(null);
  const inputRef = useRef<TextInput>(null);
  const selectedRef = useRef<Channel | null>(null);
  const activeChannelRef = useRef<string | null>(null);

  useEffect(() => {
    deletedIdsRef.current = deletedIds;
  }, [deletedIds]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const teardownChannel = (chId?: string) => {
    if (chId) leaveChannel(chId);
    if (socketRef.current) {
      socketRef.current.removeAllListeners('message:new');
      socketRef.current.removeAllListeners('message:update');
      socketRef.current.removeAllListeners('message:delete');
      socketRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    getStoredUser().then(setUser);
    fetchChannels();
    return () => {
      teardownChannel(selectedRef.current?._id);
    };
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await apiFetch('api/community/channels');
      if (res.ok) { const d = await res.json(); setChannels(d.channels ?? d ?? []); }
    } catch { /* ignore */ }
    finally { setLoadingChannels(false); setRefreshing(false); }
  };

  const openChannel = async (ch: Channel) => {
    if (selected?._id && selected._id !== ch._id) {
      teardownChannel(selected._id);
    }
    activeChannelRef.current = ch._id;
    setSelected(ch);
    setMessages([]);
    setReplyTo(null);
    setEditingMessageId(null);
    setActionTarget(null);
    setDeletedIds(new Set());
    setLoadingMsgs(true);
    await loadMessages(ch._id);
    if (activeChannelRef.current !== ch._id) return;
    setLoadingMsgs(false);
    if (pollRef.current) clearInterval(pollRef.current);
    // WebSocket for real-time updates
    const sock = await getChatSocket();
    if (activeChannelRef.current !== ch._id) return;
    socketRef.current = sock;
    if (sock) {
      sock.removeAllListeners('message:new');
      sock.removeAllListeners('message:update');
      sock.removeAllListeners('message:delete');
      joinChannel(ch._id);
      const onNew = (message: Message) => {
        if (deletedIdsRef.current.has(message._id)) return;
        setMessages((current) => normalizeMessages([message], getChannelReplyMeta(ch._id), current));
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      };
      const onUpdate = (message: Message) => {
        setMessages((current) => normalizeMessages([message], getChannelReplyMeta(ch._id), current));
      };
      const onDelete = (messageId: string) => {
        setMessages((p) => p.filter((m) => m._id !== messageId));
        setDeletedIds((p) => new Set([...p, messageId]));
      };
      sock.on('message:new', onNew);
      sock.on('message:update', onUpdate);
      sock.on('message:delete', onDelete);
      // Fallback poll every 30s if socket connected, 6s if not
      pollRef.current = setInterval(() => loadMessages(ch._id), 30000);
    } else {
      pollRef.current = setInterval(() => loadMessages(ch._id), 6000);
    }
  };

  const closeChannel = () => {
    activeChannelRef.current = null;
    teardownChannel(selected?._id);
    setSelected(null);
    setShowEmoji(false);
    setReplyTo(null);
    setPendingImage(null);
    setEditingMessageId(null);
    setActionTarget(null);
  };

  const canEditMessage = (msg: Message) =>
    !!user && String(msg.author?._id) === String(user._id) && !msg._id.startsWith('tmp-');

  const canDeleteMessage = (msg: Message) =>
    canDeleteCommunityMessage(user?._id, user?.role, msg.author?._id, msg._id);

  const getChannelReplyMeta = (channelId: string) => {
    if (!replyMetaByChannelRef.current.has(channelId)) {
      replyMetaByChannelRef.current.set(channelId, new Map());
    }
    return replyMetaByChannelRef.current.get(channelId)!;
  };

  const loadMessages = async (cid: string) => {
    try {
      const res = await apiFetch(`api/community/channels/${cid}/messages?limit=60`);
      if (!res.ok || activeChannelRef.current !== cid) return;
      const d = await res.json();
      const raw: Message[] = (d.messages ?? d ?? []).filter(
        (m: Message) => !deletedIdsRef.current.has(m._id),
      );
      setMessages((current) =>
        normalizeMessages(raw, getChannelReplyMeta(cid), current),
      );
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 80);
    } catch { /* ignore */ }
  };

  const deleteMessage = async (messageId: string) => {
    if (deletingIds.has(messageId)) return;
    const original = messages;
    setMessages((p) => p.filter((m) => m._id !== messageId));
    setDeletedIds((p) => new Set([...p, messageId]));
    setDeletingIds((p) => new Set([...p, messageId]));
    setActionTarget(null);

    try {
      const res = await apiFetch(`api/community/messages/${messageId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        setMessages(original);
        setDeletedIds((p) => {
          const next = new Set(p);
          next.delete(messageId);
          return next;
        });
        const err = await res.json().catch(() => ({}));
        Alert.alert('Delete failed', err.message ?? 'Could not delete this message.');
      }
    } catch {
      setMessages(original);
      setDeletedIds((p) => {
        const next = new Set(p);
        next.delete(messageId);
        return next;
      });
      Alert.alert('Delete failed', 'Could not delete this message.');
    } finally {
      setDeletingIds((p) => {
        const next = new Set(p);
        next.delete(messageId);
        return next;
      });
    }
  };

  const confirmDelete = (msg: Message) => {
    setActionTarget(null);
    const isOwn = !!user && String(msg.author?._id) === String(user._id);
    const isModeratorDelete = !isOwn && isCommunityModerator(user?.role);
    Alert.alert(
      isModeratorDelete ? 'Remove message' : 'Delete message',
      isModeratorDelete
        ? `Remove this message from ${displayName(msg.author)}?`
        : 'This message will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(msg._id) },
      ],
    );
  };

  const startEdit = (msg: Message) => {
    setActionTarget(null);
    setReplyTo(null);
    setEditingMessageId(msg._id);
    setEditContent(msg.content);
    setShowEmoji(false);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    const trimmed = editContent.trim();
    try {
      const res = await apiFetch(`api/community/messages/${editingMessageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setMessages((p) =>
          p.map((m) =>
            m._id === editingMessageId ? { ...m, content: trimmed, isEdited: true } : m,
          ),
        );
        cancelEdit();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Edit failed', err.message ?? 'Could not edit this message.');
      }
    } catch {
      Alert.alert('Edit failed', 'Could not edit this message.');
    }
  };

  const startReply = (msg: Message) => {
    setActionTarget(null);
    setEditingMessageId(null);
    setReplyTo(msg);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const toggleReaction = async (msg: Message, emoji: string) => {
    if (msg._id.startsWith('tmp-')) return;
    setActionTarget(null);
    try {
      const res = await apiFetch(`api/community/messages/${msg._id}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.message) {
          setMessages((p) =>
            p.map((m) => {
              if (m._id !== msg._id) return m;
              const updated = { ...m, ...d.message };
              if (!getParentMessage(updated) && getParentMessage(m)) {
                updated.parentMessage = m.parentMessage;
              }
              return updated;
            }),
          );
        }
      }
    } catch { /* ignore */ }
  };

  const openMessageActions = (msg: Message) => {
    Keyboard.dismiss();
    setShowEmoji(false);
    setActionTarget(msg);
  };

  const sendMessage = async () => {
    const text = input.trim();
    const imageToSend = pendingImage;
    if ((!text && !imageToSend) || !selected || sending) return;

    const replyTarget = replyTo;
    setInput('');
    setPendingImage(null);
    setShowEmoji(false);
    setReplyTo(null);
    setSending(true);
    const optimistic: Message = {
      _id: `tmp-${Date.now()}`,
      content: text || (imageToSend ? '📷' : ''),
      author: { _id: user?._id, firstName: user?.firstName, lastName: user?.lastName, role: user?.role },
      createdAt: new Date().toISOString(),
      attachments: imageToSend
        ? [{ url: imageToSend.uri, mimeType: imageToSend.mimeType }]
        : undefined,
      parentMessage: replyTarget
        ? {
            _id: replyTarget._id,
            content: replyTarget.content,
            author: replyTarget.author,
            createdAt: replyTarget.createdAt,
          }
        : undefined,
    };
    setMessages((p) => [...p, optimistic]);
    if (replyTarget) {
      getChannelReplyMeta(selected._id).set(optimistic._id, {
        parentId: replyTarget._id,
        parent: toParentSnapshot(replyTarget),
      });
    }
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

    const buildFormData = () => {
      const form = new FormData();
      form.append('content', text || '📷');
      if (replyTarget) form.append('parentMessageId', replyTarget._id);
      if (imageToSend) {
        const ext = imageToSend.mimeType.includes('png')
          ? 'png'
          : imageToSend.mimeType.includes('gif')
            ? 'gif'
            : imageToSend.mimeType.includes('webp')
              ? 'webp'
              : 'jpg';
        form.append('image', {
          uri: imageToSend.uri,
          name: `community-${Date.now()}.${ext}`,
          type: imageToSend.mimeType,
        } as unknown as Blob);
      }
      return form;
    };

    const postJson = () =>
      apiFetch(`api/community/channels/${selected._id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: text,
          ...(replyTarget ? { parentMessageId: replyTarget._id } : {}),
        }),
      });

    const postForm = () =>
      apiUpload(`api/community/channels/${selected._id}/messages`, buildFormData());

    try {
      let res: Response;
      let lastError = 'Could not send message.';

      if (imageToSend) {
        res = await postForm();
      } else {
        res = await postJson();
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastError = (err as { message?: string }).message ?? lastError;
          if (res.status === 400 && lastError.toLowerCase().includes('required')) {
            res = await postForm();
          }
        }
      }

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const saved = data?.message as Message | undefined;
        const meta = getChannelReplyMeta(selected._id);
        if (replyTarget) {
          const snapshot = toParentSnapshot(replyTarget);
          if (saved?._id) {
            meta.delete(optimistic._id);
            meta.set(saved._id, { parentId: replyTarget._id, parent: snapshot });
          }
        }
        await loadMessages(selected._id);
      } else {
        setMessages((p) => p.filter((m) => m._id !== optimistic._id));
        const err = await res.json().catch(() => ({}));
        const msg = (err as { message?: string }).message ?? lastError;
        Alert.alert(
          'Send failed',
          msg.includes('content is required') && imageToSend
            ? 'Image uploads need the latest server update. Try sending text only for now.'
            : msg,
        );
      }
    } catch {
      setMessages((p) => p.filter((m) => m._id !== optimistic._id));
      Alert.alert('Send failed', 'Network error. Please try again.');
    }
    finally { setSending(false); }
  };

  const pickImage = async () => {
    if (sending) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
      Alert.alert('Image too large', 'Please choose an image under 8MB.');
      return;
    }

    setPendingImage({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
    setShowEmoji(false);
  };

  const insertEmoji = (emoji: string) => {
    setInput((p) => p + emoji);
    inputRef.current?.focus();
  };

  // Memoize so typing in the input box does NOT re-group all messages
  const allGroups = useMemo(() => groupMessages(messages), [messages]);

  const messageGroups = useMemo(() => {
    if (!searchQuery.trim()) return allGroups;
    const q = searchQuery.trim().toLowerCase();
    return allGroups.filter((g) =>
      g.messages.some((m) => m.content?.toLowerCase().includes(q)) ||
      displayName(g.author).toLowerCase().includes(q)
    );
  }, [allGroups, searchQuery]);

  // ── Chat view ─────────────────────────────────────────────────────────────
  if (selected) {
    const groups = messageGroups;

    return (
      <View style={{ flex: 1, backgroundColor: chat.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: chat.headerBg }}>
          <View style={s.chatHeader}>
            <Pressable style={s.iconBtn} onPress={closeChannel}>
              <Ionicons name="arrow-back" size={20} color={chat.text} />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <View style={s.channelHashBadge}>
                <Text style={s.channelHashText}>#</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.chatTitle}>{selected.name}</Text>
                {selected.description ? (
                  <Text style={s.chatDesc} numberOfLines={1}>{selected.description}</Text>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable style={s.iconBtn} onPress={() => { setShowSearch((v) => !v); setSearchQuery(''); }}>
                <Ionicons name={showSearch ? 'close' : 'search-outline'} size={17} color={chat.muted} />
              </Pressable>
              <Pressable style={s.iconBtn} onPress={() => loadMessages(selected._id)}>
                <Ionicons name="refresh" size={17} color={chat.muted} />
              </Pressable>
              {selected.memberCount != null && (
                <View style={s.memberPill}>
                  <View style={[s.dot, { backgroundColor: chat.green }]} />
                  <Text style={s.memberPillText}>{selected.memberCount}</Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>

        {showSearch && (
          <View style={s.searchBar}>
            <Ionicons name="search" size={15} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages…"
              placeholderTextColor={colors.textDim}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Messages */}
          {loadingMsgs ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator color={chat.primary} />
              <Text style={{ color: chat.muted, fontSize: 13 }}>Loading messages…</Text>
            </View>
          ) : (
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowEmoji(false); }}>
              <FlatList
                ref={flatRef}
                data={groups}
                keyExtractor={(g) => g.key}
                contentContainerStyle={s.msgListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => setShowEmoji(false)}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ color: chat.muted, fontSize: 14 }}>No messages yet — say hello! 👋</Text>
                  </View>
                }
                renderItem={({ item: group }) => {
                  const isMe = user && String(group.author?._id) === String(user?._id);
                  const color = roleColors[group.author?.role ?? 'student'] ?? chat.text;
                  const role = group.author?.role;
                  return (
                    <View style={s.msgGroup}>
                      <Avatar author={group.author} size={40} roleColors={roleColors} accent={chat.primary} />
                      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                        <View style={s.msgAuthorRow}>
                          <Text style={[s.msgAuthorName, { color }]}>{displayName(group.author)}</Text>
                          {role && role !== 'student' && (
                            <View style={[s.roleBadge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                              <Text style={[s.roleText, { color }]}>{role.toUpperCase()}</Text>
                            </View>
                          )}
                          {isMe && <View style={s.meBadge}><Text style={s.meText}>you</Text></View>}
                          <Text style={s.msgTime}>{timeStr(group.firstTime)}</Text>
                        </View>
                        {group.messages.map((msg: Message) => {
                          const parent = getParentMessage(msg);
                          const isEditing = editingMessageId === msg._id;
                          return (
                            <Pressable
                              key={msg._id}
                              onLongPress={() => openMessageActions(msg)}
                              delayLongPress={280}
                              style={({ pressed }) => [pressed && s.msgPressed]}
                            >
                              {parent ? (
                                <View style={s.replyQuote}>
                                  <View style={s.replyQuoteBar} />
                                  <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={s.replyQuoteAuthor} numberOfLines={1}>
                                      {displayName(parent.author)}
                                    </Text>
                                    <Text style={s.replyQuoteText} numberOfLines={2}>
                                      {parent.content}
                                    </Text>
                                  </View>
                                </View>
                              ) : null}
                              {isEditing ? (
                                <View style={s.editBox}>
                                  <TextInput
                                    style={s.editInput}
                                    value={editContent}
                                    onChangeText={setEditContent}
                                    multiline
                                    maxLength={2000}
                                    autoFocus
                                  />
                                  <View style={s.editActions}>
                                    <Pressable style={s.editCancelBtn} onPress={cancelEdit}>
                                      <Text style={s.editCancelText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                      style={[s.editSaveBtn, !editContent.trim() && s.editSaveBtnOff]}
                                      onPress={saveEdit}
                                      disabled={!editContent.trim()}
                                    >
                                      <Text style={s.editSaveText}>Save</Text>
                                    </Pressable>
                                  </View>
                                </View>
                              ) : (
                                <>
                                  {(msg.attachments ?? [])
                                    .filter((att) => att.url && (att.mimeType?.startsWith('image/') ?? true))
                                    .map((att, idx) => {
                                      const uri = resolveMediaUrl(att.url) ?? att.url;
                                      return (
                                        <Pressable
                                          key={`${msg._id}-att-${idx}`}
                                          onLongPress={() => openMessageActions(msg)}
                                          delayLongPress={280}
                                        >
                                          <Image source={{ uri }} style={s.msgImage} resizeMode="cover" />
                                        </Pressable>
                                      );
                                    })}
                                  {msg.content && msg.content !== '📷' ? (
                                    <Text style={s.msgText} selectable>
                                      {msg.content}
                                      {msg.isEdited ? <Text style={s.editedTag}> (edited)</Text> : null}
                                    </Text>
                                  ) : msg.isEdited ? (
                                    <Text style={s.editedTag}> (edited)</Text>
                                  ) : null}
                                </>
                              )}
                              {!isEditing && (msg.reactions?.length ?? 0) > 0 ? (
                                <View style={s.reactionRow}>
                                  {msg.reactions!.map((r) => (
                                    <Pressable
                                      key={r.emoji}
                                      style={s.reactionPill}
                                      onPress={() => toggleReaction(msg, r.emoji)}
                                    >
                                      <Text style={s.reactionText}>{r.emoji} {r.count}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                }}
              />
            </TouchableWithoutFeedback>
          )}

          {/* Reply preview */}
          {replyTo ? (
            <View style={s.replyBar}>
              <View style={s.replyBarAccent} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.replyBarLabel}>
                  Replying to <Text style={s.replyBarName}>{displayName(replyTo.author)}</Text>
                </Text>
                <Text style={s.replyBarPreview} numberOfLines={1}>{replyTo.content}</Text>
              </View>
              <Pressable style={s.replyBarClose} onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={18} color={chat.muted} />
              </Pressable>
            </View>
          ) : null}

          {/* Emoji tray */}
          {showEmoji && (
            <View style={[s.emojiTray, { backgroundColor: chat.cardBg }]}>
              {/* Group tabs */}
              <View style={s.emojiTabs}>
                {EMOJI_GROUPS.map((g, i) => (
                  <Pressable
                    key={g.label}
                    style={[s.emojiTab, selectedEmojiGroup === i && s.emojiTabActive]}
                    onPress={() => setSelectedEmojiGroup(i)}
                  >
                    <Text style={[s.emojiTabText, selectedEmojiGroup === i && { color: chat.primary }]}>
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {/* Emoji grid */}
              <ScrollView horizontal={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 150 }}>
                <View style={s.emojiGrid}>
                  {EMOJI_GROUPS[selectedEmojiGroup].emojis.map((e) => (
                    <Pressable key={e} style={s.emojiCell} onPress={() => insertEmoji(e)}>
                      <Text style={s.emojiChar}>{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Pending image preview */}
          {pendingImage ? (
            <View style={s.pendingImageBar}>
              <Image source={{ uri: pendingImage.uri }} style={s.pendingImageThumb} />
              <View style={{ flex: 1 }}>
                <Text style={s.pendingImageLabel}>Image ready to send</Text>
                <Text style={s.pendingImageHint}>Add a caption or tap send</Text>
              </View>
              <Pressable style={s.pendingImageRemove} onPress={() => setPendingImage(null)}>
                <Ionicons name="close" size={18} color={chat.text} />
              </Pressable>
            </View>
          ) : null}

          {/* Input bar */}
          <View style={[s.inputBar, { paddingBottom: showEmoji ? 8 : Math.max(insets.bottom, 8) }]}>
            <Pressable style={s.emojiBtn} onPress={pickImage} disabled={sending}>
              <Ionicons name="image-outline" size={22} color={chat.muted} />
            </Pressable>
            <Pressable
              style={[s.emojiBtn, showEmoji && s.emojiBtnActive]}
              onPress={() => {
                setShowEmoji((v) => !v);
                if (!showEmoji) Keyboard.dismiss();
                else inputRef.current?.focus();
              }}
            >
              <Ionicons name="happy-outline" size={22} color={showEmoji ? chat.primary : chat.muted} />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={s.inputField}
              value={input}
              onChangeText={setInput}
              placeholder={replyTo ? `Reply to ${displayName(replyTo.author)}…` : `Message #${selected.name}…`}
              placeholderTextColor={chat.muted}
              multiline
              maxLength={2000}
              onFocus={() => setShowEmoji(false)}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <Pressable
              style={[s.sendBtn, ((!input.trim() && !pendingImage) || sending) && s.sendBtnOff]}
              onPress={sendMessage}
              disabled={(!input.trim() && !pendingImage) || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color={chat.primaryForeground} />
                : <Ionicons name="send" size={16} color={(input.trim() || pendingImage) ? chat.primaryForeground : chat.muted} />}
            </Pressable>
          </View>

          {/* Message action sheet */}
          <Modal
            visible={!!actionTarget}
            transparent
            animationType="fade"
            onRequestClose={() => setActionTarget(null)}
          >
            <Pressable style={s.actionOverlay} onPress={() => setActionTarget(null)}>
              <Pressable style={s.actionSheet} onPress={(e) => e.stopPropagation()}>
                {actionTarget ? (
                  <>
                    <View style={s.actionPreview}>
                      <Text style={s.actionPreviewAuthor}>{displayName(actionTarget.author)}</Text>
                      <Text style={s.actionPreviewText} numberOfLines={2}>{actionTarget.content}</Text>
                    </View>
                    <Pressable style={s.actionItem} onPress={() => startReply(actionTarget)}>
                      <Ionicons name="arrow-undo-outline" size={20} color={chat.text} />
                      <Text style={s.actionItemText}>Reply</Text>
                    </Pressable>
                    {['👍', '❤️', '🔥', '😂'].map((emoji) => (
                      <Pressable
                        key={emoji}
                        style={s.actionItem}
                        onPress={() => toggleReaction(actionTarget, emoji)}
                      >
                        <Text style={s.actionEmoji}>{emoji}</Text>
                        <Text style={s.actionItemText}>React {emoji}</Text>
                      </Pressable>
                    ))}
                    {canEditMessage(actionTarget) ? (
                      <Pressable style={s.actionItem} onPress={() => startEdit(actionTarget)}>
                        <Ionicons name="create-outline" size={20} color={chat.text} />
                        <Text style={s.actionItemText}>Edit</Text>
                      </Pressable>
                    ) : null}
                    {canDeleteMessage(actionTarget) ? (
                      <Pressable style={s.actionItem} onPress={() => confirmDelete(actionTarget)}>
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                        <Text style={[s.actionItemText, { color: '#FF6B6B' }]}>Delete</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={[s.actionItem, s.actionCancel]} onPress={() => setActionTarget(null)}>
                      <Text style={s.actionCancelText}>Cancel</Text>
                    </Pressable>
                  </>
                ) : null}
              </Pressable>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Channel list ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: chat.sidebarBg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: chat.sidebarBg }}>
        <View style={s.serverHeader}>
          <Pressable style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={chat.text} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <LinearGradient
              colors={isDark ? [colors.brandPurple, colors.brandPurpleDeep] : [colors.black, colors.primaryEnd]}
              style={s.serverLogo}
            >
              <Text style={[s.serverLogoText, { color: colors.primaryForeground }]}>FN</Text>
            </LinearGradient>
            <View>
              <Text style={s.serverName}>FX Navigators</Text>
              <Text style={s.serverSub}>Community Hub</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={s.channelListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChannels(); }} tintColor={chat.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {loadingChannels ? (
          <ActivityIndicator color={chat.primary} style={{ marginTop: 40 }} />
        ) : channels.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="chatbubbles-outline" size={48} color={chat.muted} style={{ marginBottom: 12 }} />
            <Text style={{ color: chat.muted, fontSize: 15, fontWeight: '600' }}>No channels yet</Text>
            <Text style={{ color: chat.muted, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
              Channels will appear here once created.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.categoryRow}>
              <Ionicons name="chevron-down" size={11} color={chat.muted} />
              <Text style={s.categoryLabel}>TEXT CHANNELS</Text>
            </View>
            {channels.map((ch) => (
              <Pressable
                key={ch._id}
                style={({ pressed }) => [s.channelItem, pressed && { backgroundColor: colors.surfaceHover }]}
                onPress={() => openChannel(ch)}
              >
                <View style={s.channelItemLeft}>
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color={chat.muted} />
                  <Text style={s.channelItemName}>{ch.name}</Text>
                  {ch.isPrivate ? <Ionicons name="lock-closed" size={12} color={chat.muted} /> : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {ch.memberCount != null && (
                    <View style={s.memberCountBadge}>
                      <Ionicons name="people-outline" size={11} color={chat.muted} />
                      <Text style={s.memberCountText}>{ch.memberCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </View>
              </Pressable>
            ))}
            {channels.some((c) => !c.isPrivate) && (
              <View style={s.channelHint}>
                <Ionicons name="information-circle-outline" size={14} color={chat.muted} />
                <Text style={s.channelHintText}>Tap a channel to join the conversation</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function createCommunityStyles(colors: AppColors, chat: ChatTheme, isDark: boolean) {
  return StyleSheet.create({
  // Server header
  serverHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: chat.border,
  },
  serverLogo: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serverLogoText: { fontSize: 14, fontWeight: '900', color: colors.text },
  serverName: { fontSize: 15, fontWeight: '800', color: chat.text },
  serverSub: { fontSize: 11, color: chat.muted },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.surfaceHover,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: colors.text, height: 36,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  // Channel list
  channelListContent: { paddingTop: 10 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: chat.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  channelItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 8, borderRadius: 8,
  },
  channelItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  channelItemName: { fontSize: 15, fontWeight: '500', color: colors.textSilver, flex: 1 },
  memberCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  memberCountText: { fontSize: 11, fontWeight: '600', color: chat.muted },
  channelHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 16 },
  channelHintText: { fontSize: 12, color: chat.muted },
  // Chat header
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: chat.border,
  },
  channelHashBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${chat.primary}20`,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  channelHashText: { fontSize: 18, fontWeight: '900', color: chat.primary },
  chatTitle: { fontSize: 15, fontWeight: '800', color: chat.text },
  chatDesc: { fontSize: 11, color: chat.muted },
  memberPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  memberPillText: { fontSize: 12, fontWeight: '700', color: chat.muted },
  // Messages
  msgListContent: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 8, gap: 2 },
  msgGroup: { flexDirection: 'row', gap: 12, paddingVertical: 3, marginTop: 14 },
  msgAuthorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  msgAuthorName: { fontSize: 14.5, fontWeight: '700' },
  roleBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1 },
  roleText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  meBadge: { backgroundColor: `${chat.primary}22`, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  meText: { fontSize: 9, fontWeight: '800', color: chat.primary, textTransform: 'uppercase' },
  msgTime: { fontSize: 11, color: chat.muted },
  msgPressed: { backgroundColor: colors.surfaceHover, borderRadius: 8, marginHorizontal: -6, paddingHorizontal: 6 },
  msgText: { fontSize: 15, color: chat.text, lineHeight: 22, flexShrink: 1, flexWrap: 'wrap' },
  msgImage: {
    width: 220,
    maxWidth: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.surfaceHover,
  },
  editedTag: { color: chat.muted, fontSize: 11 },
  replyQuote: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 4,
    opacity: 0.85,
  },
  replyQuoteBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: chat.primary,
    alignSelf: 'stretch',
  },
  replyQuoteAuthor: { fontSize: 12, fontWeight: '700', color: chat.primary, marginBottom: 1 },
  replyQuoteText: { fontSize: 12, color: chat.muted, lineHeight: 16 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  reactionPill: {
    backgroundColor: isDark ? 'rgba(167,139,250,0.12)' : 'rgba(58,173,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(167,139,250,0.28)' : 'rgba(58,173,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionText: { fontSize: 13, color: chat.text },
  editBox: { marginTop: 2, gap: 8 },
  editInput: {
    minHeight: 72,
    backgroundColor: chat.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: chat.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: chat.text,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  editCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceHover,
  },
  editCancelText: { color: chat.muted, fontWeight: '700', fontSize: 13 },
  editSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: chat.primary,
  },
  editSaveBtnOff: { opacity: 0.45 },
  editSaveText: { color: chat.primaryForeground, fontWeight: '800', fontSize: 13 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: chat.cardBg,
    borderWidth: 1,
    borderColor: chat.border,
  },
  replyBarAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: chat.primary },
  replyBarLabel: { fontSize: 12, color: chat.muted, fontWeight: '600' },
  replyBarName: { color: chat.primary, fontWeight: '800' },
  replyBarPreview: { fontSize: 13, color: chat.text, marginTop: 2 },
  replyBarClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: chat.cardBg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: chat.border,
  },
  actionPreview: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceHover,
    borderLeftWidth: 3,
    borderLeftColor: chat.primary,
  },
  actionPreviewAuthor: { fontSize: 12, fontWeight: '800', color: chat.primary, marginBottom: 4 },
  actionPreviewText: { fontSize: 14, color: chat.text, lineHeight: 20 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionItemText: { fontSize: 16, fontWeight: '600', color: chat.text },
  actionEmoji: { fontSize: 20, width: 20, textAlign: 'center' },
  actionCancel: { justifyContent: 'center', borderBottomWidth: 0, marginTop: 4 },
  actionCancelText: { fontSize: 16, fontWeight: '700', color: chat.muted, textAlign: 'center', flex: 1 },
  // Emoji
  emojiTray: {
    borderTopWidth: 1, borderTopColor: chat.border, paddingVertical: 8,
  },
  emojiTabs: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 4 },
  emojiTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.surfaceHover },
  emojiTabActive: { backgroundColor: `${chat.primary}22` },
  emojiTabText: { fontSize: 12, fontWeight: '700', color: chat.muted },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  emojiCell: { width: '10%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  emojiChar: { fontSize: 24 },
  pendingImageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: chat.cardBg,
    borderWidth: 1,
    borderColor: chat.border,
  },
  pendingImageThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.surfaceHover,
  },
  pendingImageLabel: { fontSize: 13, fontWeight: '700', color: chat.text },
  pendingImageHint: { fontSize: 11, color: chat.muted, marginTop: 2 },
  pendingImageRemove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHover,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: chat.border,
    backgroundColor: chat.bg,
  },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emojiBtnActive: { backgroundColor: `${chat.primary}15` },
  inputField: {
    flex: 1, minHeight: 42, maxHeight: 130,
    backgroundColor: chat.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: chat.border,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: chat.text,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
    backgroundColor: chat.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: colors.border },
  });
}
