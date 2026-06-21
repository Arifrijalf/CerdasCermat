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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, QrCode, Play, RotateCcw, BookOpen, AlertTriangle,
  Shield, Users, Building, LayoutGrid, BarChart3, X,
  StopCircle, Snowflake, Lock, Unlock,
  Trophy, Target, Clock, Zap, Activity,
  Plus, Trash2, Download,
} from 'lucide-react';

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
    setTimeout(() => { resetRound(); }, (compSettings?.rebuttalLockDuration ?? 3000) + 500);
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

  const Panel = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <Card className="relative">
            <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
            {children}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col h-full bg-bg overflow-y-auto">
      <header className="sticky top-0 z-10 bg-bg border-b border-border px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">{competitionName}</h1>
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
              Judge Dashboard{urlRole ? ` (${urlRole})` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ConnectionStatus connected={connected} />
            <Button variant="ghost" size="icon-sm" onClick={() => setShowSettings(true)} title="Settings">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowQr(!showQr)} title="QR Codes">
              <QrCode className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-1"><NetworkIndicator quality={quality} ping={ping} /></div>

        {emergencyState !== 'none' && (
          <div className="flex items-center gap-3 mt-3 px-4 py-2.5 rounded-lg bg-orange/10 border border-orange font-bold text-orange">
            <AlertTriangle className="w-5 h-5" />
            <span className="flex-1">EMERGENCY: {emergencyState.toUpperCase()}</span>
            <Button variant="success" size="xs" onClick={emergencyUnlock}>
              <Unlock className="w-3 h-3" /> Resume
            </Button>
          </div>
        )}

        {falseStartActive && falseStartTeamName && (
          <div className="flex items-center gap-3 mt-3 px-4 py-2.5 rounded-lg bg-danger/10 border border-danger font-bold text-danger animate-pulse">
            <AlertTriangle className="w-5 h-5" />
            <span>FALSE START — {falseStartTeamName}</span>
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          <Button variant="success" onClick={startRound} disabled={isReady || emergencyState !== 'none'}>
            <Play className="w-4 h-4" /> Start Round
          </Button>
          <Button variant="secondary" onClick={resetRound}>
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button variant={questionReading ? 'destructive' : 'outline'} onClick={() => setQuestionReading(!questionReading)}>
            <BookOpen className="w-4 h-4" /> {questionReading ? 'End Reading' : 'Reading'}
          </Button>
        </div>

        <div className="flex gap-1.5 mt-2 flex-wrap">
          <Button variant="outline" size="xs" onClick={() => setShowEmergency(!showEmergency)}>
            <AlertTriangle className="w-3 h-3" /> Emergency
          </Button>
          <Button variant="outline" size="xs" onClick={() => setShowPenalty(!showPenalty)}>
            <Shield className="w-3 h-3" /> Penalty
          </Button>
          <Button variant="outline" size="xs" onClick={() => setShowCompSettings(!showCompSettings)}>
            <Settings className="w-3 h-3" /> Settings
          </Button>
          <Button variant="outline" size="xs" onClick={() => setShowProfiles(!showProfiles)}>
            <Users className="w-3 h-3" /> Profiles
          </Button>
          <Button variant="outline" size="xs" onClick={() => setShowRooms(!showRooms)}>
            <Building className="w-3 h-3" /> Rooms
          </Button>
          <Button variant="outline" size="xs" onClick={() => setShowBracket(!showBracket)}>
            <LayoutGrid className="w-3 h-3" /> Bracket
          </Button>
          <Button variant="outline" size="xs" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="w-3 h-3" /> Analytics
          </Button>
        </div>
      </header>

      <main className="p-4 md:p-6 flex flex-col gap-4">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Game State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-extrabold tracking-wider ${
                stateLabel === 'READY' || stateLabel === 'BUZZER_OPEN' ? 'text-success' :
                stateLabel === 'LOCKED' ? 'text-danger' : 'text-text-muted'
              }`}>{stateLabel}</div>
              {rebuttalActive && <Badge variant="warning" className="mt-2">REBUTTAL</Badge>}
              {questionReading && <Badge variant="secondary" className="mt-2">READING</Badge>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Winner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-warning">{winnerName || '—'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connected Teams</CardTitle>
            </CardHeader>
            <CardContent>
              {connectedTeams.length === 0 ? (
                <p className="text-sm text-text-muted italic">No teams connected</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {connectedTeams.map(t => {
                    const ti = teams.find(tm => tm.id === t);
                    return (
                      <Badge key={t} variant={winner === t ? 'warning' : 'default'}>
                        <div className="w-2 h-2 rounded-full mr-1" style={{ background: ti?.color }} />
                        {ti?.name ?? t}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {urls.map(u => <QrCodeView key={u.id} url={u.url} label={u.name} />)}
              </div>
            </CardContent>
          </Card>
        )}

        <Panel open={showEmergency} onClose={() => setShowEmergency(false)}>
          <CardHeader><CardTitle className="text-danger">Emergency Control Center</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button variant="destructive" onClick={emergencyStop}>
                <StopCircle className="w-4 h-4" /> Emergency Stop
              </Button>
              <Button variant="secondary" onClick={emergencyFreeze}>
                <Snowflake className="w-4 h-4" /> Freeze
              </Button>
              <Button variant="outline" onClick={() => {}}>
                <Lock className="w-4 h-4" /> Lock Buzzers
              </Button>
              <Button variant="success" onClick={emergencyUnlock}>
                <Unlock className="w-4 h-4" /> Resume
              </Button>
            </div>
          </CardContent>
        </Panel>

        <Panel open={showPenalty} onClose={() => setShowPenalty(false)}>
          <CardHeader><CardTitle className="text-danger">Apply Penalty</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Select value={penaltyTeam} onChange={e => setPenaltyTeam(e.target.value)}>
                <option value="">Select Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Select value={penaltyType} onChange={e => setPenaltyType(e.target.value as any)}>
                <option value="wrong_answer">Wrong Answer</option>
                <option value="false_start">False Start</option>
                <option value="rule_violation">Rule Violation</option>
                <option value="custom">Custom</option>
              </Select>
              <Input type="number" value={penaltyPoints} onChange={e => setPenaltyPoints(Number(e.target.value))} min={1} />
              <Input type="text" value={penaltyReason} onChange={e => setPenaltyReason(e.target.value)} placeholder="Reason (optional)" />
              <Button variant="destructive" className="w-full" onClick={handleApplyPenalty} disabled={!penaltyTeam}>
                <Shield className="w-4 h-4" /> Apply Penalty
              </Button>
            </div>
          </CardContent>
        </Panel>

        <Panel open={showCompSettings} onClose={() => setShowCompSettings(false)}>
          <CardHeader><CardTitle>Competition Settings</CardTitle></CardHeader>
          <CardContent>
            {compSettings && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>False Start Action</Label>
                  <Select value={compSettings.falseStartAction} onChange={e => updateCompetitionSettings({ falseStartAction: e.target.value })} className="w-full">
                    <option value="warning">Warning Only</option>
                    <option value="minus_score">Minus Score</option>
                    <option value="temporary_lock">Temporary Lock</option>
                    <option value="custom_penalty">Custom Penalty</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Wrong Answer Penalty</Label>
                  <Input type="number" value={compSettings.penaltyConfig.wrongAnswer} onChange={e => updateCompetitionSettings({ penaltyConfig: { ...compSettings.penaltyConfig, wrongAnswer: Number(e.target.value) } })} />
                </div>
                <div className="space-y-1">
                  <Label>False Start Penalty</Label>
                  <Input type="number" value={compSettings.penaltyConfig.falseStart} onChange={e => updateCompetitionSettings({ penaltyConfig: { ...compSettings.penaltyConfig, falseStart: Number(e.target.value) } })} />
                </div>
                <div className="space-y-1">
                  <Label>Rule Violation Penalty</Label>
                  <Input type="number" value={compSettings.penaltyConfig.ruleViolation} onChange={e => updateCompetitionSettings({ penaltyConfig: { ...compSettings.penaltyConfig, ruleViolation: Number(e.target.value) } })} />
                </div>
                <div className="space-y-1">
                  <Label>Question Reading (ms)</Label>
                  <Input type="number" value={compSettings.questionReadingDuration} onChange={e => updateCompetitionSettings({ questionReadingDuration: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Rebuttal Lock (ms)</Label>
                  <Input type="number" value={compSettings.rebuttalLockDuration} onChange={e => updateCompetitionSettings({ rebuttalLockDuration: Number(e.target.value) })} />
                </div>
              </div>
            )}
          </CardContent>
        </Panel>

        <Panel open={showProfiles} onClose={() => setShowProfiles(false)}>
          <CardHeader><CardTitle>Team Profiles</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teams.map(t => {
                const profile = status?.teamProfiles?.[t.id];
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border flex-wrap">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                    <strong className="text-sm min-w-[80px]" style={{ color: t.color }}>{t.name}</strong>
                    <Input placeholder="Institution" defaultValue={profile?.institution ?? ''} onBlur={e => updateTeamProfile(t.id, { institution: e.target.value })} className="h-8 flex-1 min-w-[120px]" />
                    <Input placeholder="Members (comma separated)" defaultValue={profile?.members?.join(', ') ?? ''} onBlur={e => updateTeamProfile(t.id, { members: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="h-8 flex-1 min-w-[120px]" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Panel>

        <Panel open={showRooms} onClose={() => setShowRooms(false)}>
          <CardHeader><CardTitle>Rooms</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name" className="flex-1" />
                <Button variant="success" size="sm" onClick={handleCreateRoom} disabled={!roomName}>
                  <Plus className="w-3.5 h-3.5" /> Create
                </Button>
              </div>
              {rooms.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                  <span className="flex-1 font-semibold text-sm">{r.name}</span>
                  <span className="text-xs text-text-muted">{r.teamIds.length} teams</span>
                  <Button variant="outline" size="xs" onClick={() => switchRoom(r.id)}>Switch</Button>
                  <Button variant="ghost" size="xs" onClick={() => deleteRoom(r.id)} className="text-danger hover:text-danger">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Panel>

        <Panel open={showBracket} onClose={() => setShowBracket(false)}>
          <CardHeader><CardTitle>Tournament Bracket</CardTitle></CardHeader>
          <CardContent>
            {bracket ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="mb-2">{bracket.phase}</Badge>
                <div className="space-y-2">
                  {bracket.matches.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-subtle text-sm">
                      <span className="font-semibold">{m.team1Id ? teams.find(t => t.id === m.team1Id)?.name ?? m.team1Id : 'TBD'}</span>
                      <span className="text-text-muted">vs</span>
                      <span className="font-semibold">{m.team2Id ? teams.find(t => t.id === m.team2Id)?.name ?? m.team2Id : 'TBD'}</span>
                      {m.winnerId && <span className="text-success font-bold ml-auto">→ {teams.find(t => t.id === m.winnerId)?.name ?? m.winnerId}</span>}
                      {!m.winnerId && m.team1Id && m.team2Id && (
                        <Select className="ml-auto h-7" onChange={e => { if (e.target.value) advanceWinner(m.id, e.target.value); }} value="">
                          <option value="">Pick winner</option>
                          <option value={m.team1Id}>{teams.find(t => t.id === m.team1Id)?.name}</option>
                          <option value={m.team2Id}>{teams.find(t => t.id === m.team2Id)?.name}</option>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-text-muted mb-3">No bracket created yet</p>
                <Button variant="success" size="sm" onClick={() => createBracket('quarter_final', teams.filter(t => t.enabled).map(t => t.id))}>
                  Create Bracket
                </Button>
              </div>
            )}
          </CardContent>
        </Panel>

        <Panel open={showAnalytics} onClose={() => setShowAnalytics(false)}>
          <CardHeader><CardTitle>Competition Analytics</CardTitle></CardHeader>
          <CardContent>
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Buzzes', value: analytics.totalBuzzes, Icon: Zap, color: 'text-accent' },
                  { label: 'Correct', value: analytics.correctAnswers, Icon: Target, color: 'text-success' },
                  { label: 'Wrong', value: analytics.wrongAnswers, Icon: X, color: 'text-danger' },
                  { label: 'Avg Response', value: analytics.averageResponseTime > 0 ? `${Math.round(analytics.averageResponseTime)}ms` : '—', Icon: Clock, color: 'text-accent' },
                  { label: 'Fastest Team', value: analytics.fastestTeam?.teamName ?? '—', Icon: Zap, color: 'text-warning' },
                  { label: 'Most Correct', value: analytics.mostCorrect?.teamName ?? '—', Icon: Trophy, color: 'text-success' },
                  { label: 'Most Active', value: analytics.mostActive?.teamName ?? '—', Icon: Activity, color: 'text-purple' },
                ].map(({ label, value, Icon, color }) => (
                  <div key={label} className="p-3 rounded-lg bg-bg-subtle text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                    <div className={`text-xl font-bold ${color}`}>{value}</div>
                    <div className="text-xs text-text-muted mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Panel>

        <Scoreboard teams={teams} onAddScore={addScore} onSetScore={setScore} />

        <Timer timer={timerState} onSet={timerSet} onStart={timerStart} onPause={timerPause} onResume={timerResume} onReset={timerReset} />

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

        <div className="space-y-2">
          <EventLog logs={status?.logs ?? []} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="w-3.5 h-3.5" /> Export JSON
            </Button>
          </div>
        </div>
      </main>

      {showSettings && settings && <SettingsPanel settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />}
      <WinnerAnimation teamName={winnerName ?? ''} visible={showWinnerAnim} onComplete={() => setShowWinnerAnim(false)} />
    </div>
  );
}
