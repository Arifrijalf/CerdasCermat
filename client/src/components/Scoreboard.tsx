import { useState } from 'react';
import type { TeamConfig } from '@quickbuzz/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Pencil, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScoreboardProps {
  teams: TeamConfig[];
  onAddScore: (teamId: string, points: number) => void;
  onSetScore: (teamId: string, score: number) => void;
}

const QUICK_POINTS = [-10, -5, 5, 10, 20];

export default function Scoreboard({ teams, onAddScore, onSetScore }: ScoreboardProps) {
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const sorted = [...teams].filter(t => t.enabled).sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" />
          Scoreboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-px">
          {sorted.map((team, idx) => (
            <motion.div
              key={team.id}
              initial={false}
              layout
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-bg-subtle transition-colors"
            >
              <span className="text-xs font-bold text-text-muted min-w-[24px]">#{idx + 1}</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: team.color }} />
              <span className="flex-1 font-semibold text-sm truncate">{team.name}</span>
              <span className="font-mono text-lg font-bold min-w-[48px] text-right tabular-nums">{team.score}</span>
              <div className="flex gap-1 flex-wrap">
                {QUICK_POINTS.map((p) => (
                  <Button
                    key={p}
                    variant="ghost"
                    size="xs"
                    onClick={() => onAddScore(team.id, p)}
                    className="font-mono tabular-nums"
                  >
                    {p > 0 ? `+${p}` : p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => { setEditingTeam(team.id); setEditValue(String(team.score)); }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
              {editingTeam === team.id && (
                <div className="flex items-center gap-1.5 w-full mt-1">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-24 h-8"
                    autoFocus
                  />
                  <Button size="xs" variant="success" onClick={() => { onSetScore(team.id, parseInt(editValue) || 0); setEditingTeam(null); }}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingTeam(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
