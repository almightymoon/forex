import { getAuthToken } from './api';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://thefxnavigators.com';

let socket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null;

export async function getChatSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    try {
      const token = await getAuthToken();
      if (!token) return null;

      if (socket) {
        socket.disconnect();
        socket = null;
      }

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      return new Promise<Socket | null>((resolve) => {
        const s = socket!;
        const onConnect = () => {
          cleanup();
          resolve(s);
        };
        const onError = () => {
          cleanup();
          resolve(null);
        };
        const cleanup = () => {
          s.off('connect', onConnect);
          s.off('connect_error', onError);
        };
        s.on('connect', onConnect);
        s.on('connect_error', onError);
        setTimeout(() => {
          cleanup();
          resolve(s.connected ? s : null);
        }, 8000);
      });
    } catch {
      return null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export function joinChannel(channelId: string) {
  socket?.emit('join-channel', { channelId });
}

export function leaveChannel(channelId: string) {
  socket?.emit('leave-channel', { channelId });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
