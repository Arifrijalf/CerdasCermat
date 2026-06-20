import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { playSound } from '../services/sound';
import { loadSettings } from '../services/settings';
import BuzzerButton from '../components/BuzzerButton';
import WinnerAnimation from '../components/WinnerAnimation';

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { status, connected, joinTeam, buzz, timerExpired } = useSocket();
  const joined = useRef(false);
  const [showWinnerAnim, setShowWinnerAnim] = useState(false);
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
    } else if (status.state === 'READY' && !status.winner) {
      playSound('ready', settings.soundEnabled, settings.soundVolume);
    }
  }, [status, teamId]);

  useEffect(() => {
    if (timerExpired > 0) {
      const settings = loadSettings();
      playSound('alert', settings.soundEnabled, settings.soundVolume);
    }
  }, [timerExpired]);

  if (!teamId) return <div className="page error">Invalid team</div>;

  const team = teamId;
  const teamInfo = status?.teams.find((t) => t.id === team);
  const teamName = teamInfo?.name ?? `Team ${team}`;
  const isWinner = status?.winner === team;
  const isDisabled = status?.state !== 'READY';
  const score = teamInfo?.score ?? 0;
  const timer = status?.timer;
  const timerDisplay = timer ? Math.ceil(timer.remaining) : null;

  return (
    <div className="page team-page">
      <div className="team-header">
        <span className="team-title">{teamName}</span>
        <div className="team-header-right">
          <span className="team-score">{score} pts</span>
          <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {timerDisplay !== null && timer?.running && (
        <div className={`team-timer ${timerDisplay <= 5 ? 'urgent' : ''}`}>
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
