import React from 'react';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '💯', '🙌'];

export type MessageReaction = {
  emoji: string;
  count: number;
  users: Array<string | { _id: string }>;
};

export function reactionUserIds(reaction: MessageReaction): string[] {
  return (reaction.users || []).map((u) => (typeof u === 'string' ? u : u._id));
}

export function userReacted(reaction: MessageReaction, userId?: string) {
  if (!userId) return false;
  return reactionUserIds(reaction).includes(userId);
}

export function renderMessageContent(content: string) {
  const parts = content.split(/(@[A-Za-z][\w.-]{0,40})/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={`${part}-${index}`} className="teacher-community__mention">
          {part}
        </span>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

export function getMentionQuery(input: string, cursor: number) {
  const before = input.slice(0, cursor);
  const match = before.match(/@([A-Za-z][\w.-]{0,40})$/);
  if (!match) return null;
  return match[1].toLowerCase();
}

export function insertMention(input: string, cursor: number, handle: string) {
  const before = input.slice(0, cursor);
  const after = input.slice(cursor);
  const replaced = before.replace(/@([A-Za-z][\w.-]{0,40})$/, `@${handle} `);
  return { value: `${replaced}${after}`, cursor: replaced.length };
}

export function readLastReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('teacher-community-last-read') || '{}');
  } catch {
    return {};
  }
}

export function writeLastRead(channelId: string, iso: string) {
  const map = readLastReadMap();
  map[channelId] = iso;
  localStorage.setItem('teacher-community-last-read', JSON.stringify(map));
}
