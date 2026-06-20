import { useEffect, useState } from 'react';

interface WinnerAnimationProps {
  teamName: string;
  visible: boolean;
  onComplete?: () => void;
}

export default function WinnerAnimation({
  teamName,
  visible,
  onComplete,
}: WinnerAnimationProps) {
  const [show, setShow] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'idle' | 'exit'>('idle');

  useEffect(() => {
    if (visible) {
      setShow(true);
      setAnimationPhase('enter');
      const t1 = setTimeout(() => setAnimationPhase('idle'), 800);
      const t2 = setTimeout(() => {
        setAnimationPhase('exit');
        setShow(false);
        onComplete?.();
      }, 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setShow(false);
      setAnimationPhase('exit');
    }
  }, [visible, onComplete]);

  if (!show) return null;

  return (
    <div className={`winner-overlay ${animationPhase}`}>
      <div className="winner-overlay-content">
        <div className="winner-stamp">WINNER</div>
        <div className="winner-team-name">{teamName}</div>
        <div className="winner-sparkles">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="sparkle"
              style={{
                '--angle': `${i * 30}deg`,
                '--delay': `${i * 0.1}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
