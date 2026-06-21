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
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        {winnerName ? (
          <div className="text-6xl font-black text-yellow-400 tracking-wider"
            style={{ textShadow: '0 0 40px rgba(250,204,21,0.4)' }}>
            {winnerName}
          </div>
        ) : (
          <div className="text-4xl text-white/30 font-bold">No winner</div>
        )}
      </div>
    );
  }

  if (view === 'score') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {sorted.slice(0, 5).map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2 bg-black/50 rounded-lg text-lg text-white">
              <span className="font-bold text-white/50 min-w-[30px]">#{i + 1}</span>
              <span className="flex-1 font-bold" style={{ color: t.color }}>{t.name}</span>
              <span className="font-mono font-bold">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'timer') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className={`font-mono font-black text-white ${remaining <= 5 ? 'text-red-500 animate-pulse' : ''}`}
          style={{ fontSize: '8rem', textShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
          {Math.ceil(remaining)}s
        </div>
      </div>
    );
  }

  if (view === 'bracket') {
    return (
      <div className="w-full h-full flex flex-col gap-1 p-3 bg-transparent">
        {bracket && bracket.matches.length > 0 ? (
          bracket.matches.map(m => (
            <div key={m.id} className="flex items-center gap-2 text-sm px-2 py-1 bg-black/40 rounded text-white">
              <span className="font-semibold">{m.team1Id ? teams.find(t => t.id === m.team1Id)?.name ?? 'TBD' : 'TBD'}</span>
              <span className="text-white/40 text-xs">vs</span>
              <span className="font-semibold">{m.team2Id ? teams.find(t => t.id === m.team2Id)?.name ?? 'TBD' : 'TBD'}</span>
              {m.winnerId && <span className="text-green-400 ml-auto">✓</span>}
            </div>
          ))
        ) : (
          <div className="text-center text-white/30 py-4">No bracket</div>
        )}
      </div>
    );
  }

  return null;
}
