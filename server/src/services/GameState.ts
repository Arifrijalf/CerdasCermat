import {
  TeamId,
  GameState,
  LogEntry,
  EventType,
  GameStatus,
  TeamConfig,
  AppSettings,
  Competition,
  RoundInfo,
  TimerState,
  JudgeRole,
} from '@quickbuzz/shared';
import { db } from './Database';

interface TeamConnection {
  socketId: string;
  teamId: TeamId;
}

interface JudgeConnection {
  socketId: string;
  role: JudgeRole;
}

const DEFAULT_TEAMS: TeamConfig[] = [
  { id: 'A', name: 'Team Alpha', enabled: true, color: '#ff1744', score: 0 },
  { id: 'B', name: 'Team Bravo', enabled: true, color: '#2979ff', score: 0 },
  { id: 'C', name: 'Team Charlie', enabled: true, color: '#00c853', score: 0 },
  { id: 'D', name: 'Team Delta', enabled: true, color: '#ffd600', score: 0 },
];

const DEFAULT_SETTINGS: AppSettings = {
  competitionName: 'QuickBuzz Competition',
  soundEnabled: true,
  soundVolume: 0.7,
  fullscreen: true,
  theme: 'dark',
};

export class GameStateService {
  private state: GameState = 'LOCKED';
  private winner: TeamId | null = null;
  private connections: Map<string, TeamConnection> = new Map();
  private judgeConnections: Map<string, JudgeConnection> = new Map();
  private logs: LogEntry[] = [];
  private maxLogs = 200;
  private teams: TeamConfig[] = [...DEFAULT_TEAMS.map(t => ({ ...t }))];
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private lastBuzzTimes: Map<TeamId, number> = new Map();
  private buzzCooldownMs = 200;
  private competition: Competition | null = null;
  private competitions: Competition[] = [];
  private currentRoundId: string | null = null;
  private currentRoundName: string | null = null;
  private rounds: RoundInfo[] = [];
  private timer: TimerState = { duration: 15, remaining: 15, running: false, startedAt: null };
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private timerExpiryInterval: ReturnType<typeof setInterval> | null = null;
  public onTimerExpired: (() => void) | null = null;
  private awaitingAnswer = false;
  private rebuttalActive = false;

  constructor() {
    this.loadFromDb();
  }

  private loadFromDb(): void {
    this.settings = this.loadSettings();
    this.competitions = db.getCompetitions();
    if (this.competitions.length > 0) {
      this.loadCompetition(this.competitions[0].id);
    }
    const buzzerState = db.getBuzzerState();
    if (buzzerState) {
      this.state = buzzerState.state || 'LOCKED';
      this.winner = null;
    }
  }

  private loadSettings(): AppSettings {
    const raw = db.getAllSettings();
    return {
      competitionName: raw.competitionName ? JSON.parse(raw.competitionName) : DEFAULT_SETTINGS.competitionName,
      soundEnabled: raw.soundEnabled === 'true',
      soundVolume: parseFloat(raw.soundVolume || '0.7'),
      fullscreen: raw.fullscreen === 'true',
      theme: (raw.theme ? JSON.parse(raw.theme) : 'dark') as 'dark' | 'light',
    };
  }

  private addLog(team: TeamId | 'SYSTEM', action: EventType, message?: string): void {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      team,
      action,
      ...(message ? { message } : {}),
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    db.addAuditLog(team === 'SYSTEM' ? '' : team, action, message);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  exportLogs(format: 'csv' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }
    const header = 'Time,Team,Action,Message';
    const rows = this.logs.map((l) => `"${l.time}","${l.team}","${l.action}","${l.message || ''}"`);
    return [header, ...rows].join('\n');
  }

  // --- Judge Connections ---
  addJudgeConnection(socketId: string, role: JudgeRole): void {
    this.judgeConnections.set(socketId, { socketId, role });
  }

  removeJudgeConnection(socketId: string): void {
    this.judgeConnections.delete(socketId);
  }

  getJudgeRole(socketId: string): JudgeRole | null {
    return this.judgeConnections.get(socketId)?.role ?? null;
  }

  hasMainJudge(): boolean {
    return Array.from(this.judgeConnections.values()).some((j) => j.role === 'main');
  }

