import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '@quickbuzz/shared';

export type TypedSocket = Socket<ServerEvents, ClientEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io({
      transports: ['websocket'],
      upgrade: false,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 5000,
      forceNew: false,
    }) as TypedSocket;
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
