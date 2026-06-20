import { useState } from 'react';
import type { TeamConfig } from '@quickbuzz/shared';

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
    <div className="scoreboard">
      <h3>Scoreboard</h3>
      <div className="scoreboard-list">
        {sorted.map((team, idx) => (
          <div key={team.id} className="scoreboard-row" style={{ '--team-color': team.color } as React.CSSProperties}>
            <div className="scoreboard-rank">#{idx + 1}</div>
            <div className="scoreboard-color" style={{ background: team.color }} />
            <div className="scoreboard-name">{team.name}</div>
            <div className="scoreboard-score">{team.score}</div>
            <div className="scoreboard-actions">
              {QUICK_POINTS.map((p) => (
                <button key={p} className="btn btn-tiny btn-score" onClick={() => onAddScore(team.id, p)}>
                  {p > 0 ? `+${p}` : p}
                </button>
              ))}
              <button className="btn btn-tiny btn-edit" onClick={() => { setEditingTeam(team.id); setEditValue(String(team.score)); }}>
                Set
              </button>
            </div>
            {editingTeam === team.id && (
              <div className="scoreboard-edit">
                <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="input input-sm" autoFocus />
                <button className="btn btn-tiny btn-start" onClick={() => { onSetScore(team.id, parseInt(editValue) || 0); setEditingTeam(null); }}>Save</button>
                <button className="btn btn-tiny btn-reset" onClick={() => setEditingTeam(null)}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
