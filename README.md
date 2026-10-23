# 🎧 SyncVibe (BeatSetu) — Couple Music Hangout Web App

> **"Listen together, feel closer."**  
> Ek real-time, synchronized music listening aur couple hangout platform jahan do log (couples ya close friends) bilkul ek hi second par bina audio lag ke music sun sakte hain, chahe wo hazaron kilometer door kyu na hon.

---

## 📌 1. Yeh Project Kya Hai? (What is SyncVibe?)

**SyncVibe** ek mobile-first Progressive Web App (PWA) hai jo couples aur close friends ke liye design kiya gaya hai:
- **Zero Login Friction:** Koi heavy email ya password login nahi chahiye. Bas apna nickname aur avatar chuniye, 1-click me room banayein, aur room code (`#LOVE24`) share karein.
- **Spinning Vinyl Record & Tonearm:** Traditional video player ki jagah ek vintage spinning vinyl disc aur animated stylus tonearm UI diya gaya hai jo gaana bajne par ghumta hai aur pause karne par ruk jata hai.
- **Dynamic Ambient Glow:** Jo bhi gaana chal raha hota hai, uska album art background mein heavily blur hoke pure screen ka romantic mood automatically change kar deta hai.
- **Couple Interactions:** 
  - Real-time live couple chat (typing indicators + quick romantic prompts ke sath).
  - Floating emoji & heart bursts (`❤️`, `🔥`, `🥺`, `✨`, `🥰`) jo screen par hawa mein tairte hain dono partners ke screen par ek sath.
  - Solo testing ke liye **Demo Partner (Ananya 💖)** toggle mode.

---

## ⚙️ 2. Yeh Kaise Kaam Karta Hai? (How It Works & Architecture)

SyncVibe direct raw audio server se stream **nahi** karta (kyunki server se stream karne par bandwidth bohot lagti hai aur lag aata hai). Iski jagah yeh ek **Authoritative Playback State Machine** model follow karta hai:

### A. Core Architecture Diagram
```text
Partner A (Mobile)                      Server (Node.js + Socket.io)                   Partner B (Mobile)
      │                                             │                                          │
      ├── [Action: Play / Seek 01:24] ─────────────>│                                          │
      │                                             ├── [Update Room State]                    │
      │                                             │   • T_host = 84s                         │
      │                                             │   • t_updated = Date.now()               │
      │                                             │   • isPlaying = true                     │
      │                                             │                                          │
      │<── [Broadcast sync_playback] ───────────────┼───────────────── [Broadcast sync_playback] ──>│
      │                                             │                                          │
   [Local YouTube Engine]                                                                   [Local YouTube Engine]
   Plays audio at 84s                                                                       Snaps audio to 84s
```

### B. Mathematical Synchronization & Anti-Stutter Formula
Server room ka state maintain karta hai:
- **$T_{\text{host}}$**: Gaane ka timestamp (seconds mein) jab aakhri baar play ya seek kiya gaya.
- **$t_{\text{updated}}$**: Server ka timestamp (milliseconds mein) jab action hua.
- **$\text{isPlaying}$**: Playback state boolean.

Target position nikalne ka formula:
$$T_{\text{target}} = \begin{cases} T_{\text{host}} + \dfrac{t_{\text{now}} - t_{\text{updated}}}{1000} & \text{agar } \text{isPlaying} = \text{true} \\ T_{\text{host}} & \text{agar } \text{isPlaying} = \text{false} \end{cases}$$

#### 1.5s Anti-Stutter Drift Rule:
- Agar dono users ke beech local audio aur target time ka drift $\Delta t \le 1.5\text{ s}$ hai, toh hard `seekTo` trigger nahi hota taaki song mein stutter ya jhatka na lage.
- Agar $\Delta t > 1.5\text{ s}$ ho jaye (e.g. call aane par ya tab switch karne par), player foran smoothly snap ho jata hai.
- **App Switching Auto-Resync:** Jab user phone me WhatsApp ya dusre app par switch karke wapas aata hai, toh `visibilitychange` listener background drift ko automatically detect karke instant re-sync kar deta hai.

