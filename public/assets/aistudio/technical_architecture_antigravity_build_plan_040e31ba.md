# BUILD.md — Technical Architecture & Execution Blueprint for Antigravity

> **Instructions for AI Coding Agent (Antigravity):**
> Read `REQUIREMENTS.md`, `DESIGN.md`, and this `BUILD.md` file carefully. Build the complete, production-ready full-stack application following the exact architecture, synchronization math, Socket.io contracts, and phased execution plan below. Ensure the application runs smoothly out-of-the-box with zero broken imports.

---

## 1. Tech Stack Specification

### Frontend (`/client`)
- **Framework:** React 18 + Vite (TypeScript or ES6 JavaScript)
- **Styling:** Tailwind CSS v3 + Custom CSS animations for vinyl rotation and floating hearts
- **Animations:** `framer-motion` (for bottom sheets, page transitions, and floating reactions)
- **Icons:** `lucide-react`
- **Real-Time Client:** `socket.io-client`
- **Audio Engine:** Hidden YouTube IFrame Player API (wrapped via a clean custom hook or `react-youtube` controller)
- **PWA Support:** `manifest.json` + mobile viewport meta tags (`viewport-fit=cover`, `apple-mobile-web-app-capable`)

### Backend (`/server`)
- **Runtime:** Node.js + Express.js
- **Real-Time Engine:** `socket.io` (with CORS configured for local dev and production)
- **State Store:** High-speed In-Memory Room Store (`Map<string, RoomState>`) with automatic cleanup of empty rooms after 2 hours of inactivity.

---

## 2. Project Directory Structure

```text
syncvibe/
├── package.json                 # Root scripts (concurrently runs client & server)
├── server/
│   ├── package.json
│   ├── index.js                 # Express + Socket.io server & Room State Manager
│   └── curatedSongs.js          # Built-in fallback Indian songs catalog
└── client/
    ├── package.json
    ├── index.html               # Mobile PWA meta tags & Google Fonts
    ├── public/
    │   └── manifest.json        # Standalone mobile app manifest
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              # Main state router (Lobby vs Room Shell)
        ├── index.css            # Custom vinyl grooves, scrollbar hiding, 100dvh rules
        ├── services/
        │   ├── socket.js        # Singleton Socket.io client instance
        │   └── youtubeSearch.js # YouTube Data API v3 + Curated Indian Fallback Search
        ├── hooks/
        │   └── useYouTubeSync.js# Hidden YouTube IFrame API controller & drift compensation
        └── components/
            ├── LobbyScreen.jsx          # Nickname, Avatar & Create/Join Room UI
            ├── AudioUnlockModal.jsx     # Mobile browser autoplay unlocker
            ├── TopHeaderBar.jsx         # Room code share, sync status pill, partner avatars
            ├── VinylTurntable.jsx       # Spinning vinyl disc, tonearm & album art
            ├── FloatingReactions.jsx    # Physics-like floating emoji overlay
            ├── PlayerControls.jsx       # Custom seek bar, timestamps & transport buttons
            ├── BottomNavDock.jsx        # Native app bottom tab bar
            └── drawers/
                ├── SearchDrawer.jsx     # Search Indian songs + Paste YT URL + Filter chips
                ├── QueueDrawer.jsx      # Shared room playlist queue
                └── ChatDrawer.jsx       # Real-time couple chat with unread badge
```

---

## 3. Mathematical Synchronization & Drift Algorithm

We never stream raw audio through our Node.js server. Both clients stream audio directly from YouTube's CDN via a hidden IFrame player (`width: 1px, height: 1px, opacity: 0.01, pointer-events: none`), while our Socket.io server synchronizes the **Playback State Machine**.

### 3.1 Expected Track Position Formula
The server maintains the authoritative room state:
- $T_{\text{host}}$: The track position in seconds (`currentTime`) when the last play/seek event was recorded.
- $t_{\text{updated}}$: The server timestamp in milliseconds (`Date.now()`) when that state was saved.
- $\text{isPlaying}$: Boolean flag.

