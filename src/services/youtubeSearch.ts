import { Track, MoodCategory } from '../types/syncvibe';
import { CURATED_INDIAN_SONGS, filterCuratedSongs } from '../data/curatedSongs';
import { extractYouTubeVideoId } from '../utils/syncMath';

export interface SearchSongsResult {
  tracks: Track[];
  source: 'youtube_link' | 'youtube_live' | 'youtube_api' | 'curated_catalog';
  detectedVideoId?: string;
}

/**
 * Universal YouTube & Indian Music Search Engine:
 * 1. Direct YouTube Link / 11-char Video ID parser + public oEmbed lookup
 * 2. Live Server-Side YouTube Search (/api/youtube-search) — searches ANY song on YouTube with zero API key needed
 * 3. Optional YouTube Data API v3 (if VITE_YOUTUBE_API_KEY is configured)
 * 4. Built-In Curated Indian Romantic, Bollywood Lofi, Indie & Punjabi Catalog (for instant browsing before typing)
 */
export async function searchSongs(
  query: string,
  category: MoodCategory = 'All'
): Promise<SearchSongsResult> {
  const trimmed = query.trim();

  // Layer 1: Direct YouTube URL or 11-character Video ID
  const extractedId = extractYouTubeVideoId(trimmed);
  if (extractedId) {
    try {
      const response = await fetch(`/api/oembed?videoId=${encodeURIComponent(extractedId)}`);
      if (response.ok) {
        const track = (await response.json()) as Track;
        return {
          tracks: [track],
          source: 'youtube_link',
          detectedVideoId: extractedId,
        };
      }
    } catch {
      // Fallback to direct oEmbed or synthetic metadata
    }

    const existing = CURATED_INDIAN_SONGS.find((s) => s.videoId === extractedId);
    if (existing) {
      return {
        tracks: [existing],
        source: 'youtube_link',
        detectedVideoId: extractedId,
      };
    }

    return {
      tracks: [
        {
          id: `yt-${extractedId}`,
          videoId: extractedId,
          title: `YouTube Track (${extractedId})`,
          channel: 'Direct YouTube Link',
          thumbnail: `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`,
          duration: 240,
          category: 'Romantic Hits',
        },
      ],
      source: 'youtube_link',
      detectedVideoId: extractedId,
    };
  }

  // Layer 2: Live YouTube Search for ANY song, artist, or movie when user types a query
  if (trimmed.length >= 2) {
    try {
      const res = await fetch(
        `/api/youtube-search?q=${encodeURIComponent(trimmed)}&category=${encodeURIComponent(category)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          tracks?: Track[];
          source?: 'youtube_live' | 'curated_catalog';
        };
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          return {
            tracks: data.tracks,
            source: data.source || 'youtube_live',
          };
        }
      }
    } catch {
      // Fall through to client-side fallback
    }
  }

  // Layer 3: Built-In Curated Indian Hits Library (when search query is empty)
  const filtered = filterCuratedSongs(trimmed, category);
  return {
    tracks: filtered,
    source: 'curated_catalog',
  };
}