### C. Live YouTube Search Engine (Zero API Key Needed)
- Server par `/api/youtube-search` endpoint banaya gaya hai.
- Yeh real-time mein YouTube ke music search data ko query karke live titles, channels, duration, aur thumbnails nikalta hai.
- Iska matlab user **duniya ka koi bhi gaana, movie song, ya singer** (Bollywood, Punjabi, Indie, International, Lofi) search karke play kar sakta hai bina kisi paid Google API key ke.
- Saath hi direct YouTube video URL paste karne ka option bhi fully supported hai.

---

## 🛠️ 3. Tech Stack Details

### Frontend:
- **Framework:** React 19 + TypeScript (SPA on Vite 8)
- **Styling:** Tailwind CSS v4 + Custom Vinyl groove radial gradients
- **Animations:** Motion (`motion/react` / `framer-motion`) — Bottom sheets, floating hearts, and tonearm pivots
- **Icons:** `lucide-react`
- **Real-Time Client:** `socket.io-client`
- **Audio Engine:** Hidden YouTube IFrame API controller (with auto-sync loop guard & Web Audio fallback)
- **PWA Capabilities:** Standalone mobile manifest (`/manifest.json`), 100dvh viewport locking, iOS Safari touch tags

### Backend (Full-Stack Unified Server):
- **Runtime:** Node.js (v22+)
- **Server:** Express.js + Native HTTP Server
- **WebSockets / Real-Time:** `socket.io` (running on the same port 3000)
- **State Store:** High-Speed In-Memory Room Store (`Map<string, RoomState>`) with automatic 2-hour inactivity cleanup
- **Search Scraping / Proxy:** Native fetch + `ytInitialData` parser for unlimited live YouTube songs

---

## 📱 4. Key Screens & Features

1. **Lobby Screen:**
   - Nickname input (auto-saved in `localStorage`).
   - Avatar picker (`🎧`, `💖`, `🌙`, `🦋`, `🎸`, `🧸`).
   - 1-Click "Create New Couple Room" (Starts paused taaki create hote hi gaana na bajne lage).
   - "Join Partner's Room" with 6-character code (e.g. `#LOVE24`).
2. **Audio Unlock Gate Modal:**
   - Mobile browsers (Safari/Chrome) ke autoplay restriction ko clean UX se unlock karne ke liye "Tap to Sync Music & Join Room" modal.
3. **Player Screen (Vinyl Stage):**
   - Spinning Vinyl record with active song album art label.
   - Pivoting SVG stylus tonearm.
   - Editable room dedication status note (e.g., *"Late Night Lofi with You"*).
   - Monospace current time & duration scrubber.
   - Quick reaction bar (`❤️`, `🔥`, `🥺`, `✨`, `🥰`).
4. **Interactive Slide-Up Drawers:**
   - **Search Drawer:** Unlimited live YouTube search + direct link pasting + curated mood categories.
   - **Queue Drawer:** Shared Up Next list, add/remove songs, reorder, auto-advance to next song on finish.
   - **Couple Chat Drawer:** Live messaging with partner typing indicator ("Ananya is typing...").
5. **Desktop Companion Mode:**
   - Mobile view me 100dvh native phone app shell.
   - Desktop widescreen (1440px) par centered sleek phone frame + side-by-side **Couple Studio Companion** panel for live telemetry and invite links.

---

## 🚀 5. Deployment Guide (Kahan Aur Kaise Deploy Karein?)

Kyuki yeh app **Frontend + Socket.io Backend** dono ko ek hi unified server file (`server.ts`) me run karta hai, isko alag-alag deploy karne ki bilkul zarurat nahi hai!

### Option 1: AI Studio / Google Cloud Run (1-Click)
- Top-right corner me **Deploy** button dabayein. AI Studio isko automatically Cloud Run par live public HTTPS URL par deploy kar dega.

### Option 2: Render.com (Recommended for Free Hosting)
1. Code GitHub repository me daalein.
2. Render.com par jayein -> **New Web Service** -> GitHub repo select karein.
3. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Port:** `3000` (ya Render ka default `$PORT`)

### Option 3: Railway / Fly.io / VPS
- Kisi bhi server par `npm install && npm run build && npm start` run karne se production server start ho jata hai.
