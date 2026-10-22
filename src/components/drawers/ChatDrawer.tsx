import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Send, X, Heart } from 'lucide-react';
import { ChatMessage, RoomUser } from '../../types/syncvibe';

const QUICK_COUPLE_PROMPTS = [
  'This song reminds me of us 💖',
  'Listen to this verse! 🥺✨',
  'Missing you right now ❤️',
  'Best late night vibe 🌙🎶',
];

interface ChatDrawerProps {
  isOpen: boolean;
  messages: ChatMessage[];
  currentUserName: string;
  users: RoomUser[];
  partnerTypingName: string | null;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  onToggleDemoPartner: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  messages,
  currentUserName,
  users,
  partnerTypingName,
  onClose,
  onSendMessage,
  onTypingChange,
  onToggleDemoPartner,
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, partnerTypingName]);

  const handleInputChange = (val: string) => {
    setText(val);
    onTypingChange(val.trim().length > 0);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      onTypingChange(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
    onTypingChange(false);
  };

  const formatChatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const hasPartner = users.length >= 2;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Couple Live Chat"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-40 h-[82%] pb-20 rounded-t-3xl bg-[#12121A]/96 backdrop-blur-2xl border-t border-white/15 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#FAFAFC]">
                  Couple Hangout Chat
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  {hasPartner
                    ? `${users.map((u) => `${u.avatar} ${u.name}`).join(' · ')}`
                    : 'Waiting for partner — or invite Demo Partner Ananya'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!hasPartner && (
                  <button
                    type="button"
                    onClick={onToggleDemoPartner}
                    className="h-8 px-2.5 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    + Pair Ananya 💖
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Chat Drawer"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#A1A1AA] hover:text-white shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
              {messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="mx-auto max-w-[90%] text-center px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#A1A1AA]"
                    >
                      {msg.text}
                    </div>
                  );
                }

                const isOwn = msg.senderName === currentUserName;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isOwn ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-[#A1A1AA]">
                      <span>{msg.avatar}</span>
                      <span className="font-medium text-zinc-300">
                        {isOwn ? 'You' : msg.senderName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {formatChatTime(msg.timestamp)}
                      </span>
                    </div>

                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-gradient-to-r from-[#FF2E63] to-[#8B5CF6] text-white rounded-br-xs shadow-md shadow-[#FF2E63]/15'
                          : 'bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#FAFAFC] rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {partnerTypingName && (
                <div className="flex items-center gap-2 text-xs text-[#A1A1AA] italic pl-1">
                  <Heart className="w-3.5 h-3.5 text-[#FF2E63] animate-bounce" />
                  <span>{partnerTypingName} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Romantic Prompts */}
            <div className="px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/5 shrink-0">
              {QUICK_COUPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[11px] text-zinc-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Sticky Bottom Chat Input */}
            <form
              onSubmit={handleSubmit}
              className="p-3.5 bg-[#09090F]/90 border-t border-white/10 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Write a sweet note to your partner..."
                aria-label="Chat message input"
                className="flex-1 h-11 px-4 rounded-2xl bg-white/[0.06] border border-white/10 text-sm text-[#FAFAFC] placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E63] transition-colors"
              />
              <button
                type="submit"
                aria-label="Send Message"
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF2E63] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
