export type TeamId = string;
export type GameState = 'QUESTION_READING' | 'BUZZER_OPEN' | 'LOCKED' | 'READY' | 'REBUTTAL';
export type EventType = 'CONNECT' | 'DISCONNECT' | 'BUZZ' | 'DUPLICATE' | 'WINNER' | 'RESET' | 'ANSWER_CORRECT' | 'ANSWER_WRONG' | 'ANSWER_SKIP' | 'SCORE_CHANGE' | 'TIMER_START' | 'TIMER_EXPIRED' | 'FALSE_START' | 'PENALTY' | 'REBUTTAL' | 'EMERGENCY_STOP' | 'EMERGENCY_FREEZE' | 'ROOM_CREATED' | 'ROOM_SWITCHED' | 'BRACKET_UPDATED' | 'TOURNAMENT_ADVANCED';
export type ConnectionQuality = 'good' | 'fair' | 'poor' | 'disconnected';
export type JudgeRole = 'admin' | 'main' | 'assistant' | 'viewer';
export type CompetitionPhase = 'group_stage' | 'quarter_final' | 'semi_final' | 'final' | 'custom';
export type PenaltyType = 'wrong_answer' | 'false_start' | 'rule_violation' | 'custom';
export type InputSource = 'web' | 'pwa' | 'esp32' | 'arduino' | 'future';
export type EmergencyAction = 'stop' | 'freeze' | 'lock_all' | 'none';

export interface TeamConfig {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  score: number;
}

export interface TeamProfile {
  teamId: string;
  institution: string;
  members: string[];
  logo: string;
  photo: string;
}

export interface LogEntry {
  time: string;
  team: TeamId | 'SYSTEM';
  action: EventType;
  message?: string;
}

export interface AppSettings {
  competitionName: string;
  soundEnabled: boolean;
  soundVolume: number;
  fullscreen: boolean;
  theme: 'dark' | 'light';
}

export interface PenaltyConfig {
  wrongAnswer: number;
  falseStart: number;
  ruleViolation: number;
  custom: number;
}

export interface CompetitionSettings {
  penaltyConfig: PenaltyConfig;
  falseStartAction: FalseStartAction;
  falseStartLockDuration: number;
  questionReadingDuration: number;
  rebuttalLockDuration: number;
  maxRebuttals: number;
}

export type FalseStartAction = 'warning' | 'minus_score' | 'temporary_lock' | 'custom_penalty';

export interface Competition {
  id: string;
  name: string;
  date: string;
  created_at?: string;
  settings?: CompetitionSettings;
}

export interface RoundInfo {
  id: string;
  competition_id: string;
  name: string;
  round_number: number;
  status: string;
  winner_id: string | null;
  winner_name: string | null;
}

export interface TimerState {
  duration: number;
  remaining: number;
  running: boolean;
  startedAt: number | null;
}

export interface GameStatus {
  state: GameState;
  winner: TeamId | null;
  winnerName: string | null;
  connectedTeams: TeamId[];
  teams: TeamConfig[];
  logs: LogEntry[];
  settings: AppSettings;
  yourTeam?: TeamId;
  yourTeamName?: string;
  serverTime: number;
  competition: Competition | null;
  competitions: Competition[];
  currentRoundId: string | null;
  currentRoundName: string | null;
  rounds: RoundInfo[];
  timer: TimerState;
  awaitingAnswer: boolean;
  rebuttalActive: boolean;
  judgeRole?: JudgeRole;
  teamProfiles?: Record<string, TeamProfile>;
  room?: RoomInfo;
  rooms?: RoomInfo[];
  bracket?: BracketData;
  analytics?: CompetitionAnalytics;
  competitionSettings?: CompetitionSettings;
  falseStartActive?: boolean;
  falseStartTeam?: TeamId | null;
  falseStartTeamName?: string | null;
  emergencyState?: EmergencyAction;
  questionReading?: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  competitionId: string;
  teamIds: string[];
  judgeId: string | null;
  createdAt: string;
}

export interface BracketData {
  id: string;
  competitionId: string;
  phase: CompetitionPhase;
  matches: BracketMatch[];
  qualifiers: string[];
}

export interface BracketMatch {
  id: string;
  phase: CompetitionPhase;
  roundNumber: number;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  score1: number;
  score2: number;
  status: 'pending' | 'active' | 'completed';
}

export interface QualificationRule {
  type: 'top_n_per_group' | 'top_n_overall' | 'custom';
  count: number;
  groupId?: string;
}

export interface CompetitionAnalytics {
  totalBuzzes: number;
  correctAnswers: number;
  wrongAnswers: number;
  averageResponseTime: number;
  fastestResponseTime: number;
  fastestTeam: { teamId: string; teamName: string; time: number } | null;
  mostCorrect: { teamId: string; teamName: string; count: number } | null;
  mostActive: { teamId: string; teamName: string; count: number } | null;
  teamStats: Record<string, TeamAnalytics>;
}

export interface TeamAnalytics {
  buzzes: number;
  correct: number;
  wrong: number;
  totalResponseTime: number;
  fastestBuzz: number | null;
  avgBuzz: number;
}