  // --- Team Connections ---
  connectTeam(socketId: string, teamId: TeamId): boolean {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team || !team.enabled) return false;
    const existing = Array.from(this.connections.values()).find((c) => c.teamId === teamId);
    if (existing && existing.socketId !== socketId) return false;
    this.connections.set(socketId, { socketId, teamId });
    this.addLog(teamId, 'CONNECT', `${team.name} connected`);
    return true;
  }

  reconnectTeam(socketId: string, teamId: TeamId): boolean {
    const existing = Array.from(this.connections.entries()).find(([_, c]) => c.teamId === teamId);
    if (existing) this.connections.delete(existing[0]);
    this.connections.set(socketId, { socketId, teamId });
    return true;
  }

  disconnectTeam(socketId: string): TeamId | null {
    const conn = this.connections.get(socketId);
    if (!conn) return null;
    this.connections.delete(socketId);
    const team = this.teams.find((t) => t.id === conn.teamId);
    this.addLog(conn.teamId, 'DISCONNECT', team ? `${team.name} disconnected` : undefined);
    return conn.teamId;
  }

  getTeamBySocketId(socketId: string): TeamId | null {
    return this.connections.get(socketId)?.teamId ?? null;
  }

  getConnectedTeams(): TeamId[] {
    return Array.from(this.connections.values()).map((c) => c.teamId);
  }

  getTeamName(teamId: TeamId): string {
    return this.teams.find((t) => t.id === teamId)?.name ?? teamId;
  }

  getTeams(): TeamConfig[] {
    return this.teams.map((t) => ({ ...t }));
  }

  // --- Team Management ---
  addTeam(name: string, color: string): TeamConfig {
    const id = this.generateTeamId();
    const team: TeamConfig = { id, name, enabled: true, color, score: 0 };
    this.teams.push(team);
    if (this.competition) {
      db.addTeam(this.competition.id, name, color, id);
    }
    this.addLog('SYSTEM', 'RESET', `Team "${name}" created`);
    return team;
  }

  editTeam(id: string, data: { name?: string; color?: string; enabled?: boolean }): boolean {
    const team = this.teams.find((t) => t.id === id);
    if (!team) return false;
    if (data.name !== undefined) team.name = data.name;
    if (data.color !== undefined) team.color = data.color;
    if (data.enabled !== undefined) team.enabled = data.enabled;
    db.updateTeam(id, data);
    this.addLog('SYSTEM', 'RESET', `Team "${team.name}" updated`);
    return true;
  }

  deleteTeam(id: string): boolean {
    const idx = this.teams.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    const team = this.teams[idx];
    this.teams.splice(idx, 1);
    for (const [socketId, conn] of this.connections) {
      if (conn.teamId === id) this.connections.delete(socketId);
    }
    db.deleteTeam(id);
    this.addLog('SYSTEM', 'RESET', `Team "${team.name}" deleted`);
    return true;
  }

  private generateTeamId(): string {
    const existing = new Set(this.teams.map((t) => t.id));
    for (let i = 1; i <= 999; i++) {
      if (!existing.has(i.toString())) return i.toString();
    }
    return Date.now().toString(36);
  }

  // --- Scores ---
  addScore(teamId: string, points: number): number {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return 0;
    team.score += points;
    db.addScore(teamId, points);
    this.addLog(teamId, 'SCORE_CHANGE', `${team.name} score ${points >= 0 ? '+' : ''}${points} (now ${team.score})`);
    return team.score;
  }

  setScore(teamId: string, score: number): boolean {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return false;
    const diff = score - team.score;
    team.score = score;
    db.setScore(teamId, score);
    this.addLog(teamId, 'SCORE_CHANGE', `${team.name} score set to ${score} (${diff >= 0 ? '+' : ''}${diff})`);
    return true;
  }

  // --- Competition ---
  getCompetition(): Competition | null {
    return this.competition ? { ...this.competition } : null;
  }

  getCompetitions(): Competition[] {
    this.competitions = db.getCompetitions();
    return [...this.competitions];
  }

  createCompetition(name: string, date: string): Competition {
    const comp = db.createCompetition(name, date);
    this.competitions.unshift(comp);
    this.loadCompetition(comp.id);
    return comp;
  }

  loadCompetition(id: string): void {
    const comp = db.getCompetition(id);
    if (!comp) return;
    this.competition = comp;
    this.teams = db.getTeams(id).map((t: any) => ({
      id: t.id,
      name: t.name,
      enabled: !!t.enabled,
      color: t.color,
      score: t.score ?? 0,
    }));
    if (this.teams.length === 0) {
      this.teams = DEFAULT_TEAMS.map((t) => ({ ...t }));
    }
    this.rounds = db.getRounds(id).map((r: any) => ({
      id: r.id,
      competition_id: r.competition_id,
      name: r.name,
      round_number: r.round_number,
      status: r.status,
      winner_id: r.winner_id,
      winner_name: r.winner_name,
    }));
    this.currentRoundId = this.rounds.find((r) => r.status === 'open')?.id ?? this.rounds[this.rounds.length - 1]?.id ?? null;
    this.currentRoundName = this.rounds.find((r) => r.id === this.currentRoundId)?.name ?? null;
  }

  deleteCompetition(id: string): void {
    db.deleteCompetition(id);
    this.competitions = db.getCompetitions();
    if (this.competition?.id === id) {
      this.competition = null;
      this.teams = DEFAULT_TEAMS.map((t) => ({ ...t }));
      this.rounds = [];
      this.currentRoundId = null;
      this.currentRoundName = null;
    }
  }

  // --- Rounds ---
  getRounds(): RoundInfo[] {
    return [...this.rounds];
  }

  createRound(name: string): RoundInfo {
    if (!this.competition) {
      const comp = this.createCompetition('New Competition', new Date().toISOString().split('T')[0]);
      this.competition = comp;
    }
    const num = this.rounds.length + 1;
    const round = db.createRound(this.competition!.id, name, num);
    const info: RoundInfo = {
      id: round.id,
      competition_id: round.competition_id,
      name: round.name,
      round_number: round.round_number,
      status: round.status,
      winner_id: round.winner_id,
      winner_name: round.winner_name,
    };
    this.rounds.push(info);
    this.currentRoundId = info.id;
    this.currentRoundName = info.name;
    return info;
  }

  renameRound(id: string, name: string): boolean {
    const round = this.rounds.find((r) => r.id === id);
    if (!round) return false;
    round.name = name;
    db.updateRound(id, { name });
    if (this.currentRoundId === id) this.currentRoundName = name;
    return true;
  }

  closeRound(id: string): boolean {
    const round = this.rounds.find((r) => r.id === id);
    if (!round) return false;
    round.status = 'closed';
    db.updateRound(id, { status: 'closed' });
    return true;
  }

  openRound(id: string): boolean {
    const round = this.rounds.find((r) => r.id === id);
    if (!round) return false;
    round.status = 'open';
    db.updateRound(id, { status: 'open' });
    this.currentRoundId = id;
    this.currentRoundName = round.name;
    return true;
  }

  selectRound(id: string): void {
    this.currentRoundId = id;
    this.currentRoundName = this.rounds.find((r) => r.id === id)?.name ?? null;
  }

  // --- Buzzer ---
  buzz(socketId: string): { success: boolean; winner: TeamId | null } {
    if (this.state !== 'READY') {
      return { success: false, winner: this.winner };
    }

    const teamId = this.getTeamBySocketId(socketId);
    if (!teamId) return { success: false, winner: null };

    const team = this.teams.find((t) => t.id === teamId);
    if (!team || !team.enabled) return { success: false, winner: null };

    const now = Date.now();
    const lastBuzz = this.lastBuzzTimes.get(teamId) ?? 0;
    if (now - lastBuzz < this.buzzCooldownMs) {
      this.addLog(teamId, 'DUPLICATE', `${team.name} duplicate buzz ignored`);
      return { success: false, winner: null };
    }
    this.lastBuzzTimes.set(teamId, now);

    this.winner = teamId;
    this.state = 'LOCKED';
    this.awaitingAnswer = true;
    db.setBuzzerState({ state: 'LOCKED', winner_id: teamId, round_id: this.currentRoundId });
    if (this.currentRoundId) {
      db.updateRound(this.currentRoundId, { winner_id: teamId, winner_name: team.name });
    }
    this.addLog(teamId, 'BUZZ', `${team.name} buzzed`);
    this.addLog(teamId, 'WINNER', `${team.name} wins!`);

    return { success: true, winner: teamId };
  }

  startRound(): boolean {
    if (this.state === 'READY') return false;
    this.state = 'READY';
    this.winner = null;
    this.awaitingAnswer = false;
    this.rebuttalActive = false;
    this.lastBuzzTimes.clear();
    db.setBuzzerState({ state: 'READY', winner_id: null });
    this.addLog('SYSTEM', 'RESET', 'Round started');
    return true;
  }

  resetRound(): boolean {
    this.state = 'READY';
    this.winner = null;
    this.awaitingAnswer = false;
    this.rebuttalActive = false;
    this.lastBuzzTimes.clear();
    db.setBuzzerState({ state: 'READY', winner_id: null });
    this.addLog('SYSTEM', 'RESET', 'Round reset');
    return true;
  }

  // --- Answer Validation ---
  answerCorrect(teamId: string, points: number = 10): void {
    this.awaitingAnswer = false;
    this.addScore(teamId, points);
    this.addLog(teamId, 'ANSWER_CORRECT', `${this.getTeamName(teamId)} answered correctly (+${points})`);
  }

  answerWrong(teamId: string, points: number = 0): void {
    this.awaitingAnswer = false;
    if (points !== 0) {
      this.addScore(teamId, -Math.abs(points));
    }
    this.addLog(teamId, 'ANSWER_WRONG', `${this.getTeamName(teamId)} answered incorrectly`);
  }

  answerSkip(): void {
    this.awaitingAnswer = false;
    this.addLog('SYSTEM', 'ANSWER_SKIP', 'Answer skipped');
  }

  // --- Rebuttal ---
  startRebuttal(lockDuration: number = 3000): void {
    this.rebuttalActive = true;
    this.awaitingAnswer = false;
    this.state = 'REBUTTAL';
    this.winner = null;
    this.lastBuzzTimes.clear();
    this.addLog('SYSTEM', 'RESET', 'Rebuttal mode activated');

    setTimeout(() => {
      if (this.state === 'REBUTTAL') {
        this.state = 'READY';
        db.setBuzzerState({ state: 'READY' });
      }
    }, lockDuration);
  }

  endRebuttal(): void {
    this.rebuttalActive = false;
    this.state = 'LOCKED';
    db.setBuzzerState({ state: 'LOCKED' });
    this.addLog('SYSTEM', 'RESET', 'Rebuttal mode ended');
  }

  // --- Timer ---
  setTimerDuration(duration: number): void {
    this.timer.duration = duration;
    this.timer.remaining = duration;
    this.timer.running = false;
    this.timer.startedAt = null;
  }

  startTimer(): void {
    if (this.timer.running) return;
    this.timer.running = true;
    this.timer.startedAt = Date.now();
    this.timer.remaining = this.timer.duration;
    this.addLog('SYSTEM', 'TIMER_START', `Timer started (${this.timer.duration}s)`);
    this.startTimerExpiryCheck();
  }

  pauseTimer(): void {
    if (!this.timer.running) return;
    this.timer.running = false;
    if (this.timer.startedAt) {
      const elapsed = (Date.now() - this.timer.startedAt) / 1000;
      this.timer.remaining = Math.max(0, this.timer.remaining - elapsed);
    }
    this.timer.startedAt = null;
    this.stopTimerExpiryCheck();
  }

  resumeTimer(): void {
    if (this.timer.running) return;
    this.timer.running = true;
    this.timer.startedAt = Date.now();
  }

  resetTimer(): void {
    this.timer.running = false;
    this.timer.startedAt = null;
    this.timer.remaining = this.timer.duration;
    this.stopTimerExpiryCheck();
  }

  getTimerState(): TimerState {
    if (this.timer.running && this.timer.startedAt) {
      const elapsed = (Date.now() - this.timer.startedAt) / 1000;
      const remaining = Math.max(0, this.timer.remaining - elapsed);
      return { ...this.timer, remaining };
    }
    return { ...this.timer };
  }

  private startTimerExpiryCheck(): void {
    this.stopTimerExpiryCheck();
    this.timerExpiryInterval = setInterval(() => {
      if (this.checkTimerExpired()) {
        this.pauseTimer();
        if (this.onTimerExpired) {
          this.onTimerExpired();
        }
      }
    }, 200);
  }

  private stopTimerExpiryCheck(): void {
    if (this.timerExpiryInterval) {
      clearInterval(this.timerExpiryInterval);
      this.timerExpiryInterval = null;
    }
  }

  checkTimerExpired(): boolean {
    if (!this.timer.running) return false;
    const state = this.getTimerState();
    return state.remaining <= 0;
  }

  clearTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- Settings ---
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    for (const [key, value] of Object.entries(partial)) {
      db.setSetting(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return { ...this.settings };
  }

  // --- Backup ---
  exportBackup(): string {
    return db.exportAll();
  }

  importBackup(json: string): boolean {
    const ok = db.importAll(json);
    if (ok) {
      this.loadFromDb();
    }
    return ok;
  }

  // --- Status ---
  getStatus(forTeam?: TeamId): GameStatus {
    const winnerName = this.winner ? this.getTeamName(this.winner) : null;
    const yourTeamName = forTeam ? this.getTeamName(forTeam) : undefined;
    const timerState = this.getTimerState();
    return {
      state: this.state,
      winner: this.winner,
      winnerName,
      connectedTeams: this.getConnectedTeams(),
      teams: this.getTeams(),
      logs: [...this.logs],
      settings: this.getSettings(),
      ...(forTeam ? { yourTeam: forTeam, yourTeamName } : {}),
      serverTime: Date.now(),
      competition: this.competition ? { ...this.competition } : null,
      competitions: this.getCompetitions(),
      currentRoundId: this.currentRoundId,
      currentRoundName: this.currentRoundName,
      rounds: [...this.rounds],
      timer: timerState,
      awaitingAnswer: this.awaitingAnswer,
      rebuttalActive: this.rebuttalActive,
    };
  }

  isLocked(): boolean {
    return this.state === 'LOCKED';
  }

  getWinner(): TeamId | null {
    return this.winner;
  }
}

export const gameState = new GameStateService();
