import { useEffect, useState, useCallback, useRef } from 'react';
import type { GameStatus, TeamId, ConnectionQuality, JudgeRole, PenaltyType, QualificationRule, CompetitionPhase } from '@quickbuzz/shared';
import { getSocket, type TypedSocket } from '../services/socket';

interface UseSocketReturn {
  socket: TypedSocket;
  status: GameStatus | null;
  connected: boolean;
  quality: ConnectionQuality;
  ping: number | null;
  joinTeam: (team: TeamId) => void;
  joinJudge: (role?: JudgeRole) => void;
  buzz: () => void;
  startRound: () => void;
  resetRound: () => void;
  addTeam: (name: string, color: string) => void;
  editTeam: (id: string, name: string, color: string, enabled: boolean) => void;
  deleteTeam: (id: string) => void;
  updateSettings: (partial: Record<string, unknown>) => void;

  addScore: (teamId: string, points: number) => void;
  setScore: (teamId: string, score: number) => void;
  answerCorrect: (teamId: string, points?: number) => void;
  answerWrong: (teamId: string, points?: number) => void;
  answerSkip: () => void;
  rebuttalStart: (lockDuration?: number) => void;
  rebuttalEnd: () => void;

  createCompetition: (name: string, date: string) => void;
  loadCompetition: (id: string) => void;
  deleteCompetition: (id: string) => void;
  createRound: (name: string) => void;
  renameRound: (id: string, name: string) => void;
  closeRound: (id: string) => void;
  openRound: (id: string) => void;
  selectRound: (id: string) => void;

  timerSet: (duration: number) => void;
  timerStart: () => void;
  timerPause: () => void;
  timerResume: () => void;
  timerReset: () => void;

  backupExport: () => void;
  backupImport: (json: string) => void;
  exportLogs: () => void;
  timerExpired: number;

  setQuestionReading: (enabled: boolean) => void;
  emergencyStop: () => void;
  emergencyFreeze: () => void;
  emergencyUnlock: () => void;
  applyPenalty: (teamId: string, type: PenaltyType, points: number, reason: string) => void;
  removePenalty: (penaltyId: string) => void;
  overrideScore: (teamId: string, score: number, reason: string) => void;
  updateTeamProfile: (teamId: string, profile: Record<string, unknown>) => void;
  updateCompetitionSettings: (partial: Record<string, unknown>) => void;

  createRoom: (name: string, teamIds: string[]) => void;
  deleteRoom: (roomId: string) => void;
  switchRoom: (roomId: string) => void;
  requestRooms: () => void;

  createBracket: (phase: CompetitionPhase, teamIds: string[]) => void;
  advanceWinner: (matchId: string, winnerId: string) => void;
  editBracketMatch: (matchId: string, team1Id: string | null, team2Id: string | null) => void;
  generateQualifiers: (rules: QualificationRule[]) => void;
  requestBracket: () => void;
  requestAnalytics: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef(getSocket());
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [connected, setConnected] = useState(socketRef.current.connected);
  const [quality, setQuality] = useState<ConnectionQuality>(
    socketRef.current.connected ? 'good' : 'disconnected'
  );
  const [ping, setPing] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState<number>(0);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buzzDebounceRef = useRef(false);

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => { setConnected(true); setQuality('good'); };
    const onDisconnect = (reason: string) => {
      setConnected(false);
      setQuality(reason === 'io server disconnect' ? 'disconnected' : 'fair');
    };
    const onReconnectAttempt = () => setQuality('fair');
    const onReconnect = () => { setConnected(true); setQuality('good'); };
    const onReconnectError = () => setQuality('poor');
    const onStatus = (s: GameStatus) => {
      setStatus(s);
      if (s.settings) {
        if (s.settings.theme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    };
    const onPong = (data: { serverTime: number }) => {
      const measuredPing = Math.max(0, Date.now() - data.serverTime);
      setPing(measuredPing);
      if (measuredPing < 50) setQuality('good');
      else if (measuredPing < 150) setQuality('fair');
      else setQuality('poor');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    (socket as any).on('reconnect_attempt', onReconnectAttempt);
    (socket as any).on('reconnect', onReconnect);
    (socket as any).on('reconnect_error', onReconnectError);
    socket.on('game:status', onStatus);
    socket.on('pong', onPong);
    socket.on('timer:expired', () => setTimerExpired((n) => n + 1));

    if (socket.connected) setConnected(true);

    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) socket.emit('ping');
    }, 5000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      (socket as any).off('reconnect_attempt', onReconnectAttempt);
      (socket as any).off('reconnect', onReconnect);
      (socket as any).off('reconnect_error', onReconnectError);
      socket.off('game:status', onStatus);
      socket.off('pong', onPong);
      socket.off('timer:expired');
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []);

