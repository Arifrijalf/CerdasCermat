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
  TeamProfile,
  CompetitionSettings,
  PenaltyType,
  PenaltyRecord,
  BuzzRecord,
  RoomInfo,
  BracketData,
  BracketMatch,
  CompetitionPhase,
  QualificationRule,
  CompetitionAnalytics,
  TeamAnalytics,
  EmergencyAction,
  InputSource,
} from '@quickbuzz/shared';
import { db } from './Database';

interface TeamConnection {
  socketId: string;
  teamId: TeamId;
  source: InputSource;
  deviceId: string;
  connectedAt: number;
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

const DEFAULT_COMPETITION_SETTINGS: CompetitionSettings = {
  penaltyConfig: { wrongAnswer: -10, falseStart: -5, ruleViolation: -15, custom: 0 },
  falseStartAction: 'warning',
  falseStartLockDuration: 3000,
  questionReadingDuration: 5000,
  rebuttalLockDuration: 3000,
  maxRebuttals: 1,
};

export class GameStateService {
  private state: GameState = 'LOCKED';
  private winner: TeamId | null = null;
  private connections: Map<string, TeamConnection> = new Map();
  private judgeConnections: Map<string, JudgeConnection> = new Map();
  private logs: LogEntry[] = [];
  private maxLogs = 500;
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
  private questionReading = false;
  private questionReadingTimeout: ReturnType<typeof setTimeout> | null = null;

  private falseStartTeam: TeamId | null = null;
  private falseStartTeamName: string | null = null;
  private falseStartActive = false;

  private competitionSettings: CompetitionSettings = { ...DEFAULT_COMPETITION_SETTINGS };
  private teamProfiles: Record<string, TeamProfile> = {};
  private penaltyRecords: PenaltyRecord[] = [];
  private buzzRecords: BuzzRecord[] = [];
  private currentRoundStartTime: number = 0;
  private rooms: RoomInfo[] = [];
  private currentRoomId: string | null = null;
  private bracket: BracketData | null = null;
  private analytics: CompetitionAnalytics = this.createEmptyAnalytics();
  private emergencyState: EmergencyAction = 'none';

  constructor() {
    this.loadFromDb();
  }

  private createEmptyAnalytics(): CompetitionAnalytics {
    return {
      totalBuzzes: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      averageResponseTime: 0,
      fastestResponseTime: 0,
      fastestTeam: null,
      mostCorrect: null,
      mostActive: null,
      teamStats: {},
    };
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
    const parseJson = (value: string | undefined, fallback: string): string => {
      if (!value) return fallback;
      try { return JSON.parse(value); } catch { return value; }
    };
    return {
      competitionName: parseJson(raw.competitionName, DEFAULT_SETTINGS.competitionName),
      soundEnabled: raw.soundEnabled === 'true',
      soundVolume: parseFloat(raw.soundVolume || '0.7'),
      fullscreen: raw.fullscreen === 'true',
      theme: parseJson(raw.theme, 'dark') as 'dark' | 'light',
    };
  }

  private loadCompetitionSettings(): void {
    if (this.competition) {
      const loaded = db.getCompetitionSettings(this.competition.id);
      if (loaded) {
        this.competitionSettings = loaded;
      } else {
        this.competitionSettings = { ...DEFAULT_COMPETITION_SETTINGS };
      }
    }
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
    return Array.from(this.judgeConnections.values()).some((j) => j.role === 'main' || j.role === 'admin');
  }

  canControl(socketId: string): boolean {
    const role = this.getJudgeRole(socketId);
    return role === 'admin' || role === 'main' || role === 'assistant';
  }

  canManage(socketId: string): boolean {
    const role = this.getJudgeRole(socketId);
    return role === 'admin' || role === 'main';
  }

  // --- Team Connections ---
  connectTeam(socketId: string, teamId: TeamId, source: InputSource = 'web', deviceId = ''): boolean {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team || !team.enabled) return false;
    const existing = Array.from(this.connections.values()).find((c) => c.teamId === teamId);
    if (existing && existing.socketId !== socketId) return false;
    this.connections.set(socketId, { socketId, teamId, source, deviceId, connectedAt: Date.now() });
    this.addLog(teamId, 'CONNECT', `${team.name} connected via ${source}`);
    return true;
  }

