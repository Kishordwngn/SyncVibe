import React, { useState } from 'react';
import { Edit3, Check } from 'lucide-react';
import { Track, FloatingReaction } from '../types/syncvibe';
import { CoverArtImage } from './CoverArtImage';
import { FloatingReactions } from './FloatingReactions';

interface VinylTurntableProps {
  currentTrack: Track;
  isPlaying: boolean;
  dedication: string;
  reactions: FloatingReaction[];
  onUpdateDedication: (newNote: string) => void;
  onTogglePlay: () => void;
}

export const VinylTurntable: React.FC<VinylTurntableProps> = ({
  currentTrack,
  isPlaying,
  dedication,
  reactions,
  onUpdateDedication,
  onTogglePlay,
}) => {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(dedication);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDedication(noteDraft.trim() || 'Late Night Lofi with You');
    setEditingNote(false);
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center w-full min-h-0 py-1">
      {/* Floating Emoji Overlay */}
      <FloatingReactions reactions={reactions} />

      {/* Now Playing Dedication Note Banner */}
      <div className="mb-2 z-10 max-w-full">
        {editingNote ? (
          <form onSubmit={handleSaveNote} className="flex items-center gap-1.5">
            <input
              type="text"
              maxLength={45}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              aria-label="Room dedication message"
              className="h-8 px-3 rounded-lg bg-black/60 border border-[#FF2E63] text-xs text-white focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              aria-label="Save dedication message"
              className="h-8 px-2.5 rounded-lg bg-[#FF2E63] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNoteDraft(dedication);
              setEditingNote(true);
            }}
            aria-label={`Edit room dedication note: ${dedication}`}
            className="group flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFC] transition-colors cursor-pointer px-2 py-1"
          >
            <span className="truncate max-w-[230px] italic">
              &ldquo;{dedication || 'Late Night Lofi with You'}&rdquo;
            </span>
            <Edit3 className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
          </button>
        )}
      </div>

      {/* Turntable Platter & Tonearm Stage */}
      <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
        {/* Ambient Rose/Violet Glow Ring under Vinyl */}
        <div
          className={`absolute inset-2 rounded-full bg-gradient-to-tr from-[#FF2E63]/25 to-[#8B5CF6]/25 blur-2xl transition-opacity duration-500 ${
            isPlaying ? 'opacity-90' : 'opacity-30'
          }`}
        />

        {/* The Spinning Vinyl Record */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause vinyl record' : 'Play vinyl record'}
          className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full vinyl-disc-surface flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-[0.98] ${
            isPlaying ? 'vinyl-spinning' : 'vinyl-paused'
          }`}
        >
          {/* Decorative Inner Groove Rings */}
          <div className="absolute inset-4 rounded-full border border-white/[0.04] pointer-events-none" />
          <div className="absolute inset-9 rounded-full border border-white/[0.05] pointer-events-none" />
          <div className="absolute inset-14 rounded-full border border-white/[0.04] pointer-events-none" />

          {/* Center Album Art Label */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-[#09090F] shadow-inner">
            <CoverArtImage
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full"
            />
            {/* Vinyl Center Spindle Hole */}
            <div className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full bg-[#09090F] border border-white/30 shadow-inner" />
          </div>
        </button>

        {/* The Pivoting Stylus Tonearm (Top-Right Corner) */}
        <div
          aria-hidden="true"
          className="absolute -top-2 -right-2 w-24 h-36 pointer-events-none z-10"
        >
          <div
            style={{
              transformOrigin: '68px 20px',
              transform: isPlaying ? 'rotate(22deg)' : 'rotate(-4deg)',
              transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="w-full h-full"
          >
            <svg
              viewBox="0 0 100 140"
              className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
            >
              {/* Tonearm Pivot Base */}
              <circle
                cx="68"
                cy="20"
                r="14"
                fill="#1E1E2C"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.5"
              />
              <circle cx="68" cy="20" r="6" fill="#FF2E63" />
              {/* Tonearm Shaft */}
              <path
                d="M 68 20 L 56 96 L 42 118"
                fill="none"
                stroke="#D4D4D8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Cartridge Headshell */}
              <rect
                x="34"
                y="112"
                width="12"
                height="16"
                rx="3"
                transform="rotate(28 40 120)"
                fill="#FF2E63"
                stroke="#FAFAFC"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