  const joinTeam = useCallback((team: TeamId) => { socketRef.current.emit('join:team', { team }); }, []);
  const joinJudge = useCallback((role?: JudgeRole) => { socketRef.current.emit('judge:join', { role: role || 'main' }); }, []);

  const buzz = useCallback(() => {
    if (buzzDebounceRef.current) return;
    buzzDebounceRef.current = true;
    socketRef.current.emit('buzz');
    setTimeout(() => { buzzDebounceRef.current = false; }, 300);
  }, []);

  const startRound = useCallback(() => { socketRef.current.emit('judge:start'); }, []);
  const resetRound = useCallback(() => { socketRef.current.emit('judge:reset'); }, []);

  const addTeam = useCallback((name: string, color: string) => { socketRef.current.emit('judge:add-team', { name, color }); }, []);
  const editTeam = useCallback((id: string, name: string, color: string, enabled: boolean) => {
    socketRef.current.emit('judge:edit-team', { id, name, color, enabled });
  }, []);
  const deleteTeam = useCallback((id: string) => { socketRef.current.emit('judge:delete-team', { id }); }, []);
  const updateSettings = useCallback((partial: Record<string, unknown>) => { socketRef.current.emit('judge:update-settings', partial as any); }, []);

  const addScore = useCallback((teamId: string, points: number) => {
    socketRef.current.emit('judge:add-score', { teamId, points });
  }, []);
  const setScore = useCallback((teamId: string, score: number) => {
    socketRef.current.emit('judge:set-score', { teamId, score });
  }, []);
  const answerCorrect = useCallback((teamId: string, points?: number) => {
    socketRef.current.emit('judge:answer-correct', { teamId, points });
  }, []);
  const answerWrong = useCallback((teamId: string, points?: number) => {
    socketRef.current.emit('judge:answer-wrong', { teamId, points });
  }, []);
  const answerSkip = useCallback(() => { socketRef.current.emit('judge:answer-skip'); }, []);
  const rebuttalStart = useCallback((lockDuration?: number) => {
    socketRef.current.emit('judge:rebuttal-start', { lockDuration });
  }, []);
  const rebuttalEnd = useCallback(() => { socketRef.current.emit('judge:rebuttal-end'); }, []);

  const createCompetition = useCallback((name: string, date: string) => {
    socketRef.current.emit('judge:create-competition', { name, date });
  }, []);
  const loadCompetition = useCallback((id: string) => {
    socketRef.current.emit('judge:load-competition', { id });
  }, []);
  const deleteCompetition = useCallback((id: string) => {
    socketRef.current.emit('judge:delete-competition', { id });
  }, []);
  const createRound = useCallback((name: string) => {
    socketRef.current.emit('judge:create-round', { name });
  }, []);
  const renameRound = useCallback((id: string, name: string) => {
    socketRef.current.emit('judge:rename-round', { id, name });
  }, []);
  const closeRound = useCallback((id: string) => {
    socketRef.current.emit('judge:close-round', { id });
  }, []);
  const openRound = useCallback((id: string) => {
    socketRef.current.emit('judge:open-round', { id });
  }, []);
  const selectRound = useCallback((id: string) => {
    socketRef.current.emit('judge:select-round', { id });
  }, []);

  const timerSet = useCallback((duration: number) => {
    socketRef.current.emit('judge:timer-set', { duration });
  }, []);
  const timerStart = useCallback(() => { socketRef.current.emit('judge:timer-start'); }, []);
  const timerPause = useCallback(() => { socketRef.current.emit('judge:timer-pause'); }, []);
  const timerResume = useCallback(() => { socketRef.current.emit('judge:timer-resume'); }, []);
  const timerReset = useCallback(() => { socketRef.current.emit('judge:timer-reset'); }, []);