export interface BuzzRecord {
  teamId: string;
  timestamp: number;
  responseTime: number;
  roundId: string | null;
  correct: boolean | null;
}

export interface HardwareInput {
  source: InputSource;
  deviceId: string;
  teamId: string;
  timestamp: number;
}

export interface PenaltyRecord {
  id: string;
  teamId: string;
  type: PenaltyType;
  points: number;
  reason: string;
  timestamp: string;
  appliedBy: string;
}

export interface ServerEvents {
  'game:status': (status: GameStatus) => void;
  'game:winner': (data: { winner: TeamId; winnerName: string; team: TeamId }) => void;
  'game:ready': () => void;
  'game:false-start': (data: { teamId: TeamId; teamName: string; action: FalseStartAction }) => void;
  'game:emergency': (data: { action: EmergencyAction }) => void;
  'game:room-switched': (data: { roomId: string }) => void;
  'team:joined': (data: { team: TeamId; teamName: string }) => void;
  'team:connected': (data: { teams: TeamId[] }) => void;
  'teams:updated': (data: { teams: TeamConfig[] }) => void;
  'settings:updated': (data: { settings: AppSettings }) => void;
  'competitions:updated': (data: { competitions: Competition[] }) => void;
  'rounds:updated': (data: { rounds: RoundInfo[] }) => void;
  'scores:updated': (data: { teams: TeamConfig[] }) => void;
  'timer:sync': (data: TimerState) => void;
  'timer:expired': () => void;
  'game:error': (data: { message: string }) => void;
  'pong': (data: { serverTime: number }) => void;
  'analytics:updated': (data: { analytics: CompetitionAnalytics }) => void;
  'bracket:updated': (data: { bracket: BracketData }) => void;
  'rooms:updated': (data: { rooms: RoomInfo[] }) => void;
}

export interface ClientEvents {
  'join:team': (data: { team: TeamId }) => void;
  'join:team:hw': (data: { team: TeamId; source: InputSource; deviceId: string }) => void;
  'judge:join': (data: { role: JudgeRole }) => void;
  'buzz': () => void;
  'judge:start': () => void;
  'judge:reset': () => void;
  'judge:add-team': (data: { name: string; color: string }) => void;
  'judge:edit-team': (data: { id: string; name: string; color: string; enabled: boolean }) => void;
  'judge:delete-team': (data: { id: string }) => void;
  'judge:update-settings': (data: Partial<AppSettings>) => void;
  'judge:create-competition': (data: { name: string; date: string }) => void;
  'judge:load-competition': (data: { id: string }) => void;
  'judge:delete-competition': (data: { id: string }) => void;
  'judge:add-score': (data: { teamId: string; points: number }) => void;
  'judge:set-score': (data: { teamId: string; score: number }) => void;
  'judge:answer-correct': (data: { teamId: string; points?: number }) => void;
  'judge:answer-wrong': (data: { teamId: string; points?: number }) => void;
  'judge:answer-skip': () => void;
  'judge:rebuttal-start': (data: { lockDuration?: number }) => void;
  'judge:rebuttal-end': () => void;
  'judge:create-round': (data: { name: string }) => void;
  'judge:rename-round': (data: { id: string; name: string }) => void;
  'judge:close-round': (data: { id: string }) => void;
  'judge:open-round': (data: { id: string }) => void;
  'judge:select-round': (data: { id: string }) => void;
  'judge:timer-set': (data: { duration: number }) => void;
  'judge:timer-start': () => void;
  'judge:timer-pause': () => void;
  'judge:timer-resume': () => void;
  'judge:timer-reset': () => void;
  'judge:backup-export': () => void;
  'judge:backup-import': (data: { json: string }) => void;
  'logs:export': (data: { format: 'csv' | 'json' }) => void;
  'ping': () => void;

  'judge:set-question-reading': (data: { enabled: boolean }) => void;
  'judge:emergency-stop': () => void;
  'judge:emergency-freeze': () => void;
  'judge:emergency-unlock': () => void;
  'judge:apply-penalty': (data: { teamId: string; type: PenaltyType; points: number; reason: string }) => void;
  'judge:remove-penalty': (data: { penaltyId: string }) => void;
  'judge:override-score': (data: { teamId: string; score: number; reason: string }) => void;
  'judge:update-team-profile': (data: { teamId: string; profile: Partial<TeamProfile> }) => void;
  'judge:update-competition-settings': (data: Partial<CompetitionSettings>) => void;

  'judge:create-room': (data: { name: string; teamIds: string[] }) => void;
  'judge:delete-room': (data: { roomId: string }) => void;
  'judge:switch-room': (data: { roomId: string }) => void;

  'judge:create-bracket': (data: { phase: CompetitionPhase; teamIds: string[] }) => void;
  'judge:advance-winner': (data: { matchId: string; winnerId: string }) => void;
  'judge:edit-bracket-match': (data: { matchId: string; team1Id: string | null; team2Id: string | null }) => void;
  'judge:generate-qualifiers': (data: { rules: QualificationRule[] }) => void;

  'judge:request-analytics': () => void;
  'judge:request-bracket': () => void;
  'judge:request-rooms': () => void;
}
