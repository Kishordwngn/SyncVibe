import React from 'react';
import { Volume2, Radio } from 'lucide-react';
import { Track, RoomUser } from '../types/syncvibe';
import { CoverArtImage } from './CoverArtImage';

interface AudioUnlockModalProps {
  roomId: string;
  currentTrack: Track;
  users: RoomUser[];
  onUnlock: () => void;
}

export const AudioUnlockModal: React.FC<AudioUnlockModalProps> = ({
  roomId,
  currentTrack,
  users,
  onUnlock,
}) => {
  const partner = users[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock Audio and Sync Room"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-5"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#14141F]/95 border border-white/15 p-6 text-center shadow-2xl space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono-tabular text-[#FAFAFC]">
          <Radio className="w-3.5 h-3.5 text-[#FF2E63]" />
          <span>ROOM #{roomId}</span>
        </div>

        {/* Miniature Spinning Vinyl Preview */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full vinyl-disc-surface vinyl-spinning flex items-center justify-center border border-white/15">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#09090F] relative">
              <CoverArtImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full"
              />
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-[#09090F] border border-white/20" />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-[#A1A1AA]">
            {partner
              ? `${partner.avatar} ${partner.name} is listening in real-time`
              : 'Live Synchronized Music Stream Ready'}
          </p>
          <h2 className="text-base font-bold text-[#FAFAFC] line-clamp-1">
            {currentTrack.title}
          </h2>
          <p className="text-xs text-[#A1A1AA] line-clamp-1">{currentTrack.channel}</p>
        </div>

        <button
          type="button"
          onClick={onUnlock}
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#FF2E63] to-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E63]/30 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          <span>Tap to Sync Music &amp; Join Room</span>
        </button>
      </div>
    </div>
  );
};