  const backupExport = useCallback(() => {
    fetch('/api/backup').then(r => r.json()).then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'quickbuzz-backup.json'; a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const backupImport = useCallback((json: string) => {
    socketRef.current.emit('judge:backup-import', { json });
  }, []);

  const exportLogs = useCallback(() => {
    socketRef.current.emit('logs:export', { format: 'json' });
  }, []);

  // --- New Phase 4 methods ---
  const setQuestionReading = useCallback((enabled: boolean) => {
    socketRef.current.emit('judge:set-question-reading', { enabled });
  }, []);

  const emergencyStop = useCallback(() => { socketRef.current.emit('judge:emergency-stop'); }, []);
  const emergencyFreeze = useCallback(() => { socketRef.current.emit('judge:emergency-freeze'); }, []);
  const emergencyUnlock = useCallback(() => { socketRef.current.emit('judge:emergency-unlock'); }, []);

  const applyPenalty = useCallback((teamId: string, type: PenaltyType, points: number, reason: string) => {
    socketRef.current.emit('judge:apply-penalty', { teamId, type, points, reason });
  }, []);

  const removePenalty = useCallback((penaltyId: string) => {
    socketRef.current.emit('judge:remove-penalty', { penaltyId });
  }, []);

  const overrideScore = useCallback((teamId: string, score: number, reason: string) => {
    socketRef.current.emit('judge:override-score', { teamId, score, reason });
  }, []);

  const updateTeamProfile = useCallback((teamId: string, profile: Record<string, unknown>) => {
    socketRef.current.emit('judge:update-team-profile', { teamId, profile: profile as any });
  }, []);

  const updateCompetitionSettings = useCallback((partial: Record<string, unknown>) => {
    socketRef.current.emit('judge:update-competition-settings', partial as any);
  }, []);

  const createRoom = useCallback((name: string, teamIds: string[]) => {
    socketRef.current.emit('judge:create-room', { name, teamIds });
  }, []);

  const deleteRoom = useCallback((roomId: string) => {
    socketRef.current.emit('judge:delete-room', { roomId });
  }, []);

  const switchRoom = useCallback((roomId: string) => {
    socketRef.current.emit('judge:switch-room', { roomId });
  }, []);

  const requestRooms = useCallback(() => {
    socketRef.current.emit('judge:request-rooms');
  }, []);

  const createBracket = useCallback((phase: CompetitionPhase, teamIds: string[]) => {
    socketRef.current.emit('judge:create-bracket', { phase, teamIds });
  }, []);

  const advanceWinner = useCallback((matchId: string, winnerId: string) => {
    socketRef.current.emit('judge:advance-winner', { matchId, winnerId });
  }, []);

  const editBracketMatch = useCallback((matchId: string, team1Id: string | null, team2Id: string | null) => {
    socketRef.current.emit('judge:edit-bracket-match', { matchId, team1Id, team2Id });
  }, []);

  const generateQualifiers = useCallback((rules: QualificationRule[]) => {
    socketRef.current.emit('judge:generate-qualifiers', { rules });
  }, []);

  const requestBracket = useCallback(() => {
    socketRef.current.emit('judge:request-bracket');
  }, []);

  const requestAnalytics = useCallback(() => {
    socketRef.current.emit('judge:request-analytics');
  }, []);

  return {
    socket: socketRef.current, status, connected, quality, ping,
    joinTeam, joinJudge, buzz, startRound, resetRound,
    addTeam, editTeam, deleteTeam, updateSettings,
    addScore, setScore, answerCorrect, answerWrong, answerSkip,
    rebuttalStart, rebuttalEnd,
    createCompetition, loadCompetition, deleteCompetition,
    createRound, renameRound, closeRound, openRound, selectRound,
    timerSet, timerStart, timerPause, timerResume, timerReset,
    backupExport, backupImport, exportLogs, timerExpired,
    setQuestionReading,
    emergencyStop, emergencyFreeze, emergencyUnlock,
    applyPenalty, removePenalty, overrideScore,
    updateTeamProfile, updateCompetitionSettings,
    createRoom, deleteRoom, switchRoom, requestRooms,
    createBracket, advanceWinner, editBracketMatch, generateQualifiers,
    requestBracket, requestAnalytics,
  };
}
