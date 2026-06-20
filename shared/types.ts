export type TeamId = string;
export type GameState = 'READY' | 'LOCKED' | 'REBUTTAL';
export type EventType = 'CONNECT' | 'DISCONNECT' | 'BUZZ' | 'DUPLICATE' | 'WINNER' | 'RESET' | 'ANSWER_CORRECT' | 'ANSWER_WRONG' | 'ANSWER_SKIP' | 'SCORE_CHANGE' | 'TIMER_START' | 'TIMER_EXPIRED';
export type ConnectionQuality = 'good' | 'fair' | 'poor' | 'disconnected';
export type JudgeRole = 'main' | 'assistant' | 'viewer';

export interface TeamConfig {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  score: number;
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

export interface Competition {
  id: string;
  name: string;
  date: string;
  created_at?: string;
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
}

export interface ServerEvents {
  'game:status': (status: GameStatus) => void;
  'game:winner': (data: { winner: TeamId; winnerName: string; team: TeamId }) => void;
  'game:ready': () => void;
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
}

export interface ClientEvents {
  'join:team': (data: { team: TeamId }) => void;
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
}
