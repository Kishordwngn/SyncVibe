import React, { useState } from 'react';
import { Heart, Radio, ArrowRight, Sparkles, Download, Users } from 'lucide-react';
import { generateRoomCode, normalizeRoomCode } from '../utils/syncMath';
import { usePWAInstall } from '../hooks/usePWAInstall';

const AVATAR_OPTIONS = ['🎧', '💖', '🌙', '🦋', '🎸', '🧸'];

interface LobbyScreenProps {
  initialNickname: string;
  initialAvatar: string;
  initialRoomCode?: string;
  onEnterRoom: (roomId: string, userName: string, avatar: string, unlockedDirectly: boolean) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  initialNickname,
  initialAvatar,
  initialRoomCode = '',
  onEnterRoom,
}) => {
  const [nickname, setNickname] = useState(initialNickname || 'Aarav');
  const [avatar, setAvatar] = useState(
    AVATAR_OPTIONS.includes(initialAvatar) ? initialAvatar : '🎧'
  );
  const [joinCode, setJoinCode] = useState(initialRoomCode || 'LOVE24');
  const [errorMessage, setErrorMessage] = useState('');
  const [showIOSModal, setShowIOSModal] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const validateNickname = (): string | null => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your nickname to enter the room.');
      return null;
    }
    setErrorMessage('');
    return trimmed;
  };

  const handleCreateRoom = () => {
    const validName = validateNickname();
    if (!validName) return;
    const newCode = generateRoomCode();
    onEnterRoom(newCode, validName, avatar, true);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const validName = validateNickname();
    if (!validName) return;

    const cleanCode = normalizeRoomCode(joinCode);
    if (cleanCode.length < 4) {
      setErrorMessage('Please enter a valid 4 to 6 character room code (e.g. LOVE24).');
      return;
    }
    setErrorMessage('');
    onEnterRoom(cleanCode, validName, avatar, true);
  };

  return (
    <div className="flex flex-col justify-between h-full w-full px-5 py-6 overflow-y-auto no-scrollbar select-none">
      {/* Top Branding */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF2E63]/20 to-[#8B5CF6]/20 border border-white/15 shadow-lg shadow-[#FF2E63]/10 mb-3">
          <Radio className="w-7 h-7 text-[#FF2E63] absolute -translate-x-1.5" />
          <Heart className="w-6 h-6 text-[#8B5CF6] fill-[#8B5CF6]/40 translate-x-2 -translate-y-1" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FAFAFC]">
            SyncVibe
          </h1>
          <span className="text-xs font-medium text-[#A1A1AA]">· BeatSetu</span>
        </div>
        <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 max-w-[260px]">
          Listen together, feel closer. Real-time vinyl music room for two.
        </p>
      </div>

      {/* Profile & Room Entry Card */}
      <div className="w-full space-y-4 my-auto py-3">
        {/* Profile Setup Card */}
        <div className="rounded-3xl bg-[#181822]/75 backdrop-blur-xl border border-white/10 p-4 space-y-3.5">
          <div>
            <label
              htmlFor="nickname-input"
              className="block text-xs font-semibold text-[#FAFAFC] mb-1.5"
            >
              Your Nickname
            </label>
            <input
              id="nickname-input"
              type="text"
              maxLength={20}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter your name (e.g. Aarav)"
              className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 text-sm text-[#FAFAFC] placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E63] transition-colors"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#FAFAFC] mb-1.5">
              Choose Your Vibe Avatar
            </span>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Choose Avatar">
              {AVATAR_OPTIONS.map((item) => {
                const isSelected = avatar === item;
                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Avatar ${item}`}
                    onClick={() => setAvatar(item)}
                    className={`h-11 rounded-xl flex items-center justify-center text-lg transition-all ${
                      isSelected
                        ? 'bg-gradient-to-tr from-[#FF2E63] to-[#8B5CF6] text-white shadow-md shadow-[#FF2E63]/25 scale-105'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="text-xs font-medium text-[#FF2E63] pt-0.5">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Create New Room CTA */}
        <button
          type="button"
          onClick={handleCreateRoom}
          className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#FF2E63] to-[#8B5CF6] text-[#FAFAFC] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E63]/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Create New Couple Room</span>
        </button>

        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] font-medium text-[#A1A1AA]">or join partner&apos;s room</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Join Existing Room Form */}
        <form
          onSubmit={handleJoinRoom}
          className="rounded-3xl bg-[#181822]/75 backdrop-blur-xl border border-white/10 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="room-code-input"
              className="text-xs font-semibold text-[#FAFAFC]"
            >
              Partner&apos;s Room Code
            </label>
            <button
              type="button"
              onClick={() => setJoinCode('LOVE24')}
              className="text-[11px] font-medium text-[#FF2E63] hover:underline cursor-pointer"
            >
              Use Demo #LOVE24
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="room-code-input"
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
              placeholder="LOVE24"
              className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 font-mono-tabular text-base font-semibold tracking-widest uppercase text-[#FAFAFC] placeholder:text-zinc-600 focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-semibold text-[#FAFAFC] flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              <span>Join Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Footer & Optional PWA Install Action */}
      <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#8B5CF6]" />
          <span>28+ Bollywood &amp; Indie Lofi Tracks Ready</span>
        </div>

        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={install}
            className="flex items-center gap-1 text-xs font-semibold text-[#FF2E63] hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        {!isInstalled && !isInstallable && isIOS && (
          <button
            type="button"
            onClick={() => setShowIOSModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-[#FF2E63] hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install on iOS</span>
          </button>
        )}
      </div>

      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install SyncVibe on iOS"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-xs rounded-3xl bg-[#181822] border border-white/15 p-5 space-y-3 text-left shadow-2xl">
            <h2 className="text-base font-bold text-[#FAFAFC]">Add SyncVibe to Home Screen</h2>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              1. Tap the <strong className="text-white">Share</strong> icon in Safari&apos;s bottom bar.
              <br />
              2. Scroll down and select <strong className="text-white">Add to Home Screen</strong> for a full-screen couple music experience.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full h-10 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/15"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
