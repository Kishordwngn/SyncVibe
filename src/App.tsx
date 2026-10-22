import React, { useEffect, useState, useCallback } from 'react';
import {
  Track,
  RoomState,
  ChatMessage,
  FloatingReaction,
  ActiveDrawer,
} from './types/syncvibe';
import { CURATED_INDIAN_SONGS } from './data/curatedSongs';
import { normalizeRoomCode, formatTimestamp } from './utils/syncMath';
import { getSocket } from './services/socket';
import { useYouTubeSync } from './hooks/useYouTubeSync';
import { LobbyScreen } from './components/LobbyScreen';
import { AudioUnlockModal } from './components/AudioUnlockModal';
import { TopHeaderBar } from './components/TopHeaderBar';
import { VinylTurntable } from './components/VinylTurntable';
import { PlayerControls } from './components/PlayerControls';
import { BottomNavDock } from './components/BottomNavDock';
import { SearchDrawer } from './components/drawers/SearchDrawer';
import { QueueDrawer } from './components/drawers/QueueDrawer';
import { ChatDrawer } from './components/drawers/ChatDrawer';
import { CoverArtImage } from './components/CoverArtImage';
import {
  Share2,
  Check,
  UserPlus,
  Heart,
  Play,
  Plus,
  MessageCircleHeart,
  ListMusic,
} from 'lucide-react';

const STORAGE_NAME_KEY = 'syncvibe_nickname';
const STORAGE_AVATAR_KEY = 'syncvibe_avatar';

