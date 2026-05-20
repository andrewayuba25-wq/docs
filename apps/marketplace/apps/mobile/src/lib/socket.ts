import { io, type Socket } from 'socket.io-client';
import { apiBaseUrl, getAccessToken } from './api';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  const token = await getAccessToken();
  socket = io(`${apiBaseUrl}/realtime`, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
