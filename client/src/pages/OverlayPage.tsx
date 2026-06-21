import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

interface OverlayPageProps {
  view: 'winner' | 'score' | 'timer' | 'bracket';
}

export default function OverlayPage({ view }: OverlayPageProps) {
  const { status } = useSocket();

  useEffect(() => {
    document.body.classList.add('obs-overlay');
    return () => document.body.classList.remove('obs-overlay');
  }, []);

  const teams = status?.teams ?? [];
  const sorted = [...teams].filter(t => t.enabled).sort((a, b) => b.score - a.score);
  const winnerName = status?.winnerName;
  const timer = status?.timer;
  const remaining = timer?.remaining ?? 0;
  const bracket = status?.bracket;

  if (view === 'winner') {
    return (
      <div className="overlay overlay-winner">
        {winnerName ? (
          <div className="overlay-winner-text">{winnerName}</div>
        ) : (
          <div className="overlay-winner-text dim">No winner</div>
        )}
      </div>
    );
  }

  if (view === 'score') {
    return (
      <div className="overlay overlay-score">
        <div className="overlay-score-list">
          {sorted.slice(0, 5).map((t, i) => (
            <div key={t.id} className="overlay-score-row">
              <span className="overlay-rank">#{i + 1}</span>
              <span className="overlay-name" style={{ color: t.color }}>{t.name}</span>
              <span className="overlay-pts">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'timer') {
    return (
      <div className="overlay overlay-timer">
        <div className={`overlay-timer-value ${remaining <= 5 ? 'urgent' : ''}`}>
          {Math.ceil(remaining)}s
        </div>
      </div>
    );
  }

  if (view === 'bracket') {
    return (
      <div className="overlay overlay-bracket">
        {bracket && bracket.matches.length > 0 ? (
          <div className="overlay-bracket-list">
            {bracket.matches.map(m => (
              <div key={m.id} className="overlay-bracket-match">
                <span className="overlay-bracket-team">{m.team1Id ? teams.find(t => t.id === m.team1Id)?.name ?? 'TBD' : 'TBD'}</span>
                <span className="overlay-bracket-vs">vs</span>
                <span className="overlay-bracket-team">{m.team2Id ? teams.find(t => t.id === m.team2Id)?.name ?? 'TBD' : 'TBD'}</span>
                {m.winnerId && <span className="overlay-bracket-winner">✓</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="overlay-bracket-empty dim">No bracket</div>
        )}
      </div>
    );
  }

  return null;
}