  reconnectTeam(socketId: string, teamId: TeamId): boolean {
    const existing = Array.from(this.connections.entries()).find(([_, c]) => c.teamId === teamId);
    if (existing) this.connections.delete(existing[0]);
    const conn = this.connections.get(socketId);
    this.connections.set(socketId, {
      socketId,
      teamId,
      source: conn?.source ?? 'web',
      deviceId: conn?.deviceId ?? '',
      connectedAt: Date.now(),
    });
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

  // --- Team Profiles ---
  getTeamProfiles(): Record<string, TeamProfile> {
    return { ...this.teamProfiles };
  }

  updateTeamProfile(teamId: string, data: Partial<TeamProfile>): void {
    if (this.competition) {
      db.upsertTeamProfile(teamId, data);
      const existing = this.teamProfiles[teamId] || { teamId, institution: '', members: [], logo: '', photo: '' };
      this.teamProfiles[teamId] = { ...existing, ...data, teamId };
      this.addLog('SYSTEM', 'RESET', `Team profile updated for "${this.getTeamName(teamId)}"`);
    }
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
    this.loadCompetitionSettings();
    this.teamProfiles = db.getTeamProfiles(id);
    this.penaltyRecords = db.getPenaltyRecords(id);
    this.rooms = db.getRooms(id);
    this.bracket = db.getBracket(id);
    this.recalculateAnalytics();
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
      this.competitionSettings = { ...DEFAULT_COMPETITION_SETTINGS };
      this.teamProfiles = {};
      this.penaltyRecords = [];
      this.rooms = [];
      this.bracket = null;
    }
  }

  // --- Competition Settings ---
  getCompetitionSettings(): CompetitionSettings {
    return { ...this.competitionSettings };
  }

  updateCompetitionSettings(partial: Partial<CompetitionSettings>): CompetitionSettings {
    this.competitionSettings = { ...this.competitionSettings, ...partial };
    if (this.competition) {
      const dbData: any = {};
      if (partial.penaltyConfig) dbData.penalty_config = JSON.stringify(partial.penaltyConfig);
      if (partial.falseStartAction) dbData.false_start_action = partial.falseStartAction;
      if (partial.falseStartLockDuration !== undefined) dbData.false_start_lock_duration = partial.falseStartLockDuration;
      if (partial.questionReadingDuration !== undefined) dbData.question_reading_duration = partial.questionReadingDuration;
      if (partial.rebuttalLockDuration !== undefined) dbData.rebuttal_lock_duration = partial.rebuttalLockDuration;
      if (partial.maxRebuttals !== undefined) dbData.max_rebuttals = partial.maxRebuttals;
      db.updateCompetitionSettings(this.competition.id, dbData);
    }
    return { ...this.competitionSettings };
  }

  // --- Penalty System ---
  applyPenalty(teamId: string, type: PenaltyType, points: number, reason: string, appliedBy: string = 'judge'): PenaltyRecord | null {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return null;

    const penaltyId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const record: PenaltyRecord = {
      id: penaltyId,
      teamId,
      type,
      points: -Math.abs(points),
      reason,
      timestamp: new Date().toISOString(),
      appliedBy,
    };

    this.penaltyRecords.push(record);
    this.addScore(teamId, -Math.abs(points));

    if (this.competition) {
      db.addPenaltyRecord(penaltyId, teamId, type, -Math.abs(points), reason, this.competition.id);
    }

    this.addLog(teamId, 'PENALTY', `${team.name} penalty: ${type} (${points > 0 ? '-' : ''}${points}) ${reason ? '- ' + reason : ''}`);
    return record;
  }

  removePenalty(penaltyId: string): boolean {
    const idx = this.penaltyRecords.findIndex(p => p.id === penaltyId);
    if (idx === -1) return false;
    const penalty = this.penaltyRecords[idx];
    this.addScore(penalty.teamId, Math.abs(penalty.points));
    this.penaltyRecords.splice(idx, 1);
    db.removePenaltyRecord(penaltyId);
    this.addLog('SYSTEM', 'RESET', `Penalty ${penaltyId} removed from ${this.getTeamName(penalty.teamId)}`);
    return true;
  }