export default function App() {
  // Parse URL params on initial load
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const urlRoomParam = normalizeRoomCode(searchParams.get('room') || '');
  const isAutostart = searchParams.get('autostart') === '1';

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_NAME_KEY) || 'Aarav';
    }
    return 'Aarav';
  });

  const [avatar, setAvatar] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_AVATAR_KEY) || '🎧';
    }
    return '🎧';
  });

  const [inRoom, setInRoom] = useState<boolean>(() => {
    return Boolean(urlRoomParam) || isAutostart;
  });

  const [roomId, setRoomId] = useState<string>(() => {
    return urlRoomParam || 'LOVE24';
  });

  // When joining via URL link (?room=LOVE24) without ?autostart=1, show AudioUnlockModal
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(() => {
    if (isAutostart) return true;
    if (urlRoomParam) return false;
    return false;
  });

  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('none');
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [partnerTypingName, setPartnerTypingName] = useState<string | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [serverTimeAtSnapshot, setServerTimeAtSnapshot] = useState<number>(Date.now());
  const [copiedDesktopInvite, setCopiedDesktopInvite] = useState<boolean>(false);

  const [roomState, setRoomState] = useState<RoomState>({
    roomId: urlRoomParam || 'LOVE24',
    users: [],
    currentTrack: CURATED_INDIAN_SONGS[0],
    isPlaying: false,
    trackTime: 0,
    lastUpdatedAt: Date.now(),
    queue: [
      CURATED_INDIAN_SONGS[1],
      CURATED_INDIAN_SONGS[8],
      CURATED_INDIAN_SONGS[13],
      CURATED_INDIAN_SONGS[3],
    ],
    messages: [],
    dedication: 'Late Night Lofi with You',
  });

  // Join room over Socket.io when inRoom is true
  useEffect(() => {
    if (!inRoom || !roomId) return;
    const socket = getSocket();

    const emitJoin = () => {
      socket.emit('join_room', {
        roomId,
        userName,
        avatar,
      });
    };

    emitJoin();
    socket.on('connect', emitJoin);

    const handleRoomState = (snapshot: RoomState & { serverTime?: number }) => {
      setRoomState(snapshot);
      if (snapshot.serverTime) {
        setServerTimeAtSnapshot(snapshot.serverTime);
      }
    };

    const handleNewMessage = (msg: ChatMessage) => {
      setRoomState((prev) => {
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, msg],
        };
      });

      setActiveDrawer((currentDrawer) => {
        if (currentDrawer !== 'chat' && msg.senderName !== userName) {
          setUnreadChatCount((c) => c + 1);
        }
        return currentDrawer;
      });
    };

    const handlePartnerTyping = (payload: {
      senderName: string;
      isTyping: boolean;
    }) => {
      if (payload.isTyping && payload.senderName !== userName) {
        setPartnerTypingName(payload.senderName);
      } else {
        setPartnerTypingName(null);
      }
    };

    const handleFloatingReaction = (reaction: FloatingReaction) => {
      setReactions((prev) => [...prev.slice(-18), reaction]);
      window.setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2800);
    };

    socket.on('room_state', handleRoomState);
    socket.on('new_message', handleNewMessage);
    socket.on('partner_typing', handlePartnerTyping);
    socket.on('floating_reaction', handleFloatingReaction);

    return () => {
      socket.off('connect', emitJoin);
      socket.off('room_state', handleRoomState);
      socket.off('new_message', handleNewMessage);
      socket.off('partner_typing', handlePartnerTyping);
      socket.off('floating_reaction', handleFloatingReaction);
    };
  }, [inRoom, roomId, userName, avatar]);

  const handleEnterRoom = (
    targetRoomId: string,
    chosenName: string,
    chosenAvatar: string,
    unlockedDirectly: boolean
  ) => {
    const cleanRoom = normalizeRoomCode(targetRoomId) || 'LOVE24';
    setUserName(chosenName);
    setAvatar(chosenAvatar);
    setRoomId(cleanRoom);
    setAudioUnlocked(unlockedDirectly);
    setInRoom(true);

    try {
      localStorage.setItem(STORAGE_NAME_KEY, chosenName);
      localStorage.setItem(STORAGE_AVATAR_KEY, chosenAvatar);
      const newUrl = `${window.location.pathname}?room=${cleanRoom}`;
      window.history.replaceState({}, '', newUrl);
    } catch {
      // Ignore history/storage errors in restricted frames
    }
  };

  const handleLeaveRoom = () => {
    setInRoom(false);
    setActiveDrawer('none');
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      // Ignore
    }
  };

  const handleTrackEnded = useCallback(() => {
    const socket = getSocket();
    socket.emit('queue_update', {
      roomId,
      action: 'NEXT',
    });
  }, [roomId]);

  const {
    currentTime,
    duration,
    isPlaying,
    isMuted,
    volume,
    syncState,
    driftMs,
    togglePlayPause,
    seekToTime,
    forceManualSync,
    toggleMute,
    changeVolume,
  } = useYouTubeSync({
    inRoom,
    roomId,
    userName,
    currentTrack: roomState.currentTrack,
    serverIsPlaying: roomState.isPlaying,
    serverTrackTime: roomState.trackTime,
    serverLastUpdatedAt: roomState.lastUpdatedAt,
    serverTimeAtSnapshot,
    audioUnlocked,
    onTrackEnded: handleTrackEnded,
  });

  // Socket mutation handlers
  const handleChangeTrack = (track: Track) => {
    const socket = getSocket();
    socket.emit('change_track', {
      roomId,
      track,
      userName,
    });
  };

  const handleAddToQueue = (track: Track) => {
    const socket = getSocket();
    socket.emit('queue_update', {
      roomId,
      action: 'ADD',
      track: {
        ...track,
        id: `q-${track.videoId}-${Date.now()}`,
      },
    });
  };

  const handleRemoveFromQueue = (trackId: string) => {
    const socket = getSocket();
    socket.emit('queue_update', {
      roomId,
      action: 'REMOVE',
      trackId,
    });
  };

  const handlePlayFromQueue = (track: Track) => {
    handleRemoveFromQueue(track.id);
    handleChangeTrack(track);
  };

  const handleSkipNext = () => {
    const socket = getSocket();
    socket.emit('queue_update', {
      roomId,
      action: 'NEXT',
    });
  };

  const handlePreviousOrRestart = () => {
    seekToTime(0);
  };

  const handleSendReaction = (emoji: string) => {
    const socket = getSocket();
    socket.emit('send_reaction', {
      roomId,
      emoji,
      senderName: userName,
    });
  };

  const handleSendMessage = (text: string) => {
    const socket = getSocket();
    socket.emit('send_message', {
      roomId,
      text,
      senderName: userName,
      avatar,
    });
  };

  const handleTypingChange = (isTyping: boolean) => {
    const socket = getSocket();
    socket.emit('typing_status', {
      roomId,
      senderName: userName,
      isTyping,
    });
  };

  const handleUpdateDedication = (dedication: string) => {
    const socket = getSocket();
    socket.emit('update_dedication', {
      roomId,
      dedication,
    });
  };

  const handleToggleDemoPartner = () => {
    const socket = getSocket();
    socket.emit('toggle_demo_partner', {
      roomId,
    });
  };

  const handleSelectTab = (tab: ActiveDrawer) => {
    setActiveDrawer(tab);
    if (tab === 'chat') {
      setUnreadChatCount(0);
    }
  };

  const handleCopyDesktopLink = async () => {
    const link = `${window.location.origin}/?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Ignore
    }
    setCopiedDesktopInvite(true);
    window.setTimeout(() => setCopiedDesktopInvite(false), 2000);
  };

  const hasPartner = roomState.users.length >= 2;

  return (
    <div
      data-state={inRoom ? (isPlaying ? 'playing' : 'paused') : 'lobby'}
      className="relative w-screen h-dvh overflow-hidden bg-[#09090F] flex items-center justify-center select-none"
    >
      {/* Hidden YouTube IFrame Player Container (1x1px, opacity 0.01 so mobile browsers never throttle audio) */}
      <div
        className="fixed -bottom-10 -left-10 w-1 h-1 opacity-[0.01] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div id="syncvibe-hidden-yt-player" />
      </div>

      {/* Dynamic Ambient Album Art Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
      >
        <img
          src={roomState.currentTrack.thumbnail}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover scale-150 blur-3xl opacity-25 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090F]/80 via-[#09090F]/75 to-[#09090F]/95" />
      </div>

      {/* Main Responsive Workspace Container */}
      <div className="relative z-10 w-full h-full lg:max-w-6xl lg:h-[92dvh] lg:px-6 flex items-center justify-center lg:gap-10">
        {/* Primary Mobile Phone App-Shell Frame */}
        <main
          aria-label="SyncVibe Mobile Player App"
          className="relative w-full h-full lg:w-[420px] lg:h-full lg:rounded-[40px] lg:border lg:border-white/15 bg-[#09090F]/85 backdrop-blur-2xl lg:shadow-[0_32px_90px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col shrink-0"
        >
          {!inRoom ? (
            <LobbyScreen
              initialNickname={userName}
              initialAvatar={avatar}
              initialRoomCode={urlRoomParam || 'LOVE24'}
              onEnterRoom={handleEnterRoom}
            />
          ) : (
            <>
              {/* Conditional Mobile Audio Unlock Gate when joining via URL */}
              {!audioUnlocked && (
                <AudioUnlockModal
                  roomId={roomId}
                  currentTrack={roomState.currentTrack}
                  users={roomState.users}
                  onUnlock={() => {
                    setAudioUnlocked(true);
                    forceManualSync();
                  }}
                />
              )}

              {/* 5 Ergonomic Mobile Zones */}
              <div className="flex flex-col justify-between h-full w-full px-5 pt-3.5 pb-5 overflow-hidden">
                {/* Zone A: Top App Bar */}
                <TopHeaderBar
                  roomId={roomId}
                  users={roomState.users}
                  syncState={syncState}
                  driftMs={driftMs}
                  onForceSync={forceManualSync}
                  onToggleDemoPartner={handleToggleDemoPartner}
                  onLeaveRoom={handleLeaveRoom}
                />

                {/* Zone B: Centerpiece Vinyl Turntable Stage */}
                <VinylTurntable
                  currentTrack={roomState.currentTrack}
                  isPlaying={isPlaying}
                  dedication={roomState.dedication}
                  reactions={reactions}
                  onUpdateDedication={handleUpdateDedication}
                  onTogglePlay={togglePlayPause}
                />

                {/* Zone C & Zone D: Track Info, Reactions, Scrubber & Transport */}
                <div className="space-y-3.5">
                  <PlayerControls
                    currentTrack={roomState.currentTrack}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    isMuted={isMuted}
                    volume={volume}
                    onTogglePlay={togglePlayPause}
                    onSeek={seekToTime}
                    onPreviousOrRestart={handlePreviousOrRestart}
                    onNextTrack={handleSkipNext}
                    onToggleMute={toggleMute}
                    onChangeVolume={changeVolume}
                    onSendReaction={handleSendReaction}
                  />

                  {/* Zone E: Bottom Navigation Dock */}
                  <BottomNavDock
                    activeDrawer={activeDrawer}
                    queueCount={roomState.queue.length}
                    unreadChatCount={unreadChatCount}
                    onSelectTab={handleSelectTab}
                  />
                </div>
              </div>

              {/* Slide-Up Bottom Sheet Drawers */}
              <SearchDrawer
                isOpen={activeDrawer === 'search'}
                currentTrack={roomState.currentTrack}
                onClose={() => setActiveDrawer('none')}
                onPlayNow={handleChangeTrack}
                onAddToQueue={handleAddToQueue}
              />

              <QueueDrawer
                isOpen={activeDrawer === 'queue'}
                currentTrack={roomState.currentTrack}
                isPlaying={isPlaying}
                queue={roomState.queue}
                onClose={() => setActiveDrawer('none')}
                onPlayFromQueue={handlePlayFromQueue}
                onRemoveFromQueue={handleRemoveFromQueue}
                onSkipNext={handleSkipNext}
                onOpenSearch={() => setActiveDrawer('search')}
              />

              <ChatDrawer
                isOpen={activeDrawer === 'chat'}
                messages={roomState.messages}
                currentUserName={userName}
                users={roomState.users}
                partnerTypingName={partnerTypingName}
                onClose={() => setActiveDrawer('none')}
                onSendMessage={handleSendMessage}
                onTypingChange={handleTypingChange}
                onToggleDemoPartner={handleToggleDemoPartner}
              />
            </>
          )}
        </main>

        {/* Desktop Companion Panel (Visible on lg: 1440px screens for full multi-column desktop balance) */}
        <aside
          aria-label="Couple Room Companion Studio"
          className="hidden lg:flex flex-col justify-between flex-1 h-full rounded-[36px] bg-[#12121C]/75 backdrop-blur-2xl border border-white/10 p-7 overflow-y-auto no-scrollbar"
        >
          <div className="space-y-6">
            {/* Companion Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#FAFAFC]">
                  SyncVibe Couple Studio
                </h2>
                <p className="text-sm text-[#A1A1AA] mt-1">
                  Real-time WebSocket playback state machine with anti-stutter drift lock (&le; 1.5s tolerance).
                </p>
              </div>
              {inRoom && (
                <button
                  type="button"
                  onClick={handleCopyDesktopLink}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#FF2E63] to-[#8B5CF6] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer shrink-0"
                >
                  {copiedDesktopInvite ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Invite Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Share Room #{roomId}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Active Partners & Sync Telemetry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">
                    Connected Partners
                  </span>
                  <span className="font-mono-tabular text-xs text-[#FAFAFC]">
                    {roomState.users.length} / 2 Active
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {roomState.users.length === 0 ? (
                    <p className="text-xs text-[#A1A1AA]">
                      Enter a room on the left phone view to start listening.
                    </p>
                  ) : (
                    roomState.users.map((u) => (
                      <div
                        key={u.socketId}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{u.avatar}</span>
                          <span className="font-semibold text-[#FAFAFC]">
                            {u.name}
                          </span>
                        </div>
                        <span className="text-[#10B981] font-medium">
                          {u.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {inRoom && (
                  <button
                    type="button"
                    onClick={handleToggleDemoPartner}
                    className="w-full mt-2 h-9 rounded-xl bg-white/[0.07] hover:bg-white/12 text-xs font-semibold text-[#FAFAFC] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span>
                      {hasPartner
                        ? 'Toggle Demo Partner (Ananya 💖)'
                        : 'Pair Demo Partner (Ananya 💖)'}
                    </span>
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">
                    Synchronization Engine
                  </span>
                  <span className="font-mono-tabular text-xs text-[#10B981]">
                    {!inRoom
                      ? 'Ready'
                      : syncState === 'syncing'
                        ? 'Resyncing'
                        : 'Locked'}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1 text-xs text-[#A1A1AA]">
                  <div className="flex justify-between">
                    <span>Room Code</span>
                    <span className="font-mono-tabular text-[#FAFAFC] font-semibold">
                      #{roomId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Live Timestamp</span>
                    <span className="font-mono-tabular text-[#FAFAFC]">
                      {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drift Tolerance</span>
                    <span className="font-mono-tabular text-[#FAFAFC]">
                      &le; 1500ms ({inRoom ? `${driftMs}ms` : '0ms'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instant Curated Bollywood & Indie Picks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#FAFAFC]">
                  Featured Picks &amp; Live YouTube Search
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!inRoom) {
                        handleEnterRoom(roomId, userName, avatar, true);
                      }
                      handleSelectTab('search');
                    }}
                    className="text-xs font-semibold text-[#FF2E63] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Search Any YouTube Song</span>
                  </button>
                  {inRoom && (
                    <>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('queue')}
                        className="text-xs font-semibold text-[#A1A1AA] hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <ListMusic className="w-3.5 h-3.5" />
                        <span>Queue ({roomState.queue.length})</span>
                      </button>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTab('chat')}
                        className="text-xs font-semibold text-[#A1A1AA] hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircleHeart className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {CURATED_INDIAN_SONGS.slice(0, 6).map((song) => {
                  const isActive =
                    roomState.currentTrack.videoId === song.videoId;
                  return (
                    <div
                      key={song.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-colors ${
                        isActive
                          ? 'bg-[#FF2E63]/15 border-[#FF2E63]/40'
                          : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <CoverArtImage
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#FAFAFC] truncate">
                            {song.title}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] truncate">
                            {song.channel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!inRoom) {
                              handleEnterRoom(roomId, userName, avatar, true);
                            }
                            handleChangeTrack(song);
                          }}
                          aria-label={`Play ${song.title}`}
                          className="w-8 h-8 rounded-lg bg-[#FF2E63] text-white flex items-center justify-center cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!inRoom) {
                              handleEnterRoom(roomId, userName, avatar, true);
                            }
                            handleAddToQueue(song);
                          }}
                          aria-label={`Queue ${song.title}`}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Companion Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>
              Open <strong className="text-white">/?room={roomId}</strong> in a second browser tab or phone to test live 2-device sync.
            </span>
            <button
              type="button"
              onClick={() => handleSendReaction('❤️')}
              className="flex items-center gap-1 text-[#FF2E63] font-semibold hover:underline cursor-pointer shrink-0"
            >
              <Heart className="w-3.5 h-3.5 fill-[#FF2E63]" />
              <span>Send Heart Burst</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
