import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';

interface ChatEvent {
  type: 'new' | 'update' | 'delete' | 'channel:new' | 'channel:delete';
  data: any;
}

interface UseChatSocketProps {
  channelId: string | null;
  onEvent: (event: ChatEvent) => void;
  enabled?: boolean;
}

export default function useChatSocket({ 
  channelId, 
  onEvent, 
  enabled = true 
}: UseChatSocketProps) {
  const { socket, isConnected, joinChannel, leaveChannel } = useWebSocket();
  const onEventRef = useRef(onEvent);

  // Keep the latest onEvent function
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !channelId || !socket || !isConnected) return;

    // Join channel
    joinChannel(channelId);

    // Message events with deduplication
    const handleMessageNew = (message: any) => {
      console.log('WebSocket: New message received', message._id);
      onEventRef.current({ type: 'new', data: message });
    };

    const handleMessageUpdate = (message: any) => {
      console.log('WebSocket: Message update received', message._id);
      onEventRef.current({ type: 'update', data: message });
    };

    const handleMessageDelete = (messageId: string) => {
      console.log('WebSocket: Message delete received', messageId);
      onEventRef.current({ type: 'delete', data: messageId });
    };

    const handleChannelNew = (channel: any) => {
      console.log('WebSocket: New channel received', channel._id);
      onEventRef.current({ type: 'channel:new', data: channel });
    };

    const handleChannelDelete = (channelId: string) => {
      console.log('WebSocket: Channel delete received', channelId);
      onEventRef.current({ type: 'channel:delete', data: channelId });
    };

    // Add event listeners
    socket.on('message:new', handleMessageNew);
    socket.on('message:update', handleMessageUpdate);
    socket.on('message:delete', handleMessageDelete);
    socket.on('channel:new', handleChannelNew);
    socket.on('channel:delete', handleChannelDelete);

    // Cleanup function
    return () => {
      if (socket) {
        socket.off('message:new', handleMessageNew);
        socket.off('message:update', handleMessageUpdate);
        socket.off('message:delete', handleMessageDelete);
        socket.off('channel:new', handleChannelNew);
        socket.off('channel:delete', handleChannelDelete);
        
        leaveChannel(channelId);
      }
    };
  }, [channelId, enabled, socket, isConnected, joinChannel, leaveChannel]);

  return socket;
}
