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

  if (!teamId) return <div className="page error">Invalid team</div>;

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
    <div className="page team-page">
      <div className="team-header">
        <span className="team-title">{teamName}</span>
        {profile?.institution && <span className="team-institution">{profile.institution}</span>}
        <div className="team-header-right">
          <span className="team-score">{score} pts</span>
          <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {showFalseStart && (
        <div className="false-start-overlay">
          <div className="false-start-text">FALSE START</div>
          <div className="false-start-team">{teamName}</div>
        </div>
      )}

      {questionReading && !isWinner && (
        <div className="question-reading-indicator">
          <div className="reading-text">Listen to question...</div>
        </div>
      )}

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