  overrideScore(teamId: string, score: number, reason: string): boolean {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return false;
    const oldScore = team.score;
    team.score = score;
    db.setScore(teamId, score);
    this.addLog(teamId, 'SCORE_CHANGE', `${team.name} score overridden: ${oldScore} → ${score} (${reason})`);
    return true;
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

  // --- Question Reading Mode ---
  setQuestionReading(enabled: boolean): void {
    this.questionReading = enabled;
    if (enabled) {
      this.state = 'QUESTION_READING';
      this.falseStartActive = false;
      this.falseStartTeam = null;
      this.falseStartTeamName = null;
      this.addLog('SYSTEM', 'RESET', 'Question reading mode activated');

      if (this.competitionSettings.questionReadingDuration > 0) {
        if (this.questionReadingTimeout) clearTimeout(this.questionReadingTimeout);
        this.questionReadingTimeout = setTimeout(() => {
          if (this.questionReading) {
            this.questionReading = false;
            this.state = 'BUZZER_OPEN';
            this.addLog('SYSTEM', 'RESET', 'Buzzer opened after question reading');
          }
        }, this.competitionSettings.questionReadingDuration);
      }
    } else {
      if (this.questionReadingTimeout) {
        clearTimeout(this.questionReadingTimeout);
        this.questionReadingTimeout = null;
      }
      if (this.state === 'QUESTION_READING') {
        this.state = 'BUZZER_OPEN';
      }
    }
  }

  // --- Buzzer ---
  buzz(socketId: string): { success: boolean; winner: TeamId | null; falseStart?: boolean } {
    const teamId = this.getTeamBySocketId(socketId);
    if (!teamId) return { success: false, winner: null };

    const team = this.teams.find((t) => t.id === teamId);
    if (!team || !team.enabled) return { success: false, winner: null };

    if (this.emergencyState === 'stop' || this.emergencyState === 'freeze' || this.emergencyState === 'lock_all') {
      return { success: false, winner: null };
    }

    if (this.state === 'QUESTION_READING') {
      this.handleFalseStart(teamId, team.name);
      return { success: false, winner: null, falseStart: true };
    }

    if (this.state !== 'READY' && this.state !== 'BUZZER_OPEN') {
      return { success: false, winner: this.winner };
    }

    const now = Date.now();
    const lastBuzz = this.lastBuzzTimes.get(teamId) ?? 0;
    if (now - lastBuzz < this.buzzCooldownMs) {
      this.addLog(teamId, 'DUPLICATE', `${team.name} duplicate buzz ignored`);
      return { success: false, winner: null };
    }
    this.lastBuzzTimes.set(teamId, now);

    const responseTime = now - this.currentRoundStartTime;

    this.winner = teamId;
    this.state = 'LOCKED';
    this.awaitingAnswer = true;
    db.setBuzzerState({ state: 'LOCKED', winner_id: teamId, round_id: this.currentRoundId });
    if (this.currentRoundId) {
      db.updateRound(this.currentRoundId, { winner_id: teamId, winner_name: team.name });
    }

    if (this.competition) {
      db.addBuzzRecord(teamId, now, responseTime, this.currentRoundId, null, this.competition.id);
      this.buzzRecords.push({
        teamId,
        timestamp: now,
        responseTime,
        roundId: this.currentRoundId,
        correct: null,
      });
    }

    this.addLog(teamId, 'BUZZ', `${team.name} buzzed (${responseTime}ms)`);
    this.addLog(teamId, 'WINNER', `${team.name} wins!`);

    return { success: true, winner: teamId };
  }

  // --- False Start Detection ---
  private handleFalseStart(teamId: string, teamName: string): void {
    this.falseStartTeam = teamId;
    this.falseStartTeamName = teamName;
    this.falseStartActive = true;

    const action = this.competitionSettings.falseStartAction;
    const penaltyConfig = this.competitionSettings.penaltyConfig;

    switch (action) {
      case 'warning':
        this.addLog(teamId, 'FALSE_START', `FALSE START - ${teamName} (warning only)`);
        break;
      case 'minus_score':
        this.applyPenalty(teamId, 'false_start', Math.abs(penaltyConfig.falseStart), 'False start during question reading');
        break;
      case 'temporary_lock':
        this.addLog(teamId, 'FALSE_START', `FALSE START - ${teamName} (temporarily locked)`);
        break;
      case 'custom_penalty':
        this.applyPenalty(teamId, 'false_start', Math.abs(penaltyConfig.falseStart), 'False start (custom penalty)');
        break;
    }

    if (action === 'temporary_lock') {
      setTimeout(() => {
        this.falseStartActive = false;
        this.falseStartTeam = null;
        this.falseStartTeamName = null;
      }, this.competitionSettings.falseStartLockDuration);
    }
  }

  startRound(): boolean {
    if (this.state === 'READY' || this.state === 'BUZZER_OPEN') return false;
    this.state = 'BUZZER_OPEN';
    this.winner = null;
    this.awaitingAnswer = false;
    this.rebuttalActive = false;
    this.falseStartActive = false;
    this.falseStartTeam = null;
    this.falseStartTeamName = null;
    this.questionReading = false;
    this.lastBuzzTimes.clear();
    this.currentRoundStartTime = Date.now();
    db.setBuzzerState({ state: 'BUZZER_OPEN', winner_id: null });
    this.addLog('SYSTEM', 'RESET', 'Round started');
    return true;
  }

  resetRound(): boolean {
    this.state = 'BUZZER_OPEN';
    this.winner = null;
    this.awaitingAnswer = false;
    this.rebuttalActive = false;
    this.falseStartActive = false;
    this.falseStartTeam = null;
    this.falseStartTeamName = null;
    this.questionReading = false;
    this.lastBuzzTimes.clear();
    this.currentRoundStartTime = Date.now();
    db.setBuzzerState({ state: 'BUZZER_OPEN', winner_id: null });
    this.addLog('SYSTEM', 'RESET', 'Round reset');
    return true;
  }

  // --- Answer Validation ---
  answerCorrect(teamId: string, points: number = 10): void {
    this.awaitingAnswer = false;
    this.addScore(teamId, points);
    this.addLog(teamId, 'ANSWER_CORRECT', `${this.getTeamName(teamId)} answered correctly (+${points})`);

    for (let i = this.buzzRecords.length - 1; i >= 0; i--) {
      const r = this.buzzRecords[i];
      if (r.teamId === teamId && r.correct === null) { r.correct = true; break; }
    }
    if (this.competition) {
      this.recalculateAnalytics();
    }
  }

  answerWrong(teamId: string, points: number = 0): void {
    this.awaitingAnswer = false;
    if (points !== 0) {
      this.addScore(teamId, -Math.abs(points));
    }
    this.addLog(teamId, 'ANSWER_WRONG', `${this.getTeamName(teamId)} answered incorrectly`);

    for (let i = this.buzzRecords.length - 1; i >= 0; i--) {
      const r = this.buzzRecords[i];
      if (r.teamId === teamId && r.correct === null) { r.correct = false; break; }
    }
    if (this.competition) {
      this.recalculateAnalytics();
    }
  }

  answerSkip(): void {
    this.awaitingAnswer = false;
    this.addLog('SYSTEM', 'ANSWER_SKIP', 'Answer skipped');
  }

  // --- Enhanced Rebuttal ---
  startRebuttal(lockDuration?: number): void {
    const duration = lockDuration ?? this.competitionSettings.rebuttalLockDuration;
    this.rebuttalActive = true;
    this.awaitingAnswer = false;
    this.state = 'REBUTTAL';
    this.winner = null;
    this.lastBuzzTimes.clear();
    this.addLog('SYSTEM', 'REBUTTAL', `Rebuttal mode activated (lock: ${duration}ms)`);

    setTimeout(() => {
      if (this.state === 'REBUTTAL') {
        this.state = 'BUZZER_OPEN';
        db.setBuzzerState({ state: 'BUZZER_OPEN' });
        this.addLog('SYSTEM', 'RESET', 'Rebuttal lock released, buzzers open');
      }
    }, duration);
  }

  endRebuttal(): void {
    this.rebuttalActive = false;
    this.state = 'LOCKED';
    db.setBuzzerState({ state: 'LOCKED' });
    this.addLog('SYSTEM', 'RESET', 'Rebuttal mode ended');
  }

  // --- Emergency Controls ---
  emergencyStop(): void {
    this.emergencyState = 'stop';
    this.state = 'LOCKED';
    this.winner = null;
    this.awaitingAnswer = false;
    this.timer.running = false;
    this.timer.startedAt = null;
    if (this.timerExpiryInterval) clearInterval(this.timerExpiryInterval);
    db.setBuzzerState({ state: 'LOCKED', winner_id: null });
    this.addLog('SYSTEM', 'EMERGENCY_STOP', 'EMERGENCY STOP activated');
  }

  emergencyFreeze(): void {
    this.emergencyState = 'freeze';
    this.timer.running = false;
    this.timer.startedAt = null;
    if (this.timerExpiryInterval) clearInterval(this.timerExpiryInterval);
    this.addLog('SYSTEM', 'EMERGENCY_FREEZE', 'EMERGENCY FREEZE activated');
  }

  emergencyUnlock(): void {
    this.emergencyState = 'none';
    this.addLog('SYSTEM', 'RESET', 'Emergency cleared, system resumed');
  }

  lockAllBuzzers(): void {
    this.emergencyState = 'lock_all';
    this.state = 'LOCKED';
    this.timer.running = false;
    db.setBuzzerState({ state: 'LOCKED' });
    this.addLog('SYSTEM', 'EMERGENCY_STOP', 'All buzzers locked');
  }

  // --- Rooms ---
  getRooms(): RoomInfo[] {
    return [...this.rooms];
  }

  getCurrentRoom(): RoomInfo | null {
    return this.rooms.find(r => r.id === this.currentRoomId) ?? null;
  }

  createRoom(name: string, teamIds: string[]): RoomInfo {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const room: RoomInfo = { id, name, competitionId: this.competition?.id ?? '', teamIds, judgeId: null, createdAt: new Date().toISOString() };
    this.rooms.push(room);
    if (this.competition) {
      db.createRoom(id, name, this.competition.id, teamIds);
    }
    this.addLog('SYSTEM', 'ROOM_CREATED', `Room "${name}" created`);
    return room;
  }

  deleteRoom(roomId: string): boolean {
    const idx = this.rooms.findIndex(r => r.id === roomId);
    if (idx === -1) return false;
    const room = this.rooms[idx];
    this.rooms.splice(idx, 1);
    db.deleteRoom(roomId);
    this.addLog('SYSTEM', 'RESET', `Room "${room.name}" deleted`);
    return true;
  }

  switchRoom(roomId: string): boolean {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return false;
    this.currentRoomId = roomId;
    this.addLog('SYSTEM', 'ROOM_SWITCHED', `Switched to room "${room.name}"`);
    return true;
  }

  // --- Tournament Bracket ---
  getBracket(): BracketData | null {
    return this.bracket ? { ...this.bracket, matches: [...this.bracket.matches] } : null;
  }

  createBracket(phase: CompetitionPhase, teamIds: string[]): BracketData {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const matches = this.generateBracketMatches(phase, teamIds);
    this.bracket = { id, competitionId: this.competition?.id ?? '', phase, matches, qualifiers: teamIds };
    if (this.competition) {
      db.createBracket(id, this.competition.id, phase, matches, teamIds);
    }
    this.addLog('SYSTEM', 'BRACKET_UPDATED', `Tournament bracket created for ${phase}`);
    return this.bracket;
  }

  private generateBracketMatches(phase: CompetitionPhase, teamIds: string[]): BracketMatch[] {
    const matches: BracketMatch[] = [];
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push({
        id: `${phase}_m${Math.floor(i / 2)}`,
        phase,
        roundNumber: Math.floor(i / 2),
        team1Id: shuffled[i] || null,
        team2Id: shuffled[i + 1] || null,
        winnerId: null,
        score1: 0,
        score2: 0,
        status: 'pending',
      });
    }
    return matches;
  }

