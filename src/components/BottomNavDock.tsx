import React from 'react';
import { Disc3, Search, ListMusic, MessageCircleHeart } from 'lucide-react';
import { ActiveDrawer } from '../types/syncvibe';

interface BottomNavDockProps {
  activeDrawer: ActiveDrawer;
  queueCount: number;
  unreadChatCount: number;
  onSelectTab: (tab: ActiveDrawer) => void;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeDrawer,
  queueCount,
  unreadChatCount,
  onSelectTab,
}) => {
  const tabs: {
    id: ActiveDrawer;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    isAlertBadge?: boolean;
  }[] = [
    {
      id: 'none',
      label: 'Player',
      icon: Disc3,
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
    },
    {
      id: 'queue',
      label: 'Queue',
      icon: ListMusic,
      badge: queueCount,
    },
    {
      id: 'chat',
      label: 'Couple Chat',
      icon: MessageCircleHeart,
      badge: unreadChatCount,
      isAlertBadge: true,
    },
  ];

  return (
    <nav
      aria-label="Room Navigation"
      className="relative z-50 h-16 w-full rounded-2xl bg-[#181822]/95 backdrop-blur-2xl border border-white/10 grid grid-cols-4 items-center px-1.5 shrink-0 shadow-xl"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeDrawer === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              onSelectTab(isActive && tab.id !== 'none' ? 'none' : tab.id)
            }
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={`relative h-13 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isActive
                ? 'text-[#FF2E63] bg-white/[0.06]'
                : 'text-[#A1A1AA] hover:text-[#FAFAFC]'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-mono-tabular font-bold flex items-center justify-center ${
                    tab.isAlertBadge
                      ? 'bg-[#FF2E63] text-white'
                      : 'bg-[#8B5CF6] text-white'
                  }`}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-tight mt-1 whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
