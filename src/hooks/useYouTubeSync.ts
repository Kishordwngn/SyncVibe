import { useEffect, useRef, useState, useCallback } from 'react';
import { Track, SyncPlaybackPayload } from '../types/syncvibe';
import {
  calculateTargetTrackTime,
  calculateDriftSeconds,
  shouldTriggerHardSeek,
  REMOTE_UPDATE_COOLDOWN_MS,
  HEARTBEAT_INTERVAL_MS,
} from '../utils/syncMath';
import { getSocket } from '../services/socket';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface UseYouTubeSyncOptions {
  inRoom: boolean;
  roomId: string;
  userName: string;
  currentTrack: Track;
  serverIsPlaying: boolean;
  serverTrackTime: number;
  serverLastUpdatedAt: number;
  serverTimeAtSnapshot: number;
  audioUnlocked: boolean;
  onTrackEnded: () => void;
}

export function useYouTubeSync({
  inRoom,
  roomId,
  userName,
  currentTrack,
  serverIsPlaying,
  serverTrackTime,
  serverLastUpdatedAt,
  serverTimeAtSnapshot,
  audioUnlocked,
  onTrackEnded,
}: UseYouTubeSyncOptions) {
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const isApplyingRemoteState = useRef<boolean>(false);
  const remoteCooldownTimer = useRef<number | null>(null);
  const clockOffsetRef = useRef<number>(0); // serverTime - clientNow

  // Authoritative sync anchor refs
  const syncAnchorRef = useRef({
    trackTime: serverTrackTime,
    lastUpdatedAt: serverLastUpdatedAt,
    isPlaying: serverIsPlaying,
    duration: currentTrack?.duration || 240,
    videoId: currentTrack?.videoId || 'Umqb9KENgmk',
  });

  const [currentTime, setCurrentTime] = useState<number>(serverTrackTime);
  const [duration, setDuration] = useState<number>(currentTrack?.duration || 240);
  const [isPlaying, setIsPlaying] = useState<boolean>(serverIsPlaying);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(85);
  const [syncState, setSyncState] = useState<'synced' | 'syncing'>('synced');
  const [driftMs, setDriftMs] = useState<number>(0);

  // Keep clock offset and anchor updated when room snapshot changes
  useEffect(() => {
    if (serverTimeAtSnapshot) {
      clockOffsetRef.current = serverTimeAtSnapshot - Date.now();
    }
    syncAnchorRef.current = {
      trackTime: serverTrackTime,
      lastUpdatedAt: serverLastUpdatedAt,
      isPlaying: inRoom ? serverIsPlaying : false,
      duration: currentTrack?.duration || 240,
      videoId: currentTrack?.videoId,
    };
    setIsPlaying(inRoom ? serverIsPlaying : false);
    setCurrentTime(inRoom ? serverTrackTime : 0);
    setDuration(currentTrack?.duration || 240);
  }, [
    inRoom,
    serverTrackTime,
    serverLastUpdatedAt,
    serverIsPlaying,
    serverTimeAtSnapshot,
    currentTrack?.duration,
    currentTrack?.videoId,
  ]);

  const markRemoteUpdateGuard = useCallback(() => {
    isApplyingRemoteState.current = true;
    if (remoteCooldownTimer.current) {
      window.clearTimeout(remoteCooldownTimer.current);
    }
    remoteCooldownTimer.current = window.setTimeout(() => {
      isApplyingRemoteState.current = false;
    }, REMOTE_UPDATE_COOLDOWN_MS);
  }, []);

  const getEstimatedServerNow = useCallback(() => {
    return Date.now() + clockOffsetRef.current;
  }, []);

  const getExpectedRoomTime = useCallback(() => {
    if (!inRoom) return 0;
    const anchor = syncAnchorRef.current;
    return calculateTargetTrackTime(
      anchor.trackTime,
      anchor.lastUpdatedAt,
      getEstimatedServerNow(),
      anchor.isPlaying,
      anchor.duration
    );
  }, [inRoom, getEstimatedServerNow]);

  // Apply remote state to the underlying YouTube IFrame player if ready
  const applyStateToYouTubePlayer = useCallback(
    (targetTime: number, shouldPlay: boolean, forceSeek: boolean = false) => {
      const player = playerRef.current;
      if (!player || !playerReadyRef.current) return;

      try {
        const playerState =
          typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
        const ytCurrentTime =
          playerState === 1 && typeof player.getCurrentTime === 'function'
            ? player.getCurrentTime()
            : targetTime;
        const drift = calculateDriftSeconds(ytCurrentTime, targetTime);
        setDriftMs(Math.round(drift * 1000));

        if (forceSeek || shouldTriggerHardSeek(ytCurrentTime, targetTime)) {
          setSyncState('syncing');
          markRemoteUpdateGuard();
          if (typeof player.seekTo === 'function') {
            player.seekTo(targetTime, true);
          }
          window.setTimeout(() => setSyncState('synced'), 450);
        } else {
          setSyncState('synced');
        }

        // YT.PlayerState.PLAYING === 1, PAUSED === 2
        if (inRoom && shouldPlay && audioUnlocked && playerState !== 1) {
          markRemoteUpdateGuard();
          player.playVideo?.();
        } else if ((!inRoom || !shouldPlay) && playerState === 1) {
          markRemoteUpdateGuard();
          player.pauseVideo?.();
        }
      } catch {
        // Ignore transient YouTube IFrame postMessage readiness errors
      }
    },
    [inRoom, audioUnlocked, markRemoteUpdateGuard]
  );

  // Load YouTube IFrame API script and mount hidden player
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player('syncvibe-hidden-yt-player', {
          height: '1',
          width: '1',
          videoId: currentTrack.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              playerReadyRef.current = true;
              try {
                event.target.setVolume(volume);
                if (syncAnchorRef.current.isPlaying) {
                  const targetTime = getExpectedRoomTime();
                  applyStateToYouTubePlayer(targetTime, true, true);
                } else {
                  event.target.pauseVideo?.();
                }
              } catch {
                // Ignore
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              const YTState = window.YT?.PlayerState;
              if (!YTState) return;

              if (event.data === YTState.ENDED) {
                onTrackEnded();
                return;
              }

              // Update duration from YT player only when actively playing if track duration was default
              if (event.data === YTState.PLAYING) {
                const ytDur = event.target?.getDuration?.();
                if (ytDur && ytDur > 0 && syncAnchorRef.current.duration === 240) {
                  setDuration(Math.floor(ytDur));
                }
              }

              if (isApplyingRemoteState.current) {
                return;
              }
            },
          },
        });
      } catch {
        // Fallback timer still maintains playback time
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.getElementById('youtube-iframe-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Load new videoId when currentTrack changes
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;

    try {
      markRemoteUpdateGuard();
      if (inRoom && syncAnchorRef.current.isPlaying && audioUnlocked) {
        player.loadVideoById?.({
          videoId: currentTrack.videoId,
          startSeconds: 0,
        });
      } else {
        player.cueVideoById?.({
          videoId: currentTrack.videoId,
          startSeconds: 0,
        });
      }
      setCurrentTime(0);
      setDuration(currentTrack.duration || 240);
    } catch {
      // Ignore
    }
  }, [inRoom, currentTrack.videoId, audioUnlocked, markRemoteUpdateGuard]);

  // Listen to Socket.io sync_playback broadcasts
  useEffect(() => {
    const socket = getSocket();

    const handleSyncPlayback = (payload: SyncPlaybackPayload) => {
      if (payload.serverTime) {
        clockOffsetRef.current = payload.serverTime - Date.now();
      }

      syncAnchorRef.current = {
        ...syncAnchorRef.current,
        trackTime: payload.trackTime,
        lastUpdatedAt: payload.lastUpdatedAt,
        isPlaying: payload.isPlaying,
      };

      setIsPlaying(payload.isPlaying);

      const expectedTime = calculateTargetTrackTime(
        payload.trackTime,
        payload.lastUpdatedAt,
        getEstimatedServerNow(),
        payload.isPlaying,
        syncAnchorRef.current.duration
      );

      if (payload.action === 'SEEK') {
        setCurrentTime(expectedTime);
        applyStateToYouTubePlayer(expectedTime, payload.isPlaying, true);
      } else if (payload.action === 'PLAY' || payload.action === 'PAUSE') {
        setCurrentTime(expectedTime);
        applyStateToYouTubePlayer(expectedTime, payload.isPlaying, false);
      } else if (payload.action === 'HEARTBEAT') {
        // Only snap if drift > 1.5s (Anti-Stutter Rule)
        setCurrentTime((prev) => {
          const drift = calculateDriftSeconds(prev, expectedTime);
          setDriftMs(Math.round(drift * 1000));
          if (shouldTriggerHardSeek(prev, expectedTime)) {
            applyStateToYouTubePlayer(expectedTime, payload.isPlaying, true);
            return expectedTime;
          }
          return prev;
        });
      }
    };

    socket.on('sync_playback', handleSyncPlayback);
    return () => {
      socket.off('sync_playback', handleSyncPlayback);
    };
  }, [applyStateToYouTubePlayer, getEstimatedServerNow]);

  // Smooth local progress ticker (every 250ms) + Track End check
  useEffect(() => {
    const interval = window.setInterval(() => {
      const anchor = syncAnchorRef.current;
      if (!anchor.isPlaying) return;

      const expected = getExpectedRoomTime();
      setCurrentTime(expected);

      if (anchor.duration > 0 && expected >= anchor.duration) {
        onTrackEnded();
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [getExpectedRoomTime, onTrackEnded]);

  // Every 3000ms heartbeat check + visibilitychange resync
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();

    const heartbeatTimer = window.setInterval(() => {
      socket.emit('heartbeat_check', { roomId });
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setSyncState('syncing');
        socket.emit('heartbeat_check', { roomId });
        const expected = getExpectedRoomTime();
        setCurrentTime(expected);
        applyStateToYouTubePlayer(expected, syncAnchorRef.current.isPlaying, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, getExpectedRoomTime, applyStateToYouTubePlayer]);

  // Trigger unlock & sync when user taps AudioUnlockModal
  useEffect(() => {
    if (audioUnlocked) {
      const expected = getExpectedRoomTime();
      setCurrentTime(expected);
      applyStateToYouTubePlayer(expected, syncAnchorRef.current.isPlaying, true);
    }
  }, [audioUnlocked, getExpectedRoomTime, applyStateToYouTubePlayer]);

  // User-initiated controls
  const togglePlayPause = useCallback(() => {
    const socket = getSocket();
    const nextPlaying = !isPlaying;
    const liveTime = getExpectedRoomTime();

    syncAnchorRef.current = {
      ...syncAnchorRef.current,
      trackTime: liveTime,
      lastUpdatedAt: getEstimatedServerNow(),
      isPlaying: nextPlaying,
    };

    setIsPlaying(nextPlaying);
    setCurrentTime(liveTime);
    applyStateToYouTubePlayer(liveTime, nextPlaying, false);

    socket.emit('player_action', {
      roomId,
      action: nextPlaying ? 'PLAY' : 'PAUSE',
      trackTime: liveTime,
      userName,
    });
  }, [
    isPlaying,
    getExpectedRoomTime,
    getEstimatedServerNow,
    applyStateToYouTubePlayer,
    roomId,
    userName,
  ]);

  const seekToTime = useCallback(
    (newTimeSeconds: number) => {
      const socket = getSocket();
      const clamped = Math.max(0, Math.min(newTimeSeconds, duration || 240));

      syncAnchorRef.current = {
        ...syncAnchorRef.current,
        trackTime: clamped,
        lastUpdatedAt: getEstimatedServerNow(),
      };

      setCurrentTime(clamped);
      applyStateToYouTubePlayer(clamped, isPlaying, true);

      socket.emit('player_action', {
        roomId,
        action: 'SEEK',
        trackTime: clamped,
        userName,
      });
    },
    [duration, getEstimatedServerNow, applyStateToYouTubePlayer, isPlaying, roomId, userName]
  );

  const forceManualSync = useCallback(() => {
    setSyncState('syncing');
    const socket = getSocket();
    socket.emit('heartbeat_check', { roomId });
    const expected = getExpectedRoomTime();
    setCurrentTime(expected);
    applyStateToYouTubePlayer(expected, syncAnchorRef.current.isPlaying, true);
    window.setTimeout(() => setSyncState('synced'), 450);
  }, [roomId, getExpectedRoomTime, applyStateToYouTubePlayer]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const player = playerRef.current;
    if (player && playerReadyRef.current) {
      try {
        if (nextMuted) {
          player.mute?.();
        } else {
          player.unMute?.();
          player.setVolume?.(volume);
        }
      } catch {
        // Ignore
      }
    }
  }, [isMuted, volume]);

  const changeVolume = useCallback(
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(100, newVol));
      setVolume(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
      const player = playerRef.current;
      if (player && playerReadyRef.current) {
        try {
          player.unMute?.();
          player.setVolume?.(clamped);
        } catch {
          // Ignore
        }
      }
    },
    [isMuted]
  );

  return {
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
  };
}