Whenever a client needs to calculate the exact live position $T_{\text{target}}$ of the song at current server-adjusted time $t_{\text{now}}$:

$$T_{\text{target}} = \begin{cases} T_{\text{host}} + \dfrac{t_{\text{now}} - t_{\text{updated}}}{1000} & \text{if } \text{isPlaying} = \text{true} \\ T_{\text{host}} & \text{if } \text{isPlaying} = \text{false} \end{cases}$$

### 3.2 Anti-Stutter Drift Threshold Rule
Every $3000\text{ ms}$, the client compares its local YouTube player's current time $T_{\text{local}}$ against $T_{\text{target}}$:

$$\Delta t = |T_{\text{local}} - T_{\text{target}}|$$

- **If $\Delta t \le 1.5\text{ s}$:** Do NOT call `player.seekTo()`. Minor network jitter under $1.5\text{ s}$ is ignored so the audio plays smoothly without micro-stutters.
- **If $\Delta t > 1.5\text{ s}$:** Immediately execute `player.seekTo(T_target, true)` to snap both partners back into synchronization.

---

## 4. Socket.io Event Contract (Client $\leftrightarrow$ Server)

### Room State Schema (Stored on Server)
```json
{
  "roomId": "LOVE24",
  "users": [
    { "socketId": "abc", "name": "Aarav", "avatar": "🎧" },
    { "socketId": "def", "name": "Ananya", "avatar": "💖" }
  ],
  "currentTrack": {
    "videoId": "Umqb9KENgmk",
    "title": "Tum Hi Ho - Aashiqui 2 (Arijit Singh)",
    "channel": "T-Series",
    "thumbnail": "https://img.youtube.com/vi/Umqb9KENgmk/hqdefault.jpg",
    "duration": 262
  },
  "isPlaying": true,
  "trackTime": 42.5,
  "lastUpdatedAt": 1729590000000,
  "queue": [],
  "messages": []
}
```

### Event Table
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client $\rightarrow$ Server | `{ roomId, userName, avatar }` | Joins or creates room and returns full `room_state` |
| `room_state` | Server $\rightarrow$ Client | `{ ...RoomState, serverTime }` | Full snapshot sent on join or user list change |
| `player_action` | Client $\rightarrow$ Server | `{ roomId, action: "PLAY" \| "PAUSE" \| "SEEK", trackTime }` | Broadcasts playback change to partner |
| `sync_playback` | Server $\rightarrow$ Client | `{ action, trackTime, isPlaying, lastUpdatedAt, serverTime, triggeredBy }` | Updates partner's player immediately |
| `change_track` | Client $\rightarrow$ Server | `{ roomId, track }` | Changes current song immediately for both users |
| `queue_update` | Bidirectional | `{ roomId, action: "ADD" \| "REMOVE" \| "NEXT", track, trackId }` | Mutates shared song queue |
| `send_message` | Client $\rightarrow$ Server | `{ roomId, text, senderName, avatar }` | Sends live chat message |
| `new_message` | Server $\rightarrow$ Client | `{ id, text, senderName, avatar, timestamp }` | Appends message to both chat drawers |
| `send_reaction` | Client $\rightarrow$ Server | `{ roomId, emoji, senderName }` | Triggers floating heart/emoji burst |
| `floating_reaction` | Server $\rightarrow$ Client | `{ id, emoji, senderName, xOffset }` | Renders rising emoji animation on both screens |
| `heartbeat_check` | Client $\rightarrow$ Server | `{ roomId }` | Requests lightweight timestamp check every $3\text{ s}$ |

---

## 5. Built-In Indian Romantic & Lofi Catalog (Zero-API Fallback)

