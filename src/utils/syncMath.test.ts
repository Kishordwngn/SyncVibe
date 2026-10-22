import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTargetTrackTime,
  calculateDriftSeconds,
  shouldTriggerHardSeek,
  formatTimestamp,
  extractYouTubeVideoId,
  normalizeRoomCode,
  generateRoomCode,
  parseYouTubeDuration,
} from './syncMath';

test('calculateTargetTrackTime advances position when playing', () => {
  const tHost = 42.5;
  const lastUpdated = 1729590000000;
  const now = 1729590005500; // +5.5 seconds later
  const target = calculateTargetTrackTime(tHost, lastUpdated, now, true, 262);
  assert.equal(target, 48.0);
});

test('calculateTargetTrackTime stays stationary when paused', () => {
  const tHost = 42.5;
  const lastUpdated = 1729590000000;
  const now = 1729590015000;
  const target = calculateTargetTrackTime(tHost, lastUpdated, now, false, 262);
  assert.equal(target, 42.5);
});

test('calculateTargetTrackTime clamps to maxDurationSeconds', () => {
  const target = calculateTargetTrackTime(250, 1000, 20000, true, 260);
  assert.equal(target, 260);
});

test('shouldTriggerHardSeek enforces the 1.5s anti-stutter threshold', () => {
  // Minor jitter <= 1.5s must NOT trigger seekTo
  assert.equal(shouldTriggerHardSeek(50.0, 51.2), false);
  assert.equal(shouldTriggerHardSeek(50.0, 51.5), false);
  assert.equal(calculateDriftSeconds(50.0, 51.2) <= 1.5, true);

  // Drift > 1.5s MUST trigger seekTo
  assert.equal(shouldTriggerHardSeek(50.0, 51.6), true);
  assert.equal(shouldTriggerHardSeek(55.0, 50.0), true);
});

test('formatTimestamp formats seconds into MM:SS', () => {
  assert.equal(formatTimestamp(0), '00:00');
  assert.equal(formatTimestamp(84), '01:24');
  assert.equal(formatTimestamp(262.8), '04:22');
  assert.equal(formatTimestamp(-5), '00:00');
});

test('extractYouTubeVideoId parses standard and short YouTube URLs', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=Umqb9KENgmk'),
    'Umqb9KENgmk'
  );
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/Umqb9KENgmk?si=12345'),
    'Umqb9KENgmk'
  );
  assert.equal(
    extractYouTubeVideoId('https://music.youtube.com/watch?v=RLzC55ai0eo&feature=share'),
    'RLzC55ai0eo'
  );
  assert.equal(extractYouTubeVideoId('Kesariya Lofi Arijit Singh'), null);
});

test('normalizeRoomCode and generateRoomCode produce 6-character uppercase codes', () => {
  assert.equal(normalizeRoomCode(' #love-24! '), 'LOVE24');
  const code = generateRoomCode(0);
  assert.equal(code.length, 6);
  assert.match(code, /^[A-Z0-9]{6}$/);
});

test('parseYouTubeDuration converts MM:SS and HH:MM:SS to seconds', () => {
  assert.equal(parseYouTubeDuration('4:47'), 287);
  assert.equal(parseYouTubeDuration('03:03'), 183);
  assert.equal(parseYouTubeDuration('1:02:15'), 3735);
  assert.equal(parseYouTubeDuration(''), 240);
});
