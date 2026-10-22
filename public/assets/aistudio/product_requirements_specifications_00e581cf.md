# REQUIREMENTS.md — SyncVibe (BeatSetu): Couple Music Hangout Web App

## 1. Project Vision & Overview
**SyncVibe (BeatSetu)** is a real-time, mobile-first Progressive Web Application (PWA) designed for couples and close friends to listen to Indian (Bollywood, Indie, Punjabi, Lofi, Regional) and global music together in millisecond-level synchronization. 

Although it runs in a web browser without requiring an app store download, **it must look, feel, and behave like a polished native iOS/Android mobile application**—complete with a locked viewport (`100dvh`), smooth 60 FPS gesture drawers, glassmorphic dark UI, haptic-like micro-interactions, and a zero-reload single-page architecture.

---

## 2. Core User Experience Goals
1. **Zero Friction Onboarding:** No mandatory email signup or heavy login. A user enters their nickname, chooses an avatar/vibe, creates a room in one tap, and shares a direct WhatsApp/invite link with their partner.
2. **Native Mobile App Feel:** 
   - No traditional webpage scrolling or clunky desktop headers.
   - Fixed bottom navigation and slide-up bottom sheets (for Search, Queue, and Live Chat) so the music player remains active at all times.
   - Installable on iOS and Android home screens as a standalone full-screen PWA.
3. **Distraction-Free Vinyl Audio Experience:** Instead of showing a standard YouTube video player, the app hides the underlying video iframe and presents a custom **Spinning Vinyl Record & Tonearm UI** with high-resolution album artwork and dynamic ambient lighting.
4. **Intimate Couple Features:** Real-time chat overlay, floating heart/emoji bursts across both screens simultaneously, live partner presence status, and a "Sync Pulse" indicator showing both partners are listening to the exact same second.

---

## 3. Functional Requirements (FR)

### FR-1: Room Management & Deep Linking
- **Create Room:** Generates a unique, human-friendly 6-character room code (e.g., `LOVE24` or `VIBE99`) and updates the URL query/route (`/room/:roomId`).
- **One-Tap Invite:** Provides a "Share with Partner" button that uses the native mobile Web Share API (`navigator.share`) or copies the direct join link to the clipboard.
- **Room Capacity & Presence:** Designed primarily for 2 users (Host + Partner), displaying avatars, names, and connection states (`Online`, `Buffering`, `Synced`).

### FR-2: Mobile Browser Audio Unlock Gate (Critical)
- Mobile browsers (iOS Safari and Android Chrome) block programmatic audio autoplay unless triggered by a direct user gesture.
- When a user joins an active room via link, the app must display a sleek glassmorphic overlay: **"Tap to Connect & Sync Audio with [Partner Name]"**.
- Tapping this button initializes the hidden YouTube IFrame Player, unlocks audio playback, fetches the latest server timestamp, and immediately seeks to the live position.

### FR-3: Synchronized Playback Engine
- **Bidirectional Control:** Either partner (Host or Guest) can Play, Pause, Seek, or Skip tracks. Every action broadcasts immediately to the room.
- **Latency & Drift Compensation:**
  - When a state update arrives, the client calculates network delay and adjusts the target timestamp.
  - A periodic background heartbeat checks the drift ($\Delta t$) between the local player time and the expected room time every $3\text{ s}$.
  - To prevent audio stuttering, the player only triggers a hard `seekTo()` if the absolute drift exceeds $1.5\text{ s}$ ($|\Delta t| > 1.5\text{ s}$).
- **Manual Re-Sync Button:** A quick "Sync Now" pill in the header in case a user's mobile network switches from Wi-Fi to 5G/4G.

### FR-4: Indian Music Discovery & Shared Queue
- **In-App Search:** Users can search for any Bollywood, Indie, Punjabi, or Lofi track inside a slide-up Search Drawer without pausing the current song.
- **Dual-Mode Search Engine:**
  - **Primary:** Queries YouTube Data API v3 (`videoCategoryId=10` or general music queries) if `VITE_YOUTUBE_API_KEY` is provided.
  - **Fallback (Zero-Config Mode):** Includes a rich pre-loaded catalog of 25+ popular Indian romantic/lofi tracks (Arijit Singh, Atif Aslam, Prateek Kuhad, Anuv Jain, Bollywood Lofi, etc.) plus direct YouTube URL/Video ID pasting so the app works 100% out-of-the-box without requiring an API key during initial testing.
- **Shared Queue Management:** Both users can add songs to the queue, remove tracks, or tap any queued song to play it immediately. When a track finishes (`ENDED` state), the server advances the room to the next track in the queue automatically.

### FR-5: Real-Time Couple Interaction Suite
- **Floating Reactions:** A quick-reaction bar (`❤️`, `🔥`, `🥺`, `✨`, `🎵`, `😘`) on the main player screen. Tapping an emoji spawns animated floating particles on both users' screens simultaneously via WebSockets.
- **Slide-Up Live Chat:** Real-time messaging with typing indicators ("Partner is typing..."), timestamps, and unread message badges on the chat icon when the drawer is closed.
- **Now Playing Dedication Banner:** Optional short status message or mood tag at the top of the room (e.g., *"Late Night Lofi with You"*).

---

## 4. Non-Functional Requirements (NFR)
1. **Performance:** First Contentful Paint under $1.2\text{ s}$; all UI drawers and vinyl rotation must run at $60\text{ FPS}$ using GPU-accelerated CSS transforms (`transform`, `opacity`).
2. **Viewport Stability:** Must use `100dvh` (dynamic viewport height) so mobile browser address bars and virtual keyboards do not break the layout.
3. **Resilience:** Automatic Socket.io reconnection handling; if a user briefly switches apps on their phone (e.g., to reply on WhatsApp) and returns, the `visibilitychange` listener must automatically re-sync their player to the room's current live timestamp.