# DESIGN.md — Native Mobile App UI/UX Specification

## 1. Aesthetic Direction: "Midnight Velvet & Rose Glow"
The interface must NOT look like a standard Bootstrap/Tailwind website. It must look like a flagship mobile music app (inspired by **Apple Music Live Lyrics view**, **Spotify Jam**, and **Airbuds**) tailored for couples.

### Core Visual Principles
- **App-Shell Viewport:** 
  - On mobile devices: Full screen (`width: 100vw`, `height: 100dvh`, `overflow: hidden`, `user-select: none`, `-webkit-tap-highlight-color: transparent`).
  - On desktop screens: Render the app inside a sleek, centered mobile phone frame (`max-w-[430px] h-[92dvh] rounded-[40px] border border-white/15 shadow-2xl`) floating over a dynamically blurred ambient background of the current song's album art.
- **Dynamic Ambient Backdrop:** Use the active track's thumbnail (`https://img.youtube.com/vi/{videoId}/maxresdefault.jpg`) scaled up by $150\%$ with heavy blur (`blur-3xl opacity-30`) behind a dark obsidian base (`#09090E`) so the entire app's color mood shifts automatically with every song.

---

## 2. Color Palette & Design Tokens

| Token Name | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--bg-obsidian` | `#09090F` | Primary deep background |
| `--surface-glass` | `rgba(24, 24, 34, 0.65)` | Cards, bottom nav, and floating pills (`backdrop-blur-xl`) |
| `--surface-drawer` | `rgba(18, 18, 26, 0.92)` | Slide-up sheets (Search, Queue, Chat) |
| `--accent-primary` | `#FF2E63` | Romantic Neon Rose (Primary buttons, active states, hearts) |
| `--accent-secondary` | `#8B5CF6` | Electric Violet (Gradients, partner badge, sync glow) |
| `--accent-synced` | `#10B981` | Emerald pulse dot indicating $< 1.5\text{ s}$ sync lock |
| `--text-primary` | `#FAFAFC` | Track titles, primary headings |
| `--text-secondary` | `#A1A1AA` | Artist names, timestamps, inactive icons |
| `--border-glass` | `rgba(255, 255, 255, 0.08)` | Subtle 1px inner borders on all glass surfaces |

---

## 3. Typography & Iconography
- **Font Family:** `'Plus Jakarta Sans'` or `'Inter'` (loaded via Google Fonts).
- **Monospace Font:** `'JetBrains Mono'` for room codes (`LOVE24`) and track timestamps (`02:14 / 04:05`).
- **Icons:** `lucide-react` with `strokeWidth={2}` and rounded caps.

---

## 4. Screen-by-Screen Layout & Component Hierarchy

### Screen 1: Welcome & Room Entry (Onboarding View)
- **Top Branding:** Glowing dual-heart/waveform logo with title **SyncVibe** and subtitle *"Listen together, feel closer."*
- **Profile Card:** 
  - Text input for `Your Nickname` (persisted in `localStorage`).
  - Horizontal pill selector for Avatar Emoji (`🎧`, `💖`, `🌙`, `🦋`, `🎸`, `🧸`).
- **Action Tabs:**
  - **Create New Room:** Primary gradient button (`from-[#FF2E63] to-[#8B5CF6]`) with subtle pulse shadow.
  - **Join Partner's Room:** 6-character uppercase code input box + "Join Room" button.

### Screen 2: Mobile Audio Unlock Overlay (Conditional Modal)
- Appears whenever a user joins an existing room via URL or before the first user interaction.
- Features a miniature spinning vinyl preview of the currently playing song in the room, a pulsing ring animation, and a full-width button: **"Tap to Sync Music & Join Room"**.

### Screen 3: Main Player Stage (Primary App View)
Divided vertically into 5 ergonomic mobile zones inside a `flex-col justify-between h-full px-5 pt-4 pb-6`:

1. **Zone A — Top App Bar (Height: `56px`):**
   - **Left:** Room Code Badge (`#LOVE24`) + Copy/Share icon button.
   - **Center:** Sync Status Pill (`● Synced` in emerald green or `↻ Syncing...` in amber, clickable to force re-sync).
   - **Right:** Dual Avatar Stack showing both partners in the room with an active green online dot.

2. **Zone B — Centerpiece Vinyl Turntable Stage (Flexible Height):**
   - **The Vinyl Disc:** A circular container (`w-64 h-64 sm:w-72 sm:h-72 rounded-full`) with realistic concentric CSS radial-gradient grooves, outer rim highlight, and the song's album cover in the center (`w-28 h-28 rounded-full`).
   - **Rotation Animation:** Continuously rotates (`33.3 RPM` feel, ~8s linear infinite keyframe) ONLY when `isPlaying === true`. Smoothly decelerates or pauses when paused.
   - **The Tonearm:** An SVG/CSS stylus arm positioned at the top-right corner of the turntable stage. Pivots smoothly by $22^\circ$ onto the record when playing, and rests off the record when paused.
   - **Floating Emoji Canvas:** An `absolute inset-0 pointer-events-none` layer where partner reactions float upward with smooth sine-wave drift and fade out.

3. **Zone C — Track Info & Quick Reaction Bar:**
   - **Left:** Marquee/truncated Song Title (`text-xl font-bold text-white`) and Channel/Artist Name (`text-sm text-zinc-400`).
   - **Right:** Quick Heart Burst button (`❤️`) that triggers haptic vibration (`navigator.vibrate(30)` if supported) and sends a heart event.
   - **Reaction Strip:** A subtle glass pill bar with 5 instant emojis (`❤️`, `🔥`, `🥺`, `✨`, `🥰`) for 1-tap reactions.

4. **Zone D — Custom Scrubber & Transport Controls:**
   - **Progress Slider:** Custom styled range input or interactive progress bar showing buffered/elapsed progress with glowing rose thumb, plus current time (`01:24`) and total duration (`03:50`) in monospace font.
   - **Transport Row:** 
     - `Previous / Restart Track` button
     - **Hero Play/Pause Button:** `w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF2E63] to-[#8B5CF6] shadow-lg shadow-rose-500/30` with active scale-down (`active:scale-90 transition-transform`).
     - `Next Track (Skip)` button
     - `Mute / Volume` popover toggle.

5. **Zone E — Bottom Navigation Dock (Native App Tab Bar):**
   - Floating glass dock (`h-16 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-around px-2`):
     1. **Player** (Disc Icon) — Active view
     2. **Search Songs** (Search Icon) — Opens Search Bottom Sheet
     3. **Queue** (ListMusic Icon + Badge count) — Opens Shared Queue Bottom Sheet
     4. **Couple Chat** (MessageCircleHeart Icon + Unread red dot badge) — Opens Live Chat Bottom Sheet

---

## 5. Slide-Up Bottom Sheet Drawers (`Framer Motion`)
When the user taps **Search**, **Queue**, or **Chat**, a native-style bottom sheet slides up (`y: "100%"` to `y: 0`, `height: 78dvh`, `rounded-t-3xl`), keeping the top bar and a mini-player strip visible.
- **Drag Handle:** A `w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3` pill at the top of every drawer.
- **Search Sheet:**
  - Instant search input with "Search Bollywood, Hindi Lofi, Punjabi..." placeholder + "Paste YouTube Link" support.
  - Filter chips: `All`, `Romantic Hits`, `Bollywood Lofi`, `90s Classics`, `Punjabi Vibes`.
  - Song results list with thumbnail, title, duration, **"Play Now"** button, and **"+ Queue"** button.
- **Queue Sheet:**
  - Shows "Now Playing" card at top, followed by "Up Next in Room" list with a button to play immediately or remove.
- **Chat Sheet:**
  - WhatsApp/iMessage-style dark glass chat bubbles (Partner messages on left in violet-tinted glass; Own messages on right in rose gradient).
  - Sticky bottom input bar that stays above the mobile keyboard.