  advanceWinner(matchId: string, winnerId: string): boolean {
    if (!this.bracket) return false;
    const match = this.bracket.matches.find(m => m.id === matchId);
    if (!match) return false;
    match.winnerId = winnerId;
    match.status = 'completed';
    if (match.team1Id === winnerId) match.score1 = 1;
    else match.score2 = 1;
    this.addLog('SYSTEM', 'TOURNAMENT_ADVANCED', `${this.getTeamName(winnerId)} advances from ${matchId}`);
    return true;
  }

  editBracketMatch(matchId: string, team1Id: string | null, team2Id: string | null): boolean {
    if (!this.bracket) return false;
    const match = this.bracket.matches.find(m => m.id === matchId);
    if (!match) return false;
    match.team1Id = team1Id;
    match.team2Id = team2Id;
    match.winnerId = null;
    match.score1 = 0;
    match.score2 = 0;
    match.status = 'pending';
    this.addLog('SYSTEM', 'BRACKET_UPDATED', `Match ${matchId} updated`);
    return true;
  }

  generateQualifiers(rules: QualificationRule[]): string[] {
    const qualified: string[] = [];
    for (const rule of rules) {
      if (rule.type === 'top_n_per_group') {
        const groupTeams = this.teams.filter(t => t.enabled).sort((a, b) => b.score - a.score).slice(0, rule.count);
        qualified.push(...groupTeams.map(t => t.id));
      } else if (rule.type === 'top_n_overall') {
        const topTeams = this.teams.filter(t => t.enabled).sort((a, b) => b.score - a.score).slice(0, rule.count);
        qualified.push(...topTeams.map(t => t.id));
      }
    }
    const unique = [...new Set(qualified)];
    this.addLog('SYSTEM', 'BRACKET_UPDATED', `Generated qualifiers: ${unique.map(id => this.getTeamName(id)).join(', ')}`);
    return unique;
  }

