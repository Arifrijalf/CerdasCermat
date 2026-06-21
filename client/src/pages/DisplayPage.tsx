import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { playSound } from '../services/sound';
import { loadSettings } from '../services/settings';
import WinnerAnimation from '../components/WinnerAnimation';

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

  if (view === 'timer') {
    return (
      <div className="page display-page display-timer">
        <div className="display-main timer-display">
          <div className={`timer-value-big ${remaining <= 5 ? 'urgent' : ''}`}>
            {Math.ceil(remaining)}s
          </div>
          <div className="timer-label">{timer?.running ? 'Running' : 'Paused'}</div>
        </div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  if (view === 'bracket') {
    return (
      <div className="page display-page display-bracket">
        <div className="display-header">
          <h1 className="display-title">{competitionName}</h1>
          <div className="display-state">TOURNAMENT BRACKET</div>
        </div>
        <div className="display-main bracket-display-view">
          {bracket && bracket.matches.length > 0 ? (
            <div className="bracket-visual">
              {bracket.matches.map(m => (
                <div key={m.id} className={`bracket-match-display ${m.status === 'completed' ? 'completed' : ''}`}>
                  <div className="bracket-team">
                    <span className="bracket-team-name" style={m.winnerId === m.team1Id ? { color: '#00c853' } : undefined}>
                      {m.team1Id ? teams.find(t => t.id === m.team1Id)?.name ?? m.team1Id : 'TBD'}
                    </span>
                  </div>
                  <div className="bracket-vs">VS</div>
                  <div className="bracket-team">
                    <span className="bracket-team-name" style={m.winnerId === m.team2Id ? { color: '#00c853' } : undefined}>
                      {m.team2Id ? teams.find(t => t.id === m.team2Id)?.name ?? m.team2Id : 'TBD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="display-waiting">
              <div className="display-waiting-icon">◉</div>
              <div className="display-waiting-text">No bracket configured</div>
            </div>
          )}
        </div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  if (view === 'scoreboard') {
    return (
      <div className="page display-page display-scoreboard">
        <div className="display-header">
          <h1 className="display-title">{competitionName}</h1>
          <div className="display-state">{stateLabel}</div>
        </div>
        <div className="display-main scoreboard-view">
          <div className="sb-table">
            <div className="sb-header">
              <span>Rank</span><span>Team</span><span>Score</span>
            </div>
            {sortedTeams.map((t, i) => (
              <div key={t.id} className={`sb-row ${status?.winner === t.id ? 'winner' : ''}`}>
                <span className="sb-rank">#{i + 1}</span>
                <span className="sb-name" style={{ color: t.color }}>{t.name}</span>
                <span className="sb-score">{t.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="display-footer"><div className="display-teams">
          {teams.filter(t => t.enabled).map(t => (
            <div key={t.id} className={`display-team-chip ${connectedTeams.includes(t.id) ? 'connected' : ''}`} style={{ '--team-color': t.color } as React.CSSProperties}>
              <div className="display-team-dot" /><div className="display-team-name">{t.name}</div>
            </div>
          ))}
        </div></div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  if (view === 'winner') {
    return (
      <div className="page display-page display-winner-only">
        <div className="display-main">
          {winnerName ? (
            <div className="display-winner-section">
              <div className="display-winner-label">WINNER</div>
              <div className="display-winner-name">{winnerName}</div>
            </div>
          ) : (
            <div className="display-waiting">
              <div className="display-waiting-icon">◉</div>
              <div className="display-waiting-text">Waiting for winner...</div>
            </div>
          )}
        </div>
        <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
      </div>
    );
  }

  // Default main view
  return (
    <div className="page display-page">
      <div className="display-header">
        <h1 className="display-title">{competitionName}</h1>
        <div className={`display-state ${stateLabel.toLowerCase()}`}>{stateLabel}</div>
      </div>

      {falseStartActive && falseStartTeamName && (
        <div className="display-false-start">
          <div className="false-start-label">FALSE START</div>
          <div className="false-start-team-name">{falseStartTeamName}</div>
        </div>
      )}

      {questionReading && (
        <div className="display-question-reading">
          <div className="reading-label">Listen to question...</div>
        </div>
      )}

      <div className="display-main">
        {winnerName ? (
          <div className="display-winner-section">
            <div className="display-winner-label">WINNER</div>
            <div className="display-winner-name">{winnerName}</div>
          </div>
        ) : (
          <div className="display-waiting">
            <div className="display-waiting-icon">◉</div>
            <div className="display-waiting-text">{stateLabel === 'READY' || stateLabel === 'BUZZER_OPEN' ? 'Waiting for buzz...' : stateLabel === 'QUESTION_READING' ? 'Question being read...' : 'Press Start Round'}</div>
          </div>
        )}
      </div>
      <div className="display-footer">
        <div className="display-teams">
          {teams.filter(t => t.enabled).map(t => (
            <div key={t.id} className={`display-team-chip ${status?.winner === t.id ? 'winner' : ''} ${connectedTeams.includes(t.id) ? 'connected' : ''}`}
              style={{ '--team-color': t.color } as React.CSSProperties}>
              <div className="display-team-dot" /><div className="display-team-name">{t.name}</div>
              <div className="display-team-status">{connectedTeams.includes(t.id) ? '●' : '○'}</div>
            </div>
          ))}
        </div>
      </div>
      <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
    </div>
  );
}
