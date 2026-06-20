import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { loadSettings } from '../services/settings';
import { playSound } from '../services/sound';
import ConnectionStatus from '../components/ConnectionStatus';
import NetworkIndicator from '../components/NetworkIndicator';
import EventLog from '../components/EventLog';
import QrCodeView from '../components/QrCodeView';
import TeamManager from '../components/TeamManager';
import SettingsPanel from '../components/SettingsPanel';
import WinnerAnimation from '../components/WinnerAnimation';
import Scoreboard from '../components/Scoreboard';
import Timer from '../components/Timer';
import AnswerPanel from '../components/AnswerPanel';
import CompetitionManager from '../components/CompetitionManager';

export default function JudgePage() {
  const {
    status, connected, quality, ping, joinJudge,
    startRound, resetRound,
    addTeam, editTeam, deleteTeam, updateSettings,
    addScore, setScore,
    answerCorrect, answerWrong, answerSkip,
    rebuttalStart,
    createCompetition, loadCompetition, deleteCompetition,
    createRound, renameRound, closeRound, openRound, selectRound,
    timerSet, timerStart, timerPause, timerResume, timerReset,
    backupExport, backupImport,
  } = useSocket();

  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showWinnerAnim, setShowWinnerAnim] = useState(false);
  const judgeJoined = useRef(false);

  useEffect(() => {
    if (!judgeJoined.current) {
      judgeJoined.current = true;
      joinJudge('main');
    }
  }, [joinJudge]);

  useEffect(() => {
    if (status?.winner && status.winnerName) {
      setShowWinnerAnim(true);
      const settings = loadSettings();
      playSound('winner', settings.soundEnabled, settings.soundVolume);
    }
  }, [status?.winner, status?.winnerName]);

  const stateLabel = status?.state ?? 'DISCONNECTED';
  const isReady = status?.state === 'READY';
  const winner = status?.winner;
  const winnerName = status?.winnerName;
  const connectedTeams = status?.connectedTeams ?? [];
  const teams = status?.teams ?? [];
  const settings = status?.settings;
  const competitionName = settings?.competitionName ?? 'QuickBuzz';
  const awaitingAnswer = status?.awaitingAnswer ?? false;
  const rebuttalActive = status?.rebuttalActive ?? false;
  const timerState = status?.timer ?? { duration: 15, remaining: 15, running: false, startedAt: null };
  const competitions = status?.competitions ?? [];
  const currentComp = status?.competition;
  const rounds = status?.rounds ?? [];
  const currentRoundId = status?.currentRoundId;

  const urls = useMemo(() => {
    const base = window.location.origin;
    return teams.filter(t => t.enabled).map(t => ({ id: t.id, name: t.name, url: `${base}/team/${t.id}` }));
  }, [teams]);

  const handleExportCSV = () => { window.open(`${window.location.origin}/api/logs/csv`, '_blank'); };
  const handleExportJSON = () => { window.open(`${window.location.origin}/api/logs/json`, '_blank'); };

  const handleRebuttal = useCallback(() => {
    rebuttalStart(3000);
    setTimeout(() => {
      // After lock period, resetRound effectively
      resetRound();
    }, 3500);
  }, [rebuttalStart, resetRound]);

  return (
    <div className="page judge-page">
      <header className="judge-header">
        <div className="header-top">
          <div>
            <h1>{competitionName}</h1>
            <div className="judge-subtitle">Judge Dashboard</div>
          </div>
          <div className="header-right">
            <ConnectionStatus connected={connected} />
            <button className="btn btn-icon" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
            <button className="btn btn-icon" onClick={() => setShowQr(!showQr)} title="QR Codes">◈</button>
          </div>
        </div>
        <div className="judge-meta"><NetworkIndicator quality={quality} ping={ping} /></div>
        <div className="judge-controls">
          <button className="btn btn-start" onClick={startRound} disabled={isReady}>Start Round</button>
          <button className="btn btn-reset" onClick={resetRound}>Reset Round</button>
        </div>
      </header>

      <main className="judge-main">
        <div className="status-panel">
          <div className="status-card">
            <div className="status-label">Game State</div>
            <div className={`state-value ${stateLabel.toLowerCase()}`}>{stateLabel}</div>
            {rebuttalActive && <div className="rebuttal-badge">REBUTTAL</div>}
          </div>
          <div className="status-card">
            <div className="status-label">Winner</div>
            <div className="winner-value">{winnerName || '—'}</div>
          </div>
          <div className="status-card">
            <div className="status-label">Connected Teams</div>
            <div className="teams-value">
              {connectedTeams.length === 0 ? <span className="no-teams">No teams connected</span> : (
                <div className="team-list">
                  {connectedTeams.map(t => {
                    const ti = teams.find(tm => tm.id === t);
                    return <span key={t} className={`team-chip ${winner === t ? 'winner' : ''}`} style={ti ? { borderColor: ti.color } : undefined}>{ti?.name ?? t}</span>;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {awaitingAnswer && (
          <AnswerPanel
            winnerId={winner ?? null}
            winnerName={winnerName ?? null}
            onCorrect={answerCorrect}
            onWrong={answerWrong}
            onSkip={answerSkip}
            onRebuttalStart={handleRebuttal}
          />
        )}

        {showQr && (
          <div className="qr-section"><div className="qr-grid">{urls.map(u => <QrCodeView key={u.id} url={u.url} label={u.name} />)}</div></div>
        )}

        <Scoreboard teams={teams} onAddScore={addScore} onSetScore={setScore} />

        <Timer
          timer={timerState}
          onSet={timerSet}
          onStart={timerStart}
          onPause={timerPause}
          onResume={timerResume}
          onReset={timerReset}
        />

        <CompetitionManager
          competitions={competitions}
          currentCompetition={currentComp ?? null}
          rounds={rounds ?? []}
          currentRoundId={currentRoundId ?? null}
          onSelect={loadCompetition}
          onCreate={createCompetition}
          onDelete={deleteCompetition}
          onCreateRound={createRound}
          onRenameRound={renameRound}
          onCloseRound={closeRound}
          onOpenRound={openRound}
          onSelectRound={selectRound}
          onExport={backupExport}
          onImport={backupImport}
        />

        <TeamManager teams={teams} connectedTeams={connectedTeams} onAdd={addTeam} onEdit={editTeam} onDelete={deleteTeam} />

        <div className="logs-section">
          <EventLog logs={status?.logs ?? []} />
          <div className="log-export-actions">
            <button className="btn btn-small btn-export" onClick={handleExportCSV}>Export CSV</button>
            <button className="btn btn-small btn-export" onClick={handleExportJSON}>Export JSON</button>
          </div>
        </div>
      </main>

      {showSettings && settings && <SettingsPanel settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />}

      <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
    </div>
  );
}
