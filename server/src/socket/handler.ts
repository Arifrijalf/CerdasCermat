import { Server, Socket } from 'socket.io';
import { TeamId, AppSettings, JudgeRole } from '@quickbuzz/shared';
import { gameState } from '../services/GameState';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    // Judge joins the judge room
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

    // --- Buzz ---
    socket.on('buzz', () => {
      const result = gameState.buzz(socket.id);
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
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.startRound();
      io.emit('game:ready');
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:reset', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.resetRound();
      io.emit('game:ready');
      io.emit('game:status', gameState.getStatus());
    });

    // --- Team Management ---
    socket.on('judge:add-team', (data: { name: string; color: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.addTeam(data.name, data.color);
      io.to('judges').emit('teams:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:edit-team', (data: { id: string; name: string; color: string; enabled: boolean }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.editTeam(data.id, { name: data.name, color: data.color, enabled: data.enabled });
      io.to('judges').emit('teams:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:delete-team', (data: { id: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.deleteTeam(data.id);
      io.to('judges').emit('teams:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Settings ---
    socket.on('judge:update-settings', (data: Partial<AppSettings>) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.updateSettings(data);
      io.emit('settings:updated', { settings: gameState.getSettings() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Competitions ---
    socket.on('judge:create-competition', (data: { name: string; date: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.createCompetition(data.name, data.date);
      io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:load-competition', (data: { id: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.loadCompetition(data.id);
      io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:delete-competition', (data: { id: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.deleteCompetition(data.id);
      io.to('judges').emit('competitions:updated', { competitions: gameState.getCompetitions() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Scores ---
    socket.on('judge:add-score', (data: { teamId: string; points: number }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.addScore(data.teamId, data.points);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:set-score', (data: { teamId: string; score: number }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.setScore(data.teamId, data.score);
      io.emit('scores:updated', { teams: gameState.getTeams() });
      io.emit('game:status', gameState.getStatus());
    });

    // --- Answer Validation ---
    socket.on('judge:answer-correct', (data: { teamId: string; points?: number }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.answerCorrect(data.teamId, data.points ?? 10);
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:answer-wrong', (data: { teamId: string; points?: number }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.answerWrong(data.teamId, data.points ?? 0);
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:answer-skip', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.answerSkip();
      io.emit('game:status', gameState.getStatus());
    });

    // --- Rebuttal ---
    socket.on('judge:rebuttal-start', (data: { lockDuration?: number }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.startRebuttal(data.lockDuration ?? 3000);
      io.emit('game:status', gameState.getStatus());
      setTimeout(() => {
        io.emit('game:status', gameState.getStatus());
      }, (data.lockDuration ?? 3000) + 100);
    });

    socket.on('judge:rebuttal-end', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.endRebuttal();
      io.emit('game:status', gameState.getStatus());
    });

    // --- Rounds ---
    socket.on('judge:create-round', (data: { name: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.createRound(data.name);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:rename-round', (data: { id: string; name: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.renameRound(data.id, data.name);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:close-round', (data: { id: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.closeRound(data.id);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:open-round', (data: { id: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.openRound(data.id);
      io.to('judges').emit('rounds:updated', { rounds: gameState.getRounds() });
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:select-round', (data: { id: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.selectRound(data.id);
      io.emit('game:status', gameState.getStatus());
    });

    // --- Timer ---
    socket.on('judge:timer-set', (data: { duration: number }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.setTimerDuration(data.duration);
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-start', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.startTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-pause', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.pauseTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-resume', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.resumeTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    socket.on('judge:timer-reset', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      gameState.resetTimer();
      io.emit('timer:sync', gameState.getTimerState());
      io.emit('game:status', gameState.getStatus());
    });

    // --- Backup ---
    socket.on('judge:backup-export', () => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
      const backup = gameState.exportBackup();
      socket.emit('game:status', { ...gameState.getStatus(), backupData: backup } as any);
    });

    socket.on('judge:backup-import', (data: { json: string }) => {
      if (gameState.getJudgeRole(socket.id) === 'viewer') return;
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
