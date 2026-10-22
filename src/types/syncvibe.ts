export type MoodCategory =
  | 'All'
  | 'Romantic Hits'
  | 'Bollywood Lofi'
  | 'Indie Vibes'
  | '90s Classics'
  | 'Punjabi Vibes'
  | 'Late Night';

export interface Track {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number; // in seconds
  category?: MoodCategory;
  language?: string;
  year?: string;
}

export interface RoomUser {
  socketId: string;
  name: string;
  avatar: string;
  joinedAt: number;
  status: 'Synced' | 'Buffering' | 'Online';
  isPartnerBot?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderSocketId?: string;
  avatar: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xOffset: number; // percentage 12..88
  createdAt?: number;
}

export interface RoomState {
  roomId: string;
  users: RoomUser[];
  currentTrack: Track;
  isPlaying: boolean;
  trackTime: number; // T_host in seconds
  lastUpdatedAt: number; // t_updated in ms (server timestamp)
  queue: Track[];
  messages: ChatMessage[];
  dedication: string;
}

export interface SyncPlaybackPayload {
  action: 'PLAY' | 'PAUSE' | 'SEEK' | 'HEARTBEAT';
  trackTime: number;
  isPlaying: boolean;
  lastUpdatedAt: number;
  serverTime: number;
  triggeredBy: string;
}

export type ActiveDrawer = 'none' | 'search' | 'queue' | 'chat';