To guarantee that the user and his girlfriend can search and play Indian songs immediately—even before setting up a Google Cloud YouTube API Key—implement `youtubeSearch.js` with three layers:
1. **Direct YouTube Link / ID Parser:** If the user pastes any `youtube.com/watch?v=...` or `youtu.be/...` link into the search bar, extract the 11-character `videoId`, fetch its title via YouTube's free public oEmbed endpoint (`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`), and allow instant playback!
2. **YouTube Data API v3 (Optional Env Key):** If `VITE_YOUTUBE_API_KEY` is present, fetch live search results from `https://www.googleapis.com/youtube/v3/search`.
3. **Curated Indian Hits Library (Always Available):** Include 25+ pre-configured, embed-friendly Indian romantic, Bollywood, Indie, and Lofi tracks (e.g., *Kesariya Lofi*, *Tum Se Hi*, *Apna Bana Le*, *Raataan Lambiyan*, *Pehla Nasha*, *Kho Gaye Hum Kahan*, *Gul - Anuv Jain*, *Kasoor - Prateek Kuhad*, *Zara Sa*, *Mast Magan*) categorized by mood chips (`Romantic`, `Bollywood Lofi`, `Indie Vibes`, `Late Night`) so the search drawer is always rich and functional.

---

## 6. Critical Implementation Details for Mobile Web App Feel

1. **Hidden YouTube IFrame Nuance on iOS/Android:**
   - Do NOT use `display: none` or `visibility: hidden` on the YouTube IFrame container, because mobile browsers pause or throttle hidden iframes.
   - Instead, place the YouTube player in a fixed container: `className="fixed -bottom-10 -left-10 w-1 h-1 opacity-[0.01] pointer-events-none overflow-hidden"` with `playsinline: 1` and `controls: 0` in `playerVars`.
2. **Preventing Infinite Socket Loops (`isRemoteUpdate` Guard):**
   - When Client B receives a `sync_playback` event from the server and calls `player.playVideo()` or `player.seekTo()`, the YouTube IFrame API fires `onStateChange`.
   - Use a ref `isApplyingRemoteState.current = true` with a $400\text{ ms}$ cooldown so Client B does not re-emit the same event back to the server.
3. **Mobile Viewport CSS (`index.css`):**
   ```css
   html, body, #root {
     height: 100dvh;
     width: 100vw;
     overflow: hidden;
     overscroll-behavior: none;
     background-color: #09090F;
     color: #FAFAFC;
     -webkit-tap-highlight-color: transparent;
     user-select: none;
   }
   ```

---

## 7. Phased Execution Plan for Antigravity

Execute the build in the following sequential phases:

- **Phase 1: Workspace & Backend Setup**
  1. Initialize `/server` with `express`, `socket.io`, and `cors`.
  2. Build `server/index.js` handling rooms, user presence, playback sync math, queue advancement, chat history, and emoji broadcasts.
- **Phase 2: Frontend App Shell & Native Mobile Styling**
  1. Scaffold `/client` with Vite + React + Tailwind CSS + `framer-motion` + `lucide-react` + `socket.io-client`.
  2. Configure `index.html` with PWA meta tags and `index.css` with custom vinyl groove gradients and `100dvh` mobile locking.
- **Phase 3: Hidden YouTube Engine & Sync Hook**
  1. Create `useYouTubeSync.js` using the official YouTube IFrame API script loader.
  2. Implement `AudioUnlockModal.jsx`, drift threshold checking ($\Delta t > 1.5\text{ s}$), `isRemoteUpdate` loop guard, and `visibilitychange` auto-resync when returning from background apps.
- **Phase 4: Turntable Stage & Couple Features**
  1. Build `VinylTurntable.jsx` with spinning record, album art center label, and animated tonearm.
  2. Build `PlayerControls.jsx`, `FloatingReactions.jsx`, and `BottomNavDock.jsx`.
- **Phase 5: Slide-Up Drawers (Search, Queue, Chat)**
  1. Build `SearchDrawer.jsx` with YouTube oEmbed link parser + YouTube API v3 + Curated Indian Romantic/Lofi tracks.
  2. Build `QueueDrawer.jsx` and `ChatDrawer.jsx` with unread message badge support.
- **Phase 6: Verification & Run Scripts**
  1. Add a root `package.json` with `"dev"` script to start both backend (`PORT=4000`) and frontend (`PORT=5173`) concurrently.
  2. Test two browser windows side-by-side in mobile viewport mode (`?room=LOVE24`) to verify room join, audio unlock, play/pause/seek sync, queue auto-advance, live chat, and floating hearts.