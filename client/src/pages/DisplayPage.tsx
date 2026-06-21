import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { playSound } from '../services/sound';
import { loadSettings } from '../services/settings';
import WinnerAnimation from '../components/WinnerAnimation';
import { motion } from 'framer-motion';
import { Trophy, Swords, CircleDot } from 'lucide-react';

interface DisplayPageProps {
  view?: 'main' | 'scoreboard' | 'winner' | 'bracket' | 'timer';
}

export default function DisplayPage({ view = 'main' }: DisplayPageProps) {
  const { status } = useSocket();
  const [showWinnerAnim, setShowWinnerAnim] = useState(false);

  useEffect(() => {
    if (status?.winner && status.winnerName) {
      setShowWinnerAnim(true);
      const settings = loadSettings();
      playSound('winner', settings.soundEnabled, settings.soundVolume);
    }
  }, [status?.winner, status?.winnerName]);

  const stateLabel = status?.state ?? 'DISCONNECTED';
  const winnerName = status?.winnerName;
  const connectedTeams = status?.connectedTeams ?? [];
  const teams = status?.teams ?? [];
  const competitionName = status?.settings?.competitionName ?? 'QuickBuzz';
  const sortedTeams = [...teams].filter(t => t.enabled).sort((a, b) => b.score - a.score);
  const timer = status?.timer;
  const remaining = timer?.remaining ?? 0;
  const bracket = status?.bracket;
  const questionReading = status?.questionReading ?? false;
  const falseStartActive = status?.falseStartActive ?? false;
  const falseStartTeamName = status?.falseStartTeamName ?? null;

  const TeamChips = () => (
    <div className="flex flex-wrap justify-center gap-3">
      {teams.filter(t => t.enabled).map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
            status?.winner === t.id ? 'border-warning bg-warning/10' :
            connectedTeams.includes(t.id) ? 'border-current' : 'border-border'
          }`}
          style={{ color: t.color, borderColor: connectedTeams.includes(t.id) || status?.winner === t.id ? t.color : undefined }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
          <span>{t.name}</span>
          <span className={`text-xs ${connectedTeams.includes(t.id) ? 'text-success' : 'text-text-muted'}`}>
            {connectedTeams.includes(t.id) ? '●' : '○'}
          </span>
        </div>
      ))}
    </div>
  );

  if (view === 'timer') {
    return (
      <div className="flex flex-col h-full bg-bg">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className={`font-mono font-black tabular-nums ${remaining <= 5 ? 'text-danger animate-pulse' : 'text-success'}`}
            style={{ fontSize: 'clamp(4rem, 15vw, 10rem)', lineHeight: 1 }}>
            {Math.ceil(remaining)}s
          </div>
          <div className="text-xl text-text-secondary mt-4">{timer?.running ? 'Running' : 'Paused'}</div>
        </div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  if (view === 'bracket') {
    return (
      <div className="flex flex-col h-full bg-bg">
        <div className="text-center py-8 border-b border-border">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{competitionName}</h1>
          <div className="text-sm font-semibold tracking-widest uppercase text-text-muted mt-2">Tournament Bracket</div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          {bracket && bracket.matches.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6">
              {bracket.matches.map(m => (
                <div key={m.id} className={`flex flex-col items-center p-5 rounded-xl border min-w-[200px] ${m.status === 'completed' ? 'border-success bg-success/5' : 'border-border bg-bg-elevated'}`}>
                  <div className={`py-2 px-4 text-lg font-semibold w-full text-center rounded-md mb-1 ${m.winnerId === m.team1Id ? 'text-success bg-success/10' : 'text-text'}`}>
                    {m.team1Id ? teams.find(t => t.id === m.team1Id)?.name ?? m.team1Id : 'TBD'}
                  </div>
                  <div className="text-xs text-text-muted font-medium py-1">VS</div>
                  <div className={`py-2 px-4 text-lg font-semibold w-full text-center rounded-md mt-1 ${m.winnerId === m.team2Id ? 'text-success bg-success/10' : 'text-text'}`}>
                    {m.team2Id ? teams.find(t => t.id === m.team2Id)?.name ?? m.team2Id : 'TBD'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <Swords className="w-16 h-16 text-text-muted mx-auto animate-pulse" />
              <div className="text-2xl text-text-secondary mt-4">No bracket configured</div>
            </div>
          )}
        </div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  if (view === 'scoreboard') {
    return (
      <div className="flex flex-col h-full bg-bg">
        <div className="text-center py-8 border-b border-border">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{competitionName}</h1>
          <div className="text-sm font-semibold tracking-widest uppercase text-text-muted mt-2">{stateLabel}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-xl mx-auto">
            <div className="flex px-4 py-3 border-b-2 border-border text-xs font-bold uppercase tracking-wider text-text-muted">
              <span className="w-12">Rank</span>
              <span className="flex-1">Team</span>
              <span className="w-20 text-right">Score</span>
            </div>
            {sortedTeams.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center px-4 py-4 border-b border-border text-lg ${status?.winner === t.id ? 'bg-warning/5' : ''}`}
              >
                <span className="w-12 font-bold text-text-muted">#{i + 1}</span>
                <span className="flex-1 font-bold" style={{ color: t.color }}>{t.name}</span>
                <span className="w-20 text-right font-mono font-black text-xl tabular-nums">{t.score}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="border-t border-border p-4">
          <TeamChips />
        </div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  if (view === 'winner') {
    return (
      <div className="flex flex-col h-full bg-bg items-center justify-center">
        {winnerName ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            className="text-center"
          >
            <Trophy className="w-20 h-20 text-warning mx-auto mb-4 animate-pulse" />
            <div className="text-7xl md:text-[10rem] font-black text-warning tracking-wider"
              style={{ textShadow: '0 0 40px rgba(234,179,8,0.3)' }}>
              WINNER
            </div>
            <div className="text-3xl md:text-5xl font-bold text-white mt-4">{winnerName}</div>
          </motion.div>
        ) : (
          <div className="text-center">
            <CircleDot className="w-16 h-16 text-text-muted mx-auto animate-pulse" />
            <div className="text-2xl text-text-secondary mt-4">Waiting for winner...</div>
          </div>
        )}
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  // Default main view
  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="text-center py-8 border-b border-border">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{competitionName}</h1>
        <div className={`text-sm font-semibold tracking-widest uppercase mt-2 ${
          stateLabel === 'READY' || stateLabel === 'BUZZER_OPEN' ? 'text-success' :
          stateLabel === 'LOCKED' ? 'text-danger' : 'text-text-muted'
        }`}>{stateLabel}</div>
      </div>

      {falseStartActive && falseStartTeamName && (
        <div className="mx-4 mt-4 text-center py-3 rounded-xl border-2 border-danger bg-danger/10 animate-pulse">
          <div className="text-lg font-black text-danger tracking-wider">FALSE START</div>
          <div className="text-sm text-text mt-1">{falseStartTeamName}</div>
        </div>
      )}

      {questionReading && (
        <div className="text-center py-4">
          <span className="text-lg text-warning font-semibold animate-pulse">Listen to question...</span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4">
        {winnerName ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            className="text-center"
          >
            <div className="text-7xl md:text-[10rem] font-black text-warning tracking-wider"
              style={{ textShadow: '0 0 40px rgba(234,179,8,0.3)' }}>
              WINNER
            </div>
            <div className="text-3xl md:text-5xl font-bold text-white mt-4">{winnerName}</div>
          </motion.div>
        ) : (
          <div className="text-center">
            <CircleDot className="w-16 h-16 text-text-muted mx-auto animate-pulse" />
            <div className="text-xl text-text-secondary mt-4">
              {stateLabel === 'READY' || stateLabel === 'BUZZER_OPEN' ? 'Waiting for buzz...' :
               stateLabel === 'QUESTION_READING' ? 'Question being read...' : 'Press Start Round'}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border p-4">
        <TeamChips />
      </div>
      <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
    </div>
  );
}
