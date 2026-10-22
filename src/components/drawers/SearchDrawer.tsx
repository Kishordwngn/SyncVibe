import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Play, Plus, Check, X, Link2, Sparkles } from 'lucide-react';
import { Track, MoodCategory } from '../../types/syncvibe';
import { MOOD_CATEGORIES } from '../../data/curatedSongs';
import { searchSongs } from '../../services/youtubeSearch';
import { formatTimestamp } from '../../utils/syncMath';
import { CoverArtImage } from '../CoverArtImage';

const QUICK_YOUTUBE_SEARCHES = [
  'Arijit Singh Hits',
  'Atif Aslam Romantic',
  'Karan Aujla',
  'Shreya Ghoshal',
  'Sidhu Moose Wala',
  'Bollywood Lofi',
  '90s Hindi Classics',
  'Anuv Jain',
];

interface SearchDrawerProps {
  isOpen: boolean;
  currentTrack: Track;
  onClose: () => void;
  onPlayNow: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
}

export const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  currentTrack,
  onClose,
  onPlayNow,
  onAddToQueue,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MoodCategory>('All');
  const [results, setResults] = useState<Track[]>([]);
  const [sourceType, setSourceType] = useState<
    'youtube_link' | 'youtube_live' | 'youtube_api' | 'curated_catalog'
  >('curated_catalog');
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);

    const debounceMs = query.trim().length >= 2 ? 320 : 80;
    const timer = window.setTimeout(async () => {
      const res = await searchSongs(query, selectedCategory);
      if (!cancelled) {
        setResults(res.tracks);
        setSourceType(res.source);
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selectedCategory, isOpen]);

  const handleQueueAdd = (track: Track) => {
    onAddToQueue(track);
    setAddedIds((prev) => ({ ...prev, [track.videoId]: true }));
    window.setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [track.videoId]: false }));
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs"
          />

          {/* Bottom Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search Any YouTube Song or Paste Link"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-40 h-[82%] pb-20 rounded-t-3xl bg-[#12121A]/96 backdrop-blur-2xl border-t border-white/15 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Sheet Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#FAFAFC]">
                  Live YouTube Music Search
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  Search any song, movie, or artist on YouTube — or paste a link
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Search Drawer"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="px-5 pt-3 pb-2 shrink-0 space-y-2.5">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#FF2E63] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type any song name, singer, movie or paste YouTube URL..."
                  aria-label="Search songs or paste YouTube link"
                  className="w-full h-11 pl-10 pr-9 rounded-2xl bg-black/50 border border-white/15 text-sm text-[#FAFAFC] placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E63] transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Live YouTube Search Tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-medium text-[#A1A1AA] shrink-0 pr-1">
                  Try YouTube:
                </span>
                {QUICK_YOUTUBE_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      query.toLowerCase() === term.toLowerCase()
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-white/[0.05] text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Interactive Mood Filter Buttons (when browsing curated or refining search) */}
              {!query.trim() && (
                <div
                  role="tablist"
                  aria-label="Music Mood Filter"
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
                >
                  {MOOD_CATEGORIES.map((category) => {
                    const active = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedCategory(category)}
                        className={`h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                          active
                            ? 'bg-[#FF2E63] text-white shadow-sm shadow-[#FF2E63]/30'
                            : 'bg-white/[0.06] text-[#A1A1AA] hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Source Status Info */}
            {sourceType === 'youtube_link' && (
              <div className="mx-5 mb-2 px-3 py-1.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center gap-2 text-xs text-[#FAFAFC] shrink-0">
                <Link2 className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                <span>Direct YouTube link detected — ready for instant room sync</span>
              </div>
            )}

            {sourceType === 'youtube_live' && query.trim() && (
              <div className="mx-5 mb-2 px-3 py-1.5 rounded-xl bg-[#FF2E63]/12 border border-[#FF2E63]/30 flex items-center justify-between text-xs text-[#FAFAFC] shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF2E63] shrink-0" />
                  <span className="truncate">
                    Showing live YouTube results for &ldquo;{query.trim()}&rdquo;
                  </span>
                </div>
                <span className="font-mono-tabular text-[11px] text-[#A1A1AA] shrink-0 ml-2">
                  {results.length} songs
                </span>
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2 no-scrollbar">
              {loading ? (
                <div className="py-12 text-center text-xs text-[#A1A1AA]">
                  Searching YouTube catalog...
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#FAFAFC]">
                    No matching songs found
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    Try another song title, artist name, or paste any YouTube URL directly above!
                  </p>
                </div>
              ) : (
                results.map((track) => {
                  const isCurrent = currentTrack.videoId === track.videoId;
                  const isAdded = Boolean(addedIds[track.videoId]);

                  return (
                    <div
                      key={track.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-[#FF2E63]/12 border-[#FF2E63]/40'
                          : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative border border-white/10">
                          <CoverArtImage
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-semibold text-[#FAFAFC] truncate">
                            {track.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] truncate mt-0.5">
                            <span className="truncate">{track.channel}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular shrink-0">
                              {formatTimestamp(track.duration)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions: Play Now + Add to Queue */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onPlayNow(track);
                            onClose();
                          }}
                          aria-label={`Play ${track.title} now`}
                          className="h-9 px-3 rounded-xl bg-gradient-to-r from-[#FF2E63] to-[#8B5CF6] text-white text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Play</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQueueAdd(track)}
                          aria-label={`Add ${track.title} to queue`}
                          className="h-9 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-[#FAFAFC] flex items-center gap-1 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                              <span className="text-[#10B981]">Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Queue</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
