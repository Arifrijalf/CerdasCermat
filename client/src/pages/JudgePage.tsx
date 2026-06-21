import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
  const { role: urlRole } = useParams<{ role: string }>();
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
    backupExport, backupImport, timerExpired,
    setQuestionReading,
    emergencyStop, emergencyFreeze, emergencyUnlock,
    applyPenalty,
    updateTeamProfile, updateCompetitionSettings,
    createRoom, deleteRoom, switchRoom,
    createBracket, advanceWinner,
  } = useSocket();

  const [showSettings, setShowSettings] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showWinnerAnim, setShowWinnerAnim] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [showBracket, setShowBracket] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCompSettings, setShowCompSettings] = useState(false);
  const [penaltyTeam, setPenaltyTeam] = useState('');
  const [penaltyType, setPenaltyType] = useState<'wrong_answer' | 'false_start' | 'rule_violation' | 'custom'>('wrong_answer');
  const [penaltyPoints, setPenaltyPoints] = useState(10);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [roomName, setRoomName] = useState('');
  const [selectedRoomTeams, setSelectedRoomTeams] = useState<string[]>([]);
  const judgeJoined = useRef(false);

  useEffect(() => {
    if (!judgeJoined.current) {
      judgeJoined.current = true;
      const judgeRole = (urlRole === 'admin' ? 'admin' : urlRole === 'assistant' ? 'assistant' : urlRole === 'viewer' ? 'viewer' : 'main') as any;
      joinJudge(judgeRole);
    }
  }, [joinJudge, urlRole]);

  useEffect(() => {
    if (status?.winner && status.winnerName) {
      setShowWinnerAnim(true);
      const settings = loadSettings();
      playSound('winner', settings.soundEnabled, settings.soundVolume);
    }
  }, [status?.winner, status?.winnerName]);

  useEffect(() => {
    if (timerExpired > 0) {
      const settings = loadSettings();
      playSound('alert', settings.soundEnabled, settings.soundVolume);
    }
  }, [timerExpired]);

  const stateLabel = status?.state ?? 'DISCONNECTED';
  const isReady = status?.state === 'READY' || status?.state === 'BUZZER_OPEN';
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
  const questionReading = status?.questionReading ?? false;
  const falseStartActive = status?.falseStartActive ?? false;
  const falseStartTeamName = status?.falseStartTeamName ?? null;
  const emergencyState = status?.emergencyState ?? 'none';
  const analytics = status?.analytics;
  const rooms = status?.rooms ?? [];
  const bracket = status?.bracket;
  const compSettings = status?.competitionSettings;

  const urls = useMemo(() => {
    const base = window.location.origin;
    return teams.filter(t => t.enabled).map(t => ({ id: t.id, name: t.name, url: `${base}/team/${t.id}` }));
  }, [teams]);

  const handleExportCSV = () => { window.open(`${window.location.origin}/api/logs/csv`, '_blank'); };
  const handleExportJSON = () => { window.open(`${window.location.origin}/api/logs/json`, '_blank'); };

  const handleRebuttal = useCallback(() => {
    rebuttalStart(compSettings?.rebuttalLockDuration ?? 3000);
    setTimeout(() => {
      resetRound();
    }, (compSettings?.rebuttalLockDuration ?? 3000) + 500);
  }, [rebuttalStart, resetRound, compSettings]);

  const handleApplyPenalty = useCallback(() => {
    if (!penaltyTeam) return;
    applyPenalty(penaltyTeam, penaltyType, penaltyPoints, penaltyReason);
    setShowPenalty(false);
    setPenaltyReason('');
  }, [penaltyTeam, penaltyType, penaltyPoints, penaltyReason, applyPenalty]);

  const handleCreateRoom = useCallback(() => {
    if (!roomName) return;
    createRoom(roomName, selectedRoomTeams);
    setRoomName('');
    setSelectedRoomTeams([]);
  }, [roomName, selectedRoomTeams, createRoom]);

  return (
    <div className="page judge-page">
      <header className="judge-header">
        <div className="header-top">
          <div>
            <h1>{competitionName}</h1>
            <div className="judge-subtitle">Judge Dashboard{urlRole ? ` (${urlRole})` : ''}</div>
          </div>
          <div className="header-right">
            <ConnectionStatus connected={connected} />
            <button className="btn btn-icon" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
            <button className="btn btn-icon" onClick={() => setShowQr(!showQr)} title="QR Codes">◈</button>
          </div>
        </div>
        <div className="judge-meta"><NetworkIndicator quality={quality} ping={ping} /></div>

        {emergencyState !== 'none' && (
          <div className="emergency-banner">
            <span className="emergency-icon">⚠</span>
            <span>EMERGENCY: {emergencyState.toUpperCase()}</span>
            <button className="btn btn-start btn-small" onClick={emergencyUnlock}>Resume</button>
          </div>
        )}

        {falseStartActive && falseStartTeamName && (
          <div className="false-start-banner">
            <span className="false-start-icon">⚠</span>
            <span>FALSE START - {falseStartTeamName}</span>
          </div>
        )}

        <div className="judge-controls">
          <button className="btn btn-start" onClick={startRound} disabled={isReady || emergencyState !== 'none'}>Start Round</button>
          <button className="btn btn-reset" onClick={resetRound}>Reset Round</button>
          <button className={`btn ${questionReading ? 'btn-danger' : 'btn-export'}`} onClick={() => setQuestionReading(!questionReading)}>
            {questionReading ? 'End Reading' : 'Question Reading'}
          </button>
        </div>

        <div className="judge-controls">
          <button className="btn btn-small btn-export" onClick={() => setShowEmergency(!showEmergency)}>Emergency</button>
          <button className="btn btn-small btn-export" onClick={() => setShowPenalty(!showPenalty)}>Penalty</button>
          <button className="btn btn-small btn-export" onClick={() => setShowCompSettings(!showCompSettings)}>Comp Settings</button>
          <button className="btn btn-small btn-export" onClick={() => setShowProfiles(!showProfiles)}>Profiles</button>
          <button className="btn btn-small btn-export" onClick={() => setShowRooms(!showRooms)}>Rooms</button>
          <button className="btn btn-small btn-export" onClick={() => setShowBracket(!showBracket)}>Bracket</button>
          <button className="btn btn-small btn-export" onClick={() => setShowAnalytics(!showAnalytics)}>Analytics</button>
        </div>
      </header>

      <main className="judge-main">
        <div className="status-panel">
          <div className="status-card">
            <div className="status-label">Game State</div>
            <div className={`state-value ${stateLabel.toLowerCase()}`}>{stateLabel}</div>
            {rebuttalActive && <div className="rebuttal-badge">REBUTTAL</div>}
            {questionReading && <div className="question-reading-badge">READING</div>}
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

        {showEmergency && (
          <div className="panel emergency-panel">
            <h3>Emergency Control Center</h3>
            <div className="emergency-actions">
              <button className="btn btn-danger" onClick={emergencyStop}>EMERGENCY STOP</button>
              <button className="btn btn-reset" onClick={emergencyFreeze}>FREEZE COMPETITION</button>
              <button className="btn btn-reset" onClick={() => {}}>LOCK ALL BUZZERS</button>
              <button className="btn btn-start" onClick={emergencyUnlock}>RESUME</button>
            </div>
            <button className="btn btn-small btn-export" onClick={() => setShowEmergency(false)}>Close</button>
          </div>
        )}

        {showPenalty && (
          <div className="panel penalty-panel">
            <h3>Apply Penalty</h3>
            <div className="penalty-form">
              <select value={penaltyTeam} onChange={e => setPenaltyTeam(e.target.value)}>
                <option value="">Select Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={penaltyType} onChange={e => setPenaltyType(e.target.value as any)}>
                <option value="wrong_answer">Wrong Answer</option>
                <option value="false_start">False Start</option>
                <option value="rule_violation">Rule Violation</option>
                <option value="custom">Custom</option>
              </select>
              <input type="number" value={penaltyPoints} onChange={e => setPenaltyPoints(Number(e.target.value))} min={1} />
              <input type="text" value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)} placeholder="Reason (optional)" />
              <button className="btn btn-danger" onClick={handleApplyPenalty} disabled={!penaltyTeam}>Apply Penalty</button>
            </div>
            <button className="btn btn-small btn-export" onClick={() => setShowPenalty(false)}>Close</button>
          </div>
        )}

        {showCompSettings && compSettings && (
          <div className="panel comp-settings-panel">
            <h3>Competition Settings</h3>
            <div className="settings-grid">
              <label>False Start Action
                <select value={compSettings.falseStartAction} onChange={e => updateCompetitionSettings({ falseStartAction: e.target.value })}>
                  <option value="warning">Warning Only</option>
                  <option value="minus_score">Minus Score</option>
                  <option value="temporary_lock">Temporary Lock</option>
                  <option value="custom_penalty">Custom Penalty</option>
                </select>
              </label>
              <label>Wrong Answer Penalty
                <input type="number" value={compSettings.penaltyConfig.wrongAnswer} onChange={e => updateCompetitionSettings({ penaltyConfig: { ...compSettings.penaltyConfig, wrongAnswer: Number(e.target.value) } })} />
              </label>
              <label>False Start Penalty
                <input type="number" value={compSettings.penaltyConfig.falseStart} onChange={e => updateCompetitionSettings({ penaltyConfig: { ...compSettings.penaltyConfig, falseStart: Number(e.target.value) } })} />
              </label>
              <label>Rule Violation Penalty
                <input type="number" value={compSettings.penaltyConfig.ruleViolation} onChange={e => updateCompetitionSettings({ penaltyConfig: { ...compSettings.penaltyConfig, ruleViolation: Number(e.target.value) } })} />
              </label>
              <label>Question Reading (ms)
                <input type="number" value={compSettings.questionReadingDuration} onChange={e => updateCompetitionSettings({ questionReadingDuration: Number(e.target.value) })} />
              </label>
              <label>Rebuttal Lock (ms)
                <input type="number" value={compSettings.rebuttalLockDuration} onChange={e => updateCompetitionSettings({ rebuttalLockDuration: Number(e.target.value) })} />
              </label>
            </div>
            <button className="btn btn-small btn-export" onClick={() => setShowCompSettings(false)}>Close</button>
          </div>
        )}

        {showProfiles && (
          <div className="panel profiles-panel">
            <h3>Team Profiles</h3>
            {teams.map(t => {
              const profile = status?.teamProfiles?.[t.id];
              return (
                <div key={t.id} className="profile-card">
                  <strong style={{ color: t.color }}>{t.name}</strong>
                  <input type="text" placeholder="Institution" defaultValue={profile?.institution ?? ''} onBlur={e => updateTeamProfile(t.id, { institution: e.target.value })} />
                  <input type="text" placeholder="Members (comma separated)" defaultValue={profile?.members?.join(', ') ?? ''} onBlur={e => updateTeamProfile(t.id, { members: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
              );
            })}
            <button className="btn btn-small btn-export" onClick={() => setShowProfiles(false)}>Close</button>
          </div>
        )}

        {showRooms && (
          <div className="panel rooms-panel">
            <h3>Rooms</h3>
            <div className="room-create">
              <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name" />
              <button className="btn btn-start btn-small" onClick={handleCreateRoom} disabled={!roomName}>Create Room</button>
            </div>
            {rooms.map(r => (
              <div key={r.id} className="room-card">
                <span>{r.name}</span>
                <span className="room-teams">{r.teamIds.length} teams</span>
                <button className="btn btn-small btn-export" onClick={() => switchRoom(r.id)}>Switch</button>
                <button className="btn btn-small btn-danger" onClick={() => deleteRoom(r.id)}>Delete</button>
              </div>
            ))}
            <button className="btn btn-small btn-export" onClick={() => setShowRooms(false)}>Close</button>
          </div>
        )}

        {showBracket && (
          <div className="panel bracket-panel">
            <h3>Tournament Bracket</h3>
            {bracket ? (
              <div className="bracket-display">
                <div className="bracket-phase">Phase: {bracket.phase}</div>
                {bracket.matches.map(m => (
                  <div key={m.id} className="bracket-match">
                    <span>{m.team1Id ? teams.find(t => t.id === m.team1Id)?.name ?? m.team1Id : 'TBD'}</span>
                    <span> vs </span>
                    <span>{m.team2Id ? teams.find(t => t.id === m.team2Id)?.name ?? m.team2Id : 'TBD'}</span>
                    {m.winnerId && <span className="bracket-winner"> → {teams.find(t => t.id === m.winnerId)?.name ?? m.winnerId}</span>}
                    {!m.winnerId && m.team1Id && m.team2Id && (
                      <select className="bracket-select" onChange={e => { if (e.target.value) advanceWinner(m.id, e.target.value); }} value="">
                        <option value="">Pick winner</option>
                        <option value={m.team1Id}>{teams.find(t => t.id === m.team1Id)?.name}</option>
                        <option value={m.team2Id}>{teams.find(t => t.id === m.team2Id)?.name}</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bracket-empty">
                <p>No bracket created yet.</p>
                <button className="btn btn-start btn-small" onClick={() => createBracket('quarter_final', teams.filter(t => t.enabled).map(t => t.id))}>Create Bracket</button>
              </div>
            )}
            <button className="btn btn-small btn-export" onClick={() => setShowBracket(false)}>Close</button>
          </div>
        )}

        {showAnalytics && analytics && (
          <div className="panel analytics-panel">
            <h3>Competition Analytics</h3>
            <div className="analytics-grid">
              <div className="analytics-card">
                <div className="analytics-value">{analytics.totalBuzzes}</div>
                <div className="analytics-label">Total Buzzes</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-value">{analytics.correctAnswers}</div>
                <div className="analytics-label">Correct Answers</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-value">{analytics.wrongAnswers}</div>
                <div className="analytics-label">Wrong Answers</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-value">{analytics.averageResponseTime > 0 ? `${Math.round(analytics.averageResponseTime)}ms` : '—'}</div>
                <div className="analytics-label">Avg Response</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-value">{analytics.fastestTeam ? `${analytics.fastestTeam.teamName}` : '—'}</div>
                <div className="analytics-label">Fastest Team</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-value">{analytics.mostCorrect ? `${analytics.mostCorrect.teamName}` : '—'}</div>
                <div className="analytics-label">Most Correct</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-value">{analytics.mostActive ? `${analytics.mostActive.teamName}` : '—'}</div>
                <div className="analytics-label">Most Active</div>
              </div>
            </div>
            <button className="btn btn-small btn-export" onClick={() => setShowAnalytics(false)}>Close</button>
          </div>
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
