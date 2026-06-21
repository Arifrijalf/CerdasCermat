import { Server, Socket } from 'socket.io';
import { TeamId, AppSettings, JudgeRole, PenaltyType, InputSource, QualificationRule, CompetitionPhase } from '@quickbuzz/shared';
import { gameState } from '../services/GameState';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('judge:join', (data: { role: JudgeRole }) => {
      const role = data.role || 'main';
      gameState.addJudgeConnection(socket.id, role);
      socket.join('judges');
      socket.emit('game:status', gameState.getStatus());
    });

    socket.emit('game:status', gameState.getStatus());

    // --- Team ---
    socket.on('join:team', (data: { team: TeamId }) => {
      const { team } = data;
      const teamInfo = gameState.getTeams().find((t) => t.id === team);
      if (!teamInfo || !teamInfo.enabled) {
        socket.emit('game:error', { message: `Team "${team}" is not available` });
        return;
      }
      const success = gameState.connectTeam(socket.id, team);
      if (!success) {
        socket.emit('game:error', { message: `"${teamInfo.name}" is already connected from another device` });
        return;
      }
      socket.join(`team:${team}`);
      socket.emit('team:joined', { team, teamName: teamInfo.name });
      socket.emit('game:status', gameState.getStatus(team));
      io.to('judges').emit('team:connected', { teams: gameState.getConnectedTeams() });
      io.to('judges').emit('game:status', gameState.getStatus());
    });

    // --- Hardware Team Join ---
    socket.on('join:team:hw', (data: { team: TeamId; source: InputSource; deviceId: string }) => {
      const { team, source, deviceId } = data;
      const teamInfo = gameState.getTeams().find((t) => t.id === team);
      if (!teamInfo || !teamInfo.enabled) {
        socket.emit('game:error', { message: `Team "${team}" is not available` });
        return;
      }
      const success = gameState.connectTeam(socket.id, team, source, deviceId);
      if (!success) {
        socket.emit('game:error', { message: `"${teamInfo.name}" connection failed` });
        return;
      }
      socket.join(`team:${team}`);
      socket.emit('team:joined', { team, teamName: teamInfo.name });
      socket.emit('game:status', gameState.getStatus(team));
      io.to('judges').emit('team:connected', { teams: gameState.getConnectedTeams() });
    });

    // --- Buzz ---
    socket.on('buzz', () => {
      const result = gameState.buzz(socket.id);
      if (result.falseStart) {
        const teamId = gameState.getTeamBySocketId(socket.id);
        if (teamId) {
          io.emit('game:false-start', {
            teamId,
            teamName: gameState.getTeamName(teamId),
            action: gameState.getCompetitionSettings().falseStartAction,
          });
        }
        io.emit('game:status', gameState.getStatus());
        return;
      }
      if (!result.success) return;
      const winnerId = result.winner!;
      const winnerName = gameState.getTeamName(winnerId);
      io.emit('game:winner', { winner: winnerId, winnerName, team: winnerId });
      io.to(`team:${winnerId}`).emit('game:status', gameState.getStatus(winnerId));
      socket.broadcast.emit('game:status', gameState.getStatus());
      socket.emit('game:status', gameState.getStatus());
    });

    // --- Judge Controls ---
    socket.on('judge:start', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.startRound();
      io.emit('game:ready');
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:reset', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.resetRound();
      io.emit('game:ready');
      io.emit('game:status', gameState.getStatus());
    });

    // --- Question Reading ---
    socket.on('judge:set-question-reading', (data: { enabled: boolean }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.setQuestionReading(data.enabled);
      io.emit('game:status', gameState.getStatus());
    });

    // --- Team Management ---
    socket.on('judge:add-team', (data: { name: string; color: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.addTeam(data.name, data.color);
      io.to('judges').emit('teams:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:edit-team', (data: { id: string; name: string; color: string; enabled: boolean }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.editTeam(data.id, { name: data.name, color: data.color, enabled: data.enabled });
      io.to('judges').emit('teams:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:delete-team', (data: { id: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.deleteTeam(data.id);
      io.to('judges').emit('teams:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Team Profiles ---
    socket.on('judge:update-team-profile', (data: { teamId: string; profile: any }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.updateTeamProfile(data.teamId, data.profile);
      io.emit('game:status', gameState.getStatus());
    });

    // --- Settings ---
    socket.on('judge:update-settings', (data: Partial<AppSettings>) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.updateSettings(data);
      io.emit('settings:updated', { settings: gameState.getSettings() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Competition Settings ---
    socket.on('judge:update-competition-settings', (data: any) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.updateCompetitionSettings(data);
      io.emit('game:status', gameState.getStatus());
    });

    // --- Competitions ---
    socket.on('judge:create-competition', (data: { name: string; date: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.createCompetition(data.name, data.date);
      io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:load-competition', (data: { id: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.loadCompetition(data.id);
      io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:delete-competition', (data: { id: string }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.deleteCompetition(data.id);
      io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Scores ---
    socket.on('judge:add-score', (data: { teamId: string; points: number }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.addScore(data.teamId, data.points);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:set-score', (data: { teamId: string; score: number }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.setScore(data.teamId, data.score);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Penalties ---
    socket.on('judge:apply-penalty', (data: { teamId: string; type: PenaltyType; points: number; reason: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.applyPenalty(data.teamId, data.type, data.points, data.reason);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:remove-penalty', (data: { penaltyId: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.removePenalty(data.penaltyId);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:override-score', (data: { teamId: string; score: number; reason: string }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.overrideScore(data.teamId, data.score, data.reason);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Answer Validation ---
    socket.on('judge:answer-correct', (data: { teamId: string; points?: number }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.answerCorrect(data.teamId, data.points ?? 10);
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:answer-wrong', (data: { teamId: string; points?: number }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.answerWrong(data.teamId, data.points ?? 0);
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:answer-skip', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.answerSkip();
      io.emit('game:status', gameState.getStatus());
    });

    // --- Rebuttal ---
    socket.on('judge:rebuttal-start', (data: { lockDuration?: number }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.startRebuttal(data.lockDuration);
      io.emit('game:status', gameState.getStatus());
      const duration = data.lockDuration ?? gameState.getCompetitionSettings().rebuttalLockDuration;
      setTimeout(() => {
        io.emit('game:status', gameState.getStatus());
      }, duration + 100);
    });

    socket.on('judge:rebuttal-end', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.endRebuttal();
      io.emit('game:status', gameState.getStatus());
    });

    // --- Emergency Controls ---
    socket.on('judge:emergency-stop', () => {
      if (!gameState.canManage(socket.id)) return;
      gameState.emergencyStop();
      io.emit('game:emergency', { action: 'stop' as const });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:emergency-freeze', () => {
      if (!gameState.canManage(socket.id)) return;
      gameState.emergencyFreeze();
      io.emit('game:emergency', { action: 'freeze' as const });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:emergency-unlock', () => {
      if (!gameState.canManage(socket.id)) return;
      gameState.emergencyUnlock();
      io.emit('game:emergency', { action: 'none' as const });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Rounds ---
    socket.on('judge:create-round', (data: { name: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.createRound(data.name);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:rename-round', (data: { id: string; name: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.renameRound(data.id, data.name);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:close-round', (data: { id: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.closeRound(data.id);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:open-round', (data: { id: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.openRound(data.id);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:select-round', (data: { id: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.selectRound(data.id);
      io.emit('game:status', gameState.getStatus());
    });

    // --- Timer ---
    socket.on('judge:timer-set', (data: { duration: number }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.setTimerDuration(data.duration);
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-start', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.startTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-pause', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.pauseTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-resume', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.resumeTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-reset', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.resetTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    // --- Backup ---
    socket.on('judge:backup-export', () => {
      if (!gameState.canControl(socket.id)) return;
      const backup = gameState.exportBackup();
      socket.emit('game:status', { ...gameState.getStatus(), backupData: backup } as any);
    });

    socket.on('judge:backup-import', (data: { json: string }) => {
      if (!gameState.canManage(socket.id)) return;
      const ok = gameState.importBackup(data.json);
      if (ok) {
        io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
        io.emit('game:status', gameState.getStatus());
      } else {
        socket.emit('game:error', { message: 'Failed to import backup' });
      }
    });

    // --- Logs ---
    socket.on('logs:export', () => {
      socket.emit('game:status', gameState.getStatus());
    });

    // --- Analytics ---
    socket.on('judge:request-analytics', () => {
      if (!gameState.canControl(socket.id)) return;
      gameState.recalculateAnalytics();
      io.emit('analytics:updated', { analytics: gameState.getAnalytics() });
    });

    // --- Rooms ---
    socket.on('judge:create-room', (data: { name: string; teamIds: string[] }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.createRoom(data.name, data.teamIds);
      io.emit('rooms:updated', { rooms: gameState.getRooms() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:delete-room', (data: { roomId: string }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.deleteRoom(data.roomId);
      io.emit('rooms:updated', { rooms: gameState.getRooms() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:switch-room', (data: { roomId: string }) => {
      if (!gameState.canControl(socket.id)) return;
      gameState.switchRoom(data.roomId);
      io.emit('game:room-switched', { roomId: data.roomId });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:request-rooms', () => {
      io.emit('rooms:updated', { rooms: gameState.getRooms() });
    });

    // --- Bracket ---
    socket.on('judge:create-bracket', (data: { phase: CompetitionPhase; teamIds: string[] }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.createBracket(data.phase, data.teamIds);
      io.emit('bracket:updated', { bracket: gameState.getBracket()! });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:advance-winner', (data: { matchId: string; winnerId: string }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.advanceWinner(data.matchId, data.winnerId);
      io.emit('bracket:updated', { bracket: gameState.getBracket()! });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:edit-bracket-match', (data: { matchId: string; team1Id: string | null; team2Id: string | null }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.editBracketMatch(data.matchId, data.team1Id, data.team2Id);
      io.emit('bracket:updated', { bracket: gameState.getBracket()! });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:generate-qualifiers', (data: { rules: QualificationRule[] }) => {
      if (!gameState.canManage(socket.id)) return;
      gameState.generateQualifiers(data.rules);
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:request-bracket', () => {
      const bracket = gameState.getBracket();
      if (bracket) io.emit('bracket:updated', { bracket });
    });

    // --- Ping ---
    socket.on('ping', () => {
      socket.emit('pong', { serverTime: Date.now() });
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      const teamId = gameState.disconnectTeam(socket.id);
      if (teamId) {
        socket.leave(`team:${teamId}`);
        io.to('judges').emit('team:connected', { teams: gameState.getConnectedTeams() });
        io.to('judges').emit('game:status', gameState.getStatus());
      }
      gameState.removeJudgeConnection(socket.id);
    });
  });
}
