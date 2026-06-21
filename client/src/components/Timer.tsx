import { useEffect, useState, useRef } from 'react';
import type { TimerState } from '@quickbuzz/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

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
  const pct = timer.duration > 0 ? Math.max(0, Math.min(100, (displayRemaining / timer.duration) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${timer.running ? 'duration-100' : 'duration-300'} ${isExpired ? 'bg-danger' : 'bg-accent'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className={`text-center font-mono text-4xl font-bold tabular-nums ${isExpired ? 'text-danger animate-pulse' : 'text-text'}`}>
            {Math.ceil(displayRemaining)}s
          </div>
          {isExpired && (
            <div className="text-center text-sm font-bold tracking-widest text-danger uppercase">
              Time's Up!
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {DURATIONS.map(d => (
              <Button
                key={d}
                variant={timer.duration === d ? 'default' : 'ghost'}
                size="xs"
                onClick={() => onSet(d)}
                className="font-mono tabular-nums"
              >
                {d}s
              </Button>
            ))}
          </div>
          <div className="flex gap-2 justify-center">
            {!timer.running ? (
              <Button variant="success" size="sm" onClick={onStart} disabled={isExpired}>
                <Play className="w-3.5 h-3.5" />
                Start
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onPause}>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
