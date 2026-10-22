import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Trash2, X, PlusCircle, SkipForward } from 'lucide-react';
import { Track } from '../../types/syncvibe';
import { formatTimestamp } from '../../utils/syncMath';
import { CoverArtImage } from '../CoverArtImage';

interface QueueDrawerProps {
  isOpen: boolean;
  currentTrack: Track;
  isPlaying: boolean;
  queue: Track[];
  onClose: () => void;
  onPlayFromQueue: (track: Track) => void;
  onRemoveFromQueue: (trackId: string) => void;
  onSkipNext: () => void;
  onOpenSearch: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  currentTrack,
  isPlaying,
  queue,
  onClose,
  onPlayFromQueue,
  onRemoveFromQueue,
  onSkipNext,
  onOpenSearch,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Shared Room Queue"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-40 h-[82%] pb-20 rounded-t-3xl bg-[#12121A]/96 backdrop-blur-2xl border-t border-white/15 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#FAFAFC]">
                  Shared Couple Queue
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  Both partners can add, reorder, or play songs immediately
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Queue Drawer"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
              {/* Now Playing Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#A1A1AA]">
                  <span>Now Spinning in Room</span>
                  <span className="text-[#10B981]">
                    {isPlaying ? 'Playing Synchronized' : 'Paused'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#FF2E63]/15 to-[#8B5CF6]/15 border border-[#FF2E63]/35 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15">
                      <CoverArtImage
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#FAFAFC] truncate">
                        {currentTrack.title}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] truncate">
                        {currentTrack.channel}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSkipNext}
                    aria-label="Skip to next song in queue"
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Skip</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Up Next Queue List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">
                    Up Next in Room ({queue.length})
                  </span>
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="text-xs font-semibold text-[#FF2E63] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Songs</span>
                  </button>
                </div>

                {queue.length === 0 ? (
                  <div className="py-10 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center space-y-2 p-4">
                    <p className="text-sm font-semibold text-[#FAFAFC]">
                      Queue is currently open
                    </p>
                    <p className="text-xs text-[#A1A1AA]">
                      When this song ends, SyncVibe will auto-play the next romantic track, or you can queue songs now.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenSearch}
                      className="mt-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#FF2E63] text-white text-xs font-semibold cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Browse Indian Catalog</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((track, idx) => (
                      <div
                        key={track.id || `${track.videoId}-${idx}`}
                        className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-mono-tabular text-xs text-[#A1A1AA] w-5 text-center shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10">
                            <CoverArtImage
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-[#FAFAFC] truncate">
                              {track.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] truncate">
                              <span className="truncate">{track.channel}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular shrink-0">
                                {formatTimestamp(track.duration)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onPlayFromQueue(track)}
                            aria-label={`Play ${track.title} immediately`}
                            className="w-9 h-9 rounded-xl bg-[#FF2E63]/20 hover:bg-[#FF2E63]/30 text-[#FF2E63] flex items-center justify-center cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-[#FF2E63]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFromQueue(track.id)}
                            aria-label={`Remove ${track.title} from queue`}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-[#A1A1AA] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
