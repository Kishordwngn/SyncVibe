import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
} from 'lucide-react';
import { Track } from '../types/syncvibe';
import { formatTimestamp } from '../utils/syncMath';

const QUICK_REACTIONS = ['❤️', '🔥', '🥺', '✨', '🥰'];

interface PlayerControlsProps {
  currentTrack: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onPreviousOrRestart: () => void;
  onNextTrack: () => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onSendReaction: (emoji: string) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume,
  onTogglePlay,
  onSeek,
  onPreviousOrRestart,
  onNextTrack,
  onToggleMute,
  onChangeVolume,
  onSendReaction,
}) => {
  const [showVolumePopover, setShowVolumePopover] = useState(false);

  const safeDuration = Math.max(1, duration || currentTrack.duration || 240);
  const clampedCurrent = Math.min(Math.max(0, currentTime), safeDuration);
  const progressPercent = Math.min(100, (clampedCurrent / safeDuration) * 100);

  const triggerReaction = (emoji: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {
        // Ignore on unsupported browsers
      }
    }
    onSendReaction(emoji);
  };

  return (
    <div className="w-full space-y-3 shrink-0">
      {/* Zone C: Track Info & Quick Reaction Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2
            className="text-lg sm:text-xl font-bold text-[#FAFAFC] truncate tracking-tight"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h2>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#A1A1AA] truncate mt-0.5">
            <span className="truncate">{currentTrack.channel}</span>
            {currentTrack.category && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-400 shrink-0">{currentTrack.category}</span>
              </>
            )}
          </div>
        </div>

        {/* Primary Heart Burst Button */}
        <button
          type="button"
          onClick={() => triggerReaction('❤️')}
          aria-label="Send Heart Reaction"
          className="w-11 h-11 rounded-2xl bg-[#FF2E63]/15 hover:bg-[#FF2E63]/25 border border-[#FF2E63]/30 flex items-center justify-center text-[#FF2E63] active:scale-90 transition-all shrink-0 cursor-pointer"
        >
          <Heart className="w-5 h-5 fill-[#FF2E63]" />
        </button>
      </div>

      {/* 5-Emoji 1-Tap Couple Reaction Strip */}
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
        <span className="text-[11px] font-medium text-[#A1A1AA] pl-1 whitespace-nowrap">
          Vibe check
        </span>
        <div className="flex items-center gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => triggerReaction(emoji)}
              aria-label={`React with ${emoji}`}
              className="w-9 h-8 rounded-xl hover:bg-white/10 active:scale-125 transition-all flex items-center justify-center text-base cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Zone D: Custom Scrubber & Transport Controls */}
      <div className="space-y-1.5">
        <div className="relative flex items-center w-full h-5">
          {/* Background Track & Filled Progress */}
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-[#FF2E63] to-[#8B5CF6] rounded-full transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={1}
            value={Math.floor(clampedCurrent)}
            aria-label="Seek track timeline"
            onChange={(e) => onSeek(Number(e.target.value))}
            className="syncvibe-scrubber absolute inset-0 w-full h-full opacity-95"
          />
        </div>

        <div className="flex items-center justify-between font-mono-tabular text-[11px] text-[#A1A1AA]">
          <span>{formatTimestamp(clampedCurrent)}</span>
          <span>{formatTimestamp(safeDuration)}</span>
        </div>
      </div>

      {/* Transport Row */}
      <div className="flex items-center justify-between px-2 pt-0.5">
        {/* Restart / Previous Track */}
        <button
          type="button"
          onClick={onPreviousOrRestart}
          aria-label="Restart Track"
          className="w-11 h-11 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#FAFAFC] active:scale-90 transition-all cursor-pointer"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Hero Play / Pause Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause Music' : 'Play Music'}
          className="w-15 h-15 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#FF2E63] to-[#8B5CF6] text-white flex items-center justify-center shadow-lg shadow-[#FF2E63]/35 hover:opacity-95 active:scale-90 transition-all cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-white" />
          ) : (
            <Play className="w-7 h-7 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Next Track (Skip) */}
        <button
          type="button"
          onClick={onNextTrack}
          aria-label="Skip to Next Track"
          className="w-11 h-11 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#FAFAFC] active:scale-90 transition-all cursor-pointer"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Mute / Volume Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              onToggleMute();
              setShowVolumePopover((prev) => !prev);
            }}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="w-11 h-11 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white active:scale-90 transition-all cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-[#FF2E63]" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          {showVolumePopover && (
            <div className="absolute bottom-13 right-0 z-30 w-36 p-3 rounded-2xl bg-[#181826]/95 backdrop-blur-xl border border-white/15 shadow-xl flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                aria-label="Volume level"
                onChange={(e) => onChangeVolume(Number(e.target.value))}
                className="w-full accent-[#FF2E63] cursor-pointer"
              />
              <span className="font-mono-tabular text-[11px] text-white w-8 text-right">
                {isMuted ? 0 : volume}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
