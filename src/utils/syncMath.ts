/**
 * Mathematical Synchronization & Drift Algorithm for SyncVibe
 *
 * Implements the exact playback state machine math specified in BUILD.md Section 3:
 * - Expected Track Position Formula (3.1)
 * - Anti-Stutter Drift Threshold Rule (3.2)
 * - YouTube URL / Video ID extraction
 * - Room Code normalization & formatting
 */

export const DRIFT_THRESHOLD_SECONDS = 1.5;
export const HEARTBEAT_INTERVAL_MS = 3000;
export const REMOTE_UPDATE_COOLDOWN_MS = 400;

/**
 * Calculates the expected live position T_target of the active track
 * at the current server-adjusted timestamp t_now.
 *
 * Formula:
 * T_target = T_host + (t_now - t_updated) / 1000   if isPlaying === true
 * T_target = T_host                                 if isPlaying === false
 */
export function calculateTargetTrackTime(
  trackTimeHost: number,
  lastUpdatedAtMs: number,
  nowMs: number,
  isPlaying: boolean,
  maxDurationSeconds?: number
): number {
  const safeHostTime = Math.max(0, Number.isFinite(trackTimeHost) ? trackTimeHost : 0);
  if (!isPlaying) {
    return maxDurationSeconds && maxDurationSeconds > 0
      ? Math.min(safeHostTime, maxDurationSeconds)
      : safeHostTime;
  }

  const elapsedMs = Math.max(0, nowMs - lastUpdatedAtMs);
  const target = safeHostTime + elapsedMs / 1000;

  if (maxDurationSeconds && maxDurationSeconds > 0) {
    return Math.min(target, maxDurationSeconds);
  }
  return target;
}

/**
 * Computes absolute drift |T_local - T_target| in seconds.
 */
export function calculateDriftSeconds(localTimeSeconds: number, targetTimeSeconds: number): number {
  return Math.abs(localTimeSeconds - targetTimeSeconds);
}

/**
 * Anti-Stutter Drift Threshold Rule:
 * - If |T_local - T_target| <= 1.5s: Do NOT call player.seekTo()
 * - If |T_local - T_target| > 1.5s: Execute player.seekTo(T_target, true)
 */
export function shouldTriggerHardSeek(
  localTimeSeconds: number,
  targetTimeSeconds: number,
  thresholdSeconds: number = DRIFT_THRESHOLD_SECONDS
): boolean {
  const drift = calculateDriftSeconds(localTimeSeconds, targetTimeSeconds);
  return drift > thresholdSeconds;
}

/**
 * Formats seconds into MM:SS monospace string (e.g., 144 -> "02:24")
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extracts an 11-character YouTube videoId from any standard YouTube URL or raw 11-char ID.
 * Supports:
 * - https://www.youtube.com/watch?v=Umqb9KENgmk
 * - https://youtu.be/Umqb9KENgmk?si=...
 * - https://www.youtube.com/embed/Umqb9KENgmk
 * - https://music.youtube.com/watch?v=Umqb9KENgmk
 * - Raw 11-char ID when explicitly formatted
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if it's a URL containing youtube.com or youtu.be
  const urlPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If the user pasted a raw 11-character videoId with no spaces and valid chars
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) && /[0-9_-]/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Normalizes a room code to 6 uppercase alphanumeric characters.
 */
export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/**
 * Generates a romantic, human-friendly 6-character room code (e.g. LOVE24, VIBE99, DIL420, SETU18)
 */
export function generateRoomCode(seedIndex?: number): string {
  const prefixes = ['LOVE', 'VIBE', 'SETU', 'JAAN', 'BEAT', 'ROOH', 'SUKO', 'YAAR'];
  const prefix =
    typeof seedIndex === 'number'
      ? prefixes[Math.abs(seedIndex) % prefixes.length]
      : prefixes[Math.floor(Math.random() * prefixes.length)];
  const digits =
    typeof seedIndex === 'number'
      ? String((Math.abs(seedIndex) * 17 + 24) % 90 + 10)
      : String(Math.floor(10 + Math.random() * 90));
  return `${prefix}${digits}`.slice(0, 6);
}

/**
 * Parses a YouTube duration string (e.g. "4:47" or "1:02:15") into total seconds.
 */
export function parseYouTubeDuration(durationText?: string): number {
  if (!durationText || typeof durationText !== 'string') return 240;
  const parts = durationText
    .trim()
    .split(':')
    .map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 240;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 240;
}

