import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface BuzzerButtonProps {
  teamName: string;
  disabled: boolean;
  winner: string | null;
  winnerName: string | null;
  isWinner: boolean;
  onBuzz: () => void;
  teamColor?: string;
}

export default function BuzzerButton({
  teamName,
  disabled,
  winner,
  winnerName,
  isWinner,
  onBuzz,
  teamColor,
}: BuzzerButtonProps) {
  if (isWinner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-6xl font-black tracking-tight text-warning"
          style={{ textShadow: '0 0 40px rgba(234,179,8,0.3)' }}
        >
          YOU WIN!
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-xl font-medium text-text-secondary"
        >
          {teamName}
        </motion.div>
      </div>
    );
  }

  if (disabled && winner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="text-5xl font-black tracking-widest text-text-muted">
          LOCKED
        </div>
        <div className="text-lg text-text-muted">
          Winner: {winnerName ?? winner}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 pt-16">
      <div className="text-sm font-semibold tracking-widest uppercase text-text-muted">
        {teamName}
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.03 }}
        onClick={onBuzz}
        disabled={disabled}
        aria-label="Buzz"
        className="flex items-center justify-center rounded-full text-white font-black text-4xl tracking-widest cursor-pointer select-none border-0 outline-none focus-visible:ring-4 focus-visible:ring-white/30 disabled:opacity-0 disabled:pointer-events-none"
        style={{
          width: 'min(280px, 70vw)',
          height: 'min(280px, 70vw)',
          background: teamColor || 'var(--color-danger)',
          boxShadow: `0 8px 32px ${teamColor || 'var(--color-danger)'}4D, 0 0 0 4px ${teamColor || 'var(--color-danger)'}1A, inset 0 -4px 12px rgba(0,0,0,0.3)`,
          touchAction: 'manipulation',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <Zap className="w-12 h-12" />
          BUZZ
        </div>
      </motion.button>
    </div>
  );
}
