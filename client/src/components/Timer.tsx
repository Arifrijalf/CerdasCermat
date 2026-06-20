import { useEffect, useState, useRef } from 'react';
import type { TimerState } from '@quickbuzz/shared';

interface TimerProps {
  timer: TimerState;
  onSet: (duration: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

const DURATIONS = [5, 10, 15, 20, 30, 60];

export default function Timer({ timer, onSet, onStart, onPause, onResume: _onResume, onReset }: TimerProps) {
  const [displayRemaining, setDisplayRemaining] = useState(timer.remaining);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      if (timer.running && timer.startedAt) {
        const elapsed = (Date.now() - timer.startedAt) / 1000;
        setDisplayRemaining(Math.max(0, timer.remaining - elapsed));
      } else {
        setDisplayRemaining(timer.remaining);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [timer.running, timer.startedAt, timer.remaining]);

  const isExpired = displayRemaining <= 0;
  const progress = timer.duration > 0 ? displayRemaining / timer.duration : 0;
  const pct = Math.max(0, Math.min(100, progress * 100));

  return (
    <div className={`timer-panel ${timer.running ? 'running' : ''} ${isExpired ? 'expired' : ''}`}>
      <h3>Timer</h3>
      <div className="timer-bar-bg">
        <div className="timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className={`timer-value ${isExpired ? 'expired' : ''}`}>
        {Math.ceil(displayRemaining)}s
      </div>
      {isExpired && <div className="timer-expired-msg">TIME'S UP!</div>}
      <div className="timer-controls">
        <div className="timer-duration-select">
          {DURATIONS.map(d => (
            <button key={d} className={`btn btn-tiny ${timer.duration === d ? 'btn-start' : ''}`} onClick={() => onSet(d)}>
              {d}s
            </button>
          ))}
        </div>
        <div className="timer-actions">
          {!timer.running ? (
            <button className="btn btn-small btn-start" onClick={onStart} disabled={isExpired}>Start</button>
          ) : (
            <button className="btn btn-small btn-reset" onClick={onPause}>Pause</button>
          )}
          <button className="btn btn-small btn-export" onClick={onReset}>Reset</button>
        </div>
      </div>
    </div>
  );
}
