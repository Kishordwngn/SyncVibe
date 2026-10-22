import type {
  RoomState,
  Track,
  ChatMessage,
  FloatingReaction,
} from '../src/types/syncvibe.ts';
import { CURATED_INDIAN_SONGS } from '../src/data/curatedSongs.ts';
import { calculateTargetTrackTime, normalizeRoomCode } from '../src/utils/syncMath.ts';

const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours inactivity cleanup

interface InternalRoomState extends RoomState {
  lastActivityAt: number;
}

export class RoomStore {
  private rooms = new Map<string, InternalRoomState>();

  constructor() {
    // Seed default demo room LOVE24 so deep links work immediately
    this.getOrCreateRoom('LOVE24');
  }

  public getOrCreateRoom(rawRoomId: string): InternalRoomState {
    const roomId = normalizeRoomCode(rawRoomId) || 'LOVE24';
    let room = this.rooms.get(roomId);
    if (!room) {
      const now = Date.now();
      const defaultTrack = CURATED_INDIAN_SONGS[0];
      const initialQueue = [
        CURATED_INDIAN_SONGS[1],
        CURATED_INDIAN_SONGS[8],
        CURATED_INDIAN_SONGS[13],
        CURATED_INDIAN_SONGS[3],
      ];

      room = {
        roomId,
        users: [],
        currentTrack: defaultTrack,
        isPlaying: false,
        trackTime: 0,
        lastUpdatedAt: now,
        queue: initialQueue,
        messages: [
          {
            id: `msg-welcome-${now}`,
            text: 'Welcome to your private SyncVibe room! Share the room code with your partner to listen in real-time sync.',
            senderName: 'SyncVibe',
            avatar: '✨',
            timestamp: now,
            isSystem: true,
          },
        ],
        dedication: 'Late Night Lofi with You',
        lastActivityAt: now,
      };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  public getSnapshot(rawRoomId: string): RoomState & { serverTime: number } {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    const liveTrackTime = calculateTargetTrackTime(
      room.trackTime,
      room.lastUpdatedAt,
      now,
      room.isPlaying,
      room.currentTrack?.duration
    );

    // If track reached the end while playing, auto-advance to next in queue
    if (
      room.isPlaying &&
      room.currentTrack?.duration &&
      liveTrackTime >= room.currentTrack.duration
    ) {
      this.advanceTrack(room.roomId);
      const updatedRoom = this.getOrCreateRoom(rawRoomId);
      return {
        ...updatedRoom,
        serverTime: now,
      };
    }

    return {
      roomId: room.roomId,
      users: room.users,
      currentTrack: room.currentTrack,
      isPlaying: room.isPlaying,
      trackTime: liveTrackTime,
      lastUpdatedAt: now,
      queue: room.queue,
      messages: room.messages,
      dedication: room.dedication,
      serverTime: now,
    };
  }

  public joinRoom(
    rawRoomId: string,
    socketId: string,
    userName: string,
    avatar: string
  ): RoomState & { serverTime: number } {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;

    // Update live trackTime before adding user
    room.trackTime = calculateTargetTrackTime(
      room.trackTime,
      room.lastUpdatedAt,
      now,
      room.isPlaying,
      room.currentTrack?.duration
    );
    room.lastUpdatedAt = now;

    const existingIdx = room.users.findIndex((u) => u.socketId === socketId);
    const cleanName = userName.trim() || 'Listener';
    const cleanAvatar = avatar.trim() || '🎧';

    if (existingIdx >= 0) {
      room.users[existingIdx] = {
        ...room.users[existingIdx],
        name: cleanName,
        avatar: cleanAvatar,
        status: 'Synced',
      };
    } else {
      room.users.push({
        socketId,
        name: cleanName,
        avatar: cleanAvatar,
        joinedAt: now,
        status: 'Synced',
      });
    }

    return this.getSnapshot(room.roomId);
  }

  public removeUserBySocket(socketId: string): string[] {
    const affectedRooms: string[] = [];
    const now = Date.now();

    for (const [roomId, room] of this.rooms.entries()) {
      const beforeCount = room.users.length;
      room.users = room.users.filter((u) => u.socketId !== socketId);
      if (room.users.length !== beforeCount) {
        room.lastActivityAt = now;
        affectedRooms.push(roomId);
      }
    }

    return affectedRooms;
  }

  public applyPlayerAction(
    rawRoomId: string,
    action: 'PLAY' | 'PAUSE' | 'SEEK',
    trackTime: number
  ) {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;

    const safeTime = Math.max(
      0,
      Math.min(
        Number.isFinite(trackTime) ? trackTime : 0,
        room.currentTrack?.duration || 3600
      )
    );

    if (action === 'PLAY') {
      room.trackTime = safeTime;
      room.isPlaying = true;
      room.lastUpdatedAt = now;
    } else if (action === 'PAUSE') {
      room.trackTime = safeTime;
      room.isPlaying = false;
      room.lastUpdatedAt = now;
    } else if (action === 'SEEK') {
      room.trackTime = safeTime;
      room.lastUpdatedAt = now;
    }

    return {
      action,
      trackTime: room.trackTime,
      isPlaying: room.isPlaying,
      lastUpdatedAt: room.lastUpdatedAt,
      serverTime: now,
    };
  }

  public changeTrack(rawRoomId: string, track: Track) {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;
    room.currentTrack = track;
    room.trackTime = 0;
    room.isPlaying = true;
    room.lastUpdatedAt = now;
    return this.getSnapshot(room.roomId);
  }

  public advanceTrack(rawRoomId: string) {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;

    if (room.queue.length > 0) {
      const nextTrack = room.queue.shift()!;
      room.currentTrack = nextTrack;
    } else {
      const currentIndex = CURATED_INDIAN_SONGS.findIndex(
        (s) => s.videoId === room.currentTrack?.videoId
      );
      const nextIndex = (currentIndex + 1) % CURATED_INDIAN_SONGS.length;
      room.currentTrack = CURATED_INDIAN_SONGS[nextIndex];
    }

    room.trackTime = 0;
    room.isPlaying = true;
    room.lastUpdatedAt = now;
    return this.getSnapshot(room.roomId);
  }

  public updateQueue(
    rawRoomId: string,
    action: 'ADD' | 'REMOVE' | 'NEXT' | 'CLEAR',
    track?: Track,
    trackId?: string
  ) {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;

    if (action === 'ADD' && track) {
      // Idempotency guard: prevent exact duplicate IDs
      const uniqueTrack: Track = {
        ...track,
        id: track.id || `q-${track.videoId}-${now}`,
      };
      if (!room.queue.some((item) => item.id === uniqueTrack.id)) {
        room.queue.push(uniqueTrack);
      }
    } else if (action === 'REMOVE' && trackId) {
      room.queue = room.queue.filter(
        (item) => item.id !== trackId && item.videoId !== trackId
      );
    } else if (action === 'NEXT') {
      return this.advanceTrack(room.roomId);
    } else if (action === 'CLEAR') {
      room.queue = [];
    }

    return this.getSnapshot(room.roomId);
  }

  public addMessage(
    rawRoomId: string,
    text: string,
    senderName: string,
    avatar: string,
    senderSocketId?: string
  ): ChatMessage {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;

    const message: ChatMessage = {
      id: `msg-${now}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      senderName: senderName.trim() || 'Partner',
      senderSocketId,
      avatar: avatar || '💖',
      timestamp: now,
    };

    room.messages.push(message);
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    return message;
  }

  public updateDedication(rawRoomId: string, dedication: string) {
    const room = this.getOrCreateRoom(rawRoomId);
    room.lastActivityAt = Date.now();
    room.dedication = dedication.trim().slice(0, 60) || 'Late Night Lofi with You';
    return this.getSnapshot(room.roomId);
  }

  public toggleDemoPartner(rawRoomId: string, enable?: boolean) {
    const room = this.getOrCreateRoom(rawRoomId);
    const now = Date.now();
    room.lastActivityAt = now;

    const botIndex = room.users.findIndex((u) => u.isPartnerBot);
    const shouldEnable = typeof enable === 'boolean' ? enable : botIndex === -1;

    if (shouldEnable && botIndex === -1) {
      room.users.push({
        socketId: `partner-bot-${room.roomId}`,
        name: 'Ananya',
        avatar: '💖',
        joinedAt: now,
        status: 'Synced',
        isPartnerBot: true,
      });
    } else if (!shouldEnable && botIndex !== -1) {
      room.users.splice(botIndex, 1);
    }

    return {
      snapshot: this.getSnapshot(room.roomId),
      partnerAdded: shouldEnable && botIndex === -1,
    };
  }

  public createReaction(
    emoji: string,
    senderName: string
  ): FloatingReaction {
    const now = Date.now();
    const xOffset = Math.floor(15 + Math.random() * 70);
    return {
      id: `react-${now}-${Math.random().toString(36).slice(2, 7)}`,
      emoji: emoji || '❤️',
      senderName: senderName || 'Partner',
      xOffset,
      createdAt: now,
    };
  }

  public cleanupInactiveRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (roomId === 'LOVE24') continue;
      const realUsers = room.users.filter((u) => !u.isPartnerBot);
      if (realUsers.length === 0 && now - room.lastActivityAt > ROOM_TTL_MS) {
        this.rooms.delete(roomId);
      }
    }
  }
}