  // --- Analytics ---
  recalculateAnalytics(): void {
    if (!this.competition) {
      this.analytics = this.createEmptyAnalytics();
      return;
    }

    const records = db.getBuzzRecords(this.competition.id);
    const teamStats: Record<string, TeamAnalytics> = {};

    for (const t of this.teams) {
      teamStats[t.id] = { buzzes: 0, correct: 0, wrong: 0, totalResponseTime: 0, fastestBuzz: null, avgBuzz: 0 };
    }

    let totalResponseTime = 0;
    let fastestTime = Infinity;
    let fastestTeamId: string | null = null;

    for (const record of records) {
      const stats = teamStats[record.teamId] || { buzzes: 0, correct: 0, wrong: 0, totalResponseTime: 0, fastestBuzz: null, avgBuzz: 0 };
      stats.buzzes++;
      stats.totalResponseTime += record.responseTime;
      totalResponseTime += record.responseTime;

      if (record.responseTime < fastestTime) {
        fastestTime = record.responseTime;
        fastestTeamId = record.teamId;
      }
      if (!stats.fastestBuzz || record.responseTime < stats.fastestBuzz) {
        stats.fastestBuzz = record.responseTime;
      }

      if (record.correct === true) stats.correct++;
      if (record.correct === false) stats.wrong++;

      teamStats[record.teamId] = stats;
    }

    for (const id of Object.keys(teamStats)) {
      const s = teamStats[id];
      s.avgBuzz = s.buzzes > 0 ? s.totalResponseTime / s.buzzes : 0;
    }

    const correctAnswers = records.filter(r => r.correct === true).length;
    const wrongAnswers = records.filter(r => r.correct === false).length;

    let mostCorrectTeam: { teamId: string; teamName: string; count: number } | null = null;
    let mostActiveTeam: { teamId: string; teamName: string; count: number } | null = null;

    for (const [id, stats] of Object.entries(teamStats)) {
      if (!mostCorrectTeam || stats.correct > mostCorrectTeam.count) {
        mostCorrectTeam = { teamId: id, teamName: this.getTeamName(id), count: stats.correct };
      }
      if (!mostActiveTeam || stats.buzzes > mostActiveTeam.count) {
        mostActiveTeam = { teamId: id, teamName: this.getTeamName(id), count: stats.buzzes };
      }
    }

    this.analytics = {
      totalBuzzes: records.length,
      correctAnswers,
      wrongAnswers,
      averageResponseTime: records.length > 0 ? totalResponseTime / records.length : 0,
      fastestResponseTime: fastestTeamId ? fastestTime : 0,
      fastestTeam: fastestTeamId ? { teamId: fastestTeamId, teamName: this.getTeamName(fastestTeamId), time: fastestTime } : null,
      mostCorrect: mostCorrectTeam?.count ? mostCorrectTeam : null,
      mostActive: mostActiveTeam?.count ? mostActiveTeam : null,
      teamStats,
    };
  }

  getAnalytics(): CompetitionAnalytics {
    return { ...this.analytics, teamStats: { ...this.analytics.teamStats } };
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
      teamProfiles: this.getTeamProfiles(),
      room: this.getCurrentRoom() ?? undefined,
      rooms: this.getRooms(),
      bracket: this.getBracket() ?? undefined,
      analytics: this.getAnalytics(),
      competitionSettings: this.getCompetitionSettings(),
      falseStartActive: this.falseStartActive,
      falseStartTeam: this.falseStartTeam,
      falseStartTeamName: this.falseStartTeamName,
      emergencyState: this.emergencyState,
      questionReading: this.questionReading,
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
