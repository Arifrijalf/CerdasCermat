import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { playSound } from '../services/sound';
import { loadSettings } from '../services/settings';
import BuzzerButton from '../components/BuzzerButton';
import WinnerAnimation from '../components/WinnerAnimation';
import { motion } from 'framer-motion';

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { status, connected, joinTeam, buzz, timerExpired } = useSocket();
  const joined = useRef(false);
  const [showWinnerAnim, setShowWinnerAnim] = useState(false);
  const [showFalseStart, setShowFalseStart] = useState(false);
  const prevWinnerRef = useRef<string | null>(null);

  useEffect(() => {
    if (teamId && !joined.current) {
      joined.current = true;
      joinTeam(teamId);
    }
  }, [teamId, joinTeam]);

  useEffect(() => {
    const settings = loadSettings();
    if (!status) return;
    const team = teamId;
    if (status.winner && status.winner === team && prevWinnerRef.current !== team) {
      prevWinnerRef.current = team;
      setShowWinnerAnim(true);
      playSound('winner', settings.soundEnabled, settings.soundVolume);
    } else if ((status.state === 'READY' || status.state === 'BUZZER_OPEN') && !status.winner) {
      playSound('ready', settings.soundEnabled, settings.soundVolume);
    }
  }, [status, teamId]);

  useEffect(() => {
    if (timerExpired > 0) {
      const settings = loadSettings();
      playSound('alert', settings.soundEnabled, settings.soundVolume);
    }
  }, [timerExpired]);

  useEffect(() => {
    if (status?.falseStartActive && status.falseStartTeam === teamId) {
      setShowFalseStart(true);
      const t = setTimeout(() => setShowFalseStart(false), 3000);
      return () => clearTimeout(t);
    }
  }, [status?.falseStartActive, status?.falseStartTeam, teamId]);

  if (!teamId) return <div className="flex h-full items-center justify-center text-lg text-danger p-8 text-center">Invalid team</div>;

  const team = teamId;
  const teamInfo = status?.teams.find((t) => t.id === team);
  const teamName = teamInfo?.name ?? `Team ${team}`;
  const isWinner = status?.winner === team;
  const stateLabel = status?.state ?? 'DISCONNECTED';
  const isDisabled = stateLabel !== 'READY' && stateLabel !== 'BUZZER_OPEN';
  const score = teamInfo?.score ?? 0;
  const timer = status?.timer;
  const timerDisplay = timer ? Math.ceil(timer.remaining) : null;
  const questionReading = status?.questionReading ?? false;
  const profile = status?.teamProfiles?.[teamId];

  return (
    <div className="flex flex-col h-full bg-bg">
      <header className="flex items-center justify-between px-5 py-3 fixed top-0 left-0 right-0 z-10 bg-bg border-b border-border">
        <span className="text-lg font-bold tracking-tight">{teamName}</span>
        {profile?.institution && <span className="text-sm text-text-muted">{profile.institution}</span>}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-warning font-mono tabular-nums">{score} pts</span>
          <span className={`text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${connected ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
            {connected ? 'Online' : 'Connecting...'}
          </span>
        </div>
      </header>

      {showFalseStart && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-danger/90 pointer-events-none"
        >
          <div className="text-4xl md:text-5xl font-black text-white tracking-wider">FALSE START</div>
          <div className="text-xl text-white/90 mt-2">{teamName}</div>
        </motion.div>
      )}

      {questionReading && !isWinner && (
        <div className="text-center py-4">
          <span className="text-lg text-warning font-semibold animate-pulse">Listen to question...</span>
        </div>
      )}

      {timerDisplay !== null && timer?.running && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded-full border-2 font-mono text-lg font-bold ${timerDisplay <= 5 ? 'border-danger text-danger animate-pulse' : 'border-accent text-accent'} bg-bg-elevated`}>
          {timerDisplay}s
        </div>
      )}

      <BuzzerButton
        teamName={teamName}
        disabled={isDisabled}
        winner={status?.winner ?? null}
        winnerName={status?.winnerName ?? null}
        isWinner={isWinner}
        onBuzz={buzz}
        teamColor={teamInfo?.color}
      />
      <WinnerAnimation
        teamName={teamName}
        visible={showWinnerAnim}
        onComplete={() => setShowWinnerAnim(false)}
      />
    </div>
  );
}
