import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FloatingReaction } from '../types/syncvibe';

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({
  reactions,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-20"
      aria-hidden="true"
    >
      <AnimatePresence>
        {reactions.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              opacity: 0,
              y: 260,
              x: 0,
              scale: 0.6,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -40,
              x: [0, -14, 12, -8, 0],
              scale: [0.7, 1.25, 1.1, 0.9],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.6,
              ease: 'easeOut',
            }}
            style={{ left: `${item.xOffset}%` }}
            className="absolute bottom-6 flex flex-col items-center"
          >
            <span className="text-2xl sm:text-3xl drop-shadow-[0_4px_12px_rgba(255,46,99,0.45)]">
              {item.emoji}
            </span>
            <span className="text-[10px] font-medium text-white/80 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-md mt-0.5 whitespace-nowrap">
              {item.senderName}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
