import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { RoomStore } from './server/roomStore.ts';
import { CURATED_INDIAN_SONGS, filterCuratedSongs } from './src/data/curatedSongs.ts';
import { normalizeRoomCode, parseYouTubeDuration } from './src/utils/syncMath.ts';
import type { Track } from './src/types/syncvibe.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function searchLiveYouTube(query: string, category?: string): Promise<Track[]> {
  const searchTerms = query.trim();
  if (!searchTerms) return [];

  const fullQuery =
    category && category !== 'All' && !searchTerms.toLowerCase().includes('song')
      ? `${searchTerms} ${category} song`
      : searchTerms;

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(fullQuery)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube search HTTP ${response.status}`);
  }

  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/);
  if (!match || !match[1]) {
    return [];
  }

  const data = JSON.parse(match[1]);
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];

  const tracks: Track[] = [];
  const seenIds = new Set<string>();

  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v || !v.videoId || seenIds.has(v.videoId)) continue;

      // Skip live streams without lengthText
      const durationText = v.lengthText?.simpleText;
      if (!durationText) continue;

      const title =
        v.title?.runs?.map((r: any) => r.text).join('') ||
        v.title?.simpleText ||
        'YouTube Song';
      const channel =
        v.ownerText?.runs?.[0]?.text ||
        v.longBylineText?.runs?.[0]?.text ||
        'YouTube Music';

      seenIds.add(v.videoId);
      tracks.push({
        id: `yt-live-${v.videoId}`,
        videoId: v.videoId,
        title,
        channel,
        thumbnail: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
        duration: parseYouTubeDuration(durationText),
        category: (category as any) || 'Romantic Hits',
      });

      if (tracks.length >= 20) break;
    }
    if (tracks.length >= 20) break;
  }

  return tracks;
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  app.use(cors());
  app.use(express.json());

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const roomStore = new RoomStore();

  // Periodic cleanup of empty rooms after 2 hours of inactivity
  setInterval(() => {
    roomStore.cleanupInactiveRooms();
  }, 15 * 60 * 1000);

  // REST API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SyncVibe Real-Time Audio Sync Engine' });
  });

  app.get('/api/songs', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const category = typeof req.query.category === 'string' ? (req.query.category as any) : 'All';
    res.json({ songs: filterCuratedSongs(q, category) });
  });

  // Live YouTube Search endpoint (Zero-API-Key required, searches all of YouTube)
  app.get('/api/youtube-search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';

    if (!q) {
      res.json({
        tracks: filterCuratedSongs('', category as any),
        source: 'curated_catalog',
      });
      return;
    }

    try {
      const liveTracks = await searchLiveYouTube(q, category);
      if (liveTracks.length > 0) {
        res.json({
          tracks: liveTracks,
          source: 'youtube_live',
        });
        return;
      }
    } catch {
      // Fall back to curated catalog if network is offline
    }

    res.json({
      tracks: filterCuratedSongs(q, category as any),
      source: 'curated_catalog',
    });
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    const roomId = normalizeRoomCode(req.params.roomId);
    const snapshot = roomStore.getSnapshot(roomId);
    res.json(snapshot);
  });

  // oEmbed metadata proxy for pasted YouTube links
  app.get('/api/oembed', async (req, res) => {
    const videoId = typeof req.query.videoId === 'string' ? req.query.videoId.trim() : '';
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      res.status(400).json({ error: 'Invalid YouTube videoId' });
      return;
    }

    // Check if it's already in our curated catalog
    const existing = CURATED_INDIAN_SONGS.find((s) => s.videoId === videoId);
    if (existing) {
      res.json(existing);
      return;
    }

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = (await response.json()) as { title?: string; author_name?: string };
        res.json({
          id: `yt-${videoId}-${Date.now()}`,
          videoId,
          title: data.title || `YouTube Track (${videoId})`,
          channel: data.author_name || 'YouTube Music',
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: 240,
          category: 'Romantic Hits',
        });
        return;
      }
    } catch {
      // Fallback below if external fetch is blocked
    }

    res.json({
      id: `yt-${videoId}-${Date.now()}`,
      videoId,
      title: `YouTube Track (${videoId})`,
      channel: 'YouTube Direct Link',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 240,
      category: 'Romantic Hits',
    });
  });

  // Socket.io Real-Time Event Contract
  io.on('connection', (socket) => {
    socket.on(
      'join_room',
      (payload: { roomId: string; userName: string; avatar: string }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        socket.join(roomId);

        const state = roomStore.joinRoom(
          roomId,
          socket.id,
          payload?.userName || 'Aarav',
          payload?.avatar || '🎧'
        );

        io.to(roomId).emit('room_state', state);
      }
    );

    socket.on(
      'player_action',
      (payload: {
        roomId: string;
        action: 'PLAY' | 'PAUSE' | 'SEEK';
        trackTime: number;
        userName?: string;
      }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const syncResult = roomStore.applyPlayerAction(
          roomId,
          payload.action,
          payload.trackTime
        );

        io.to(roomId).emit('sync_playback', {
          ...syncResult,
          triggeredBy: payload.userName || socket.id,
        });
      }
    );

    socket.on(
      'change_track',
      (payload: { roomId: string; track: any; userName?: string }) => {
        if (!payload?.track) return;
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const state = roomStore.changeTrack(roomId, payload.track);
        io.to(roomId).emit('room_state', state);
        io.to(roomId).emit('sync_playback', {
          action: 'PLAY',
          trackTime: 0,
          isPlaying: true,
          lastUpdatedAt: state.lastUpdatedAt,
          serverTime: state.serverTime,
          triggeredBy: payload.userName || socket.id,
        });
      }
    );

    socket.on(
      'queue_update',
      (payload: {
        roomId: string;
        action: 'ADD' | 'REMOVE' | 'NEXT' | 'CLEAR';
        track?: any;
        trackId?: string;
      }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const state = roomStore.updateQueue(
          roomId,
          payload.action,
          payload.track,
          payload.trackId
        );
        io.to(roomId).emit('room_state', state);
      }
    );

    socket.on(
      'send_message',
      (payload: {
        roomId: string;
        text: string;
        senderName: string;
        avatar: string;
      }) => {
        if (!payload?.text?.trim()) return;
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const msg = roomStore.addMessage(
          roomId,
          payload.text,
          payload.senderName,
          payload.avatar,
          socket.id
        );
        io.to(roomId).emit('new_message', msg);

        // If the user has enabled the Demo Partner Companion in this room, send a warm reply
        const snapshot = roomStore.getSnapshot(roomId);
        const hasBot = snapshot.users.some((u) => u.isPartnerBot);
        if (hasBot && payload.senderName !== 'Ananya') {
          setTimeout(() => {
            io.to(roomId).emit('partner_typing', {
              senderName: 'Ananya',
              isTyping: true,
            });
          }, 450);

          setTimeout(() => {
            io.to(roomId).emit('partner_typing', {
              senderName: 'Ananya',
              isTyping: false,
            });
            const replies = [
              `Listening to "${snapshot.currentTrack.title.split('—')[0].trim()}" with you feels so special 💖`,
              'This beat drop + late night vibes with you >>> 🥺✨',
              'Add your favorite Arijit or Anuv Jain track to our queue next! 🎶',
              'Right here in sync with you! Sending you a million hearts ❤️🔥',
            ];
            const replyText =
              replies[Math.floor(Math.random() * replies.length)];
            const botMsg = roomStore.addMessage(
              roomId,
              replyText,
              'Ananya',
              '💖',
              `partner-bot-${roomId}`
            );
            io.to(roomId).emit('new_message', botMsg);
            const reaction = roomStore.createReaction('❤️', 'Ananya');
            io.to(roomId).emit('floating_reaction', reaction);
          }, 1600);
        }
      }
    );

    socket.on(
      'typing_status',
      (payload: { roomId: string; senderName: string; isTyping: boolean }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        socket.to(roomId).emit('partner_typing', {
          senderName: payload.senderName,
          isTyping: Boolean(payload.isTyping),
        });
      }
    );

    socket.on(
      'send_reaction',
      (payload: { roomId: string; emoji: string; senderName: string }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const reaction = roomStore.createReaction(
          payload?.emoji || '❤️',
          payload?.senderName || 'Partner'
        );
        io.to(roomId).emit('floating_reaction', reaction);
      }
    );

    socket.on(
      'update_dedication',
      (payload: { roomId: string; dedication: string }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const state = roomStore.updateDedication(
          roomId,
          payload?.dedication || ''
        );
        io.to(roomId).emit('room_state', state);
      }
    );

    socket.on(
      'toggle_demo_partner',
      (payload: { roomId: string; enable?: boolean }) => {
        const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
        const { snapshot, partnerAdded } = roomStore.toggleDemoPartner(
          roomId,
          payload?.enable
        );
        io.to(roomId).emit('room_state', snapshot);

        if (partnerAdded) {
          const welcomeMsg = roomStore.addMessage(
            roomId,
            'Hey! Just joined your room and synced my headphones 💖 What are we listening to tonight?',
            'Ananya',
            '💖',
            `partner-bot-${roomId}`
          );
          io.to(roomId).emit('new_message', welcomeMsg);
          io.to(roomId).emit(
            'floating_reaction',
            roomStore.createReaction('💖', 'Ananya')
          );
        }
      }
    );

    socket.on('heartbeat_check', (payload: { roomId: string }) => {
      const roomId = normalizeRoomCode(payload?.roomId || 'LOVE24');
      const snapshot = roomStore.getSnapshot(roomId);
      socket.emit('sync_playback', {
        action: 'HEARTBEAT',
        trackTime: snapshot.trackTime,
        isPlaying: snapshot.isPlaying,
        lastUpdatedAt: snapshot.lastUpdatedAt,
        serverTime: snapshot.serverTime,
        triggeredBy: 'server_heartbeat',
      });
    });

    socket.on('disconnect', () => {
      const affectedRooms = roomStore.removeUserBySocket(socket.id);
      for (const roomId of affectedRooms) {
        const snapshot = roomStore.getSnapshot(roomId);
        io.to(roomId).emit('room_state', snapshot);
      }
    });
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SyncVibe Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
