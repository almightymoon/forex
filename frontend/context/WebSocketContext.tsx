'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentChannelRef = useRef<string | null>(null);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found for WebSocket connection');
      return;
    }

    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: false,
      autoConnect: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Global WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Global WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinChannel = (channelId: string) => {
    if (socket && isConnected) {
      // Leave previous channel if any
      if (currentChannelRef.current && currentChannelRef.current !== channelId) {
        socket.emit('leave-channel', { channelId: currentChannelRef.current });
      }
      
      socket.emit('join-channel', { channelId });
      currentChannelRef.current = channelId;
      console.log('Joined channel:', channelId);
    }
  };

  const leaveChannel = (channelId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-channel', { channelId });
      if (currentChannelRef.current === channelId) {
        currentChannelRef.current = null;
      }
      console.log('Left channel:', channelId);
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    joinChannel,
    leaveChannel,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};



