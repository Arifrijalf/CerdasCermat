import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, SkipForward, ArrowRightLeft } from 'lucide-react';

interface AnswerPanelProps {
  winnerId: string | null;
  winnerName: string | null;
  onCorrect: (teamId: string, points?: number) => void;
  onWrong: (teamId: string, points?: number) => void;
  onSkip: () => void;
  onRebuttalStart: () => void;
}

const POINT_OPTIONS = [5, 10, 15, 20];

export default function AnswerPanel({ winnerId, winnerName, onCorrect, onWrong, onSkip, onRebuttalStart }: AnswerPanelProps) {
  const [points, setPoints] = useState(10);
  const [wrongPoints, setWrongPoints] = useState(0);

  if (!winnerId) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader>
        <CardTitle className="text-warning">Answer Validation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-text-secondary">
            Winner: <span className="font-semibold text-text">{winnerName}</span>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-text-muted">Points: {points}</span>
            <div className="flex gap-1.5">
              {POINT_OPTIONS.map(p => (
                <Button
                  key={p}
                  variant={points === p ? 'success' : 'ghost'}
                  size="xs"
                  onClick={() => setPoints(p)}
                  className="font-mono"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="success" onClick={() => onCorrect(winnerId, points)}>
              <CheckCircle className="w-4 h-4" />
              Correct
            </Button>
            <Button variant="destructive" onClick={() => onWrong(winnerId, wrongPoints)}>
              <XCircle className="w-4 h-4" />
              Wrong
            </Button>
            <Button variant="secondary" onClick={onSkip}>
              <SkipForward className="w-4 h-4" />
              Skip
            </Button>
          </div>

          {wrongPoints > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-danger">Penalty: -{wrongPoints}</span>
              <div className="flex gap-1.5">
                {POINT_OPTIONS.map(p => (
                  <Button
                    key={p}
                    variant={wrongPoints === p ? 'destructive' : 'ghost'}
                    size="xs"
                    onClick={() => setWrongPoints(p)}
                    className="font-mono"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onRebuttalStart}>
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Activate Rebuttal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
