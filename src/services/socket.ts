import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  public getSocket(): Socket {
    if (!this.socket) {
      const serverUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }
    return this.socket;
  }
}

export const socketService = new SocketService();
export const getSocket = () => socketService.getSocket();
