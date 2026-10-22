import React, { useState } from 'react';
import { Share2, Check, RefreshCw, UserPlus, LogOut } from 'lucide-react';
import { RoomUser } from '../types/syncvibe';

interface TopHeaderBarProps {
  roomId: string;
  users: RoomUser[];
  syncState: 'synced' | 'syncing';
  driftMs: number;
  onForceSync: () => void;
  onToggleDemoPartner: () => void;
  onLeaveRoom: () => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  roomId,
  users,
  syncState,
  onForceSync,
  onToggleDemoPartner,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShareRoom = async () => {
    const shareUrl = `${window.location.origin}/?room=${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my SyncVibe Room #${roomId}`,
          text: `Listen to music together with me in real-time on SyncVibe! Room Code: ${roomId}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasPartner = users.length >= 2;

  return (
    <header className="h-14 w-full flex items-center justify-between gap-2 shrink-0">
      {/* Left: Room Code + Share / Leave */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onLeaveRoom}
          aria-label="Leave Room"
          title="Back to Lobby"
          className="min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleShareRoom}
          aria-label={`Copy invite link for room ${roomId}`}
          className="h-10 px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="font-mono-tabular text-xs font-semibold tracking-wider text-[#FAFAFC]">
            #{roomId}
          </span>
          {copied ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#10B981]">
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </span>
          ) : (
            <Share2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
          )}
        </button>
      </div>

      {/* Center: Sync Status Button (clickable to force manual re-sync) */}
      <button
        type="button"
        onClick={onForceSync}
        aria-label="Force audio synchronization"
        title="Tap to re-sync playback with room"
        className="h-9 px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${
            syncState === 'syncing'
              ? 'text-amber-400 animate-spin'
              : 'text-[#10B981]'
          }`}
        />
        <span
          className={
            syncState === 'syncing' ? 'text-amber-300' : 'text-[#FAFAFC]'
          }
        >
          {syncState === 'syncing' ? 'Syncing' : 'Synced'}
        </span>
      </button>

      {/* Right: Partner Avatars Stack or Invite Partner Button */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center -space-x-2">
          {users.slice(0, 3).map((u) => (
            <div
              key={u.socketId}
              title={`${u.name} (${u.status})`}
              className="w-9 h-9 rounded-full bg-[#181824] border-2 border-[#09090F] flex items-center justify-center text-sm shadow-sm"
            >
              <span>{u.avatar}</span>
            </div>
          ))}
        </div>

        {!hasPartner ? (
          <button
            type="button"
            onClick={onToggleDemoPartner}
            aria-label="Invite Demo Partner Ananya"
            title="Pair with Demo Partner Ananya"
            className="h-9 px-2.5 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/40 text-xs font-medium text-[#FAFAFC] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="hidden xs:inline">Pair Partner</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleDemoPartner}
            aria-label="Partner Presence Status"
            title={users.map((u) => u.name).join(' & ')}
            className="h-9 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#A1A1AA] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>2/2 Live</span>
          </button>
        )}
      </div>
    </header>
  );
};
