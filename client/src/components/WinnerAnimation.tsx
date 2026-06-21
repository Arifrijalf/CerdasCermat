import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinnerAnimationProps {
  teamName: string;
  visible: boolean;
  onComplete?: () => void;
}

export default function WinnerAnimation({ teamName, visible, onComplete }: WinnerAnimationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 4000);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [visible, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md"
        >
          <div className="text-center relative">
            <motion.div
              initial={{ scale: 0.3, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
              className="text-7xl md:text-9xl font-black tracking-wider text-warning"
              style={{ textShadow: '0 0 40px rgba(234,179,8,0.5), 0 4px 8px rgba(0,0,0,0.5)' }}
            >
              WINNER
            </motion.div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
              className="text-3xl md:text-5xl font-bold text-white mt-4"
            >
              {teamName}
            </motion.div>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i * 45 * Math.PI) / 180) * 150,
                  y: Math.sin((i * 45 * Math.PI) / 180) * 150,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.2, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-warning"
                style={{ marginTop: -4, marginLeft: -4 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
