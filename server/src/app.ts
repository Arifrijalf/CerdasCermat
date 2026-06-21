import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { gameState } from './services/GameState';

const app = express();

app.use(cors(config.cors));
app.use(express.json({ limit: '50mb' }));

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// --- Existing API ---
app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

app.get('/api/logs/:format', (req, res) => {
  const format = req.params.format as 'csv' | 'json';
  if (format !== 'csv' && format !== 'json') {
    res.status(400).json({ error: 'Invalid format. Use csv or json.' });
    return;
  }
  const content = gameState.exportLogs(format);
  const contentType = format === 'csv' ? 'text/csv' : 'application/json';
  const ext = format === 'csv' ? 'csv' : 'json';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="quickbuzz-logs.${ext}"`);
  res.send(content);
});

app.get('/api/backup', (_req, res) => {
  const backup = gameState.exportBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="quickbuzz-backup.json"');
  res.send(backup);
});

app.post('/api/backup/import', express.json({ limit: '50mb' }), (req, res) => {
  const ok = gameState.importBackup(JSON.stringify(req.body));
  res.json({ success: ok });
});

// --- ESP32 / Hardware Compatibility API ---
app.post('/api/buzz', (req, res) => {
  const { teamId } = req.body;
  if (!teamId) {
    res.status(400).json({ error: 'teamId required' });
    return;
  }
  const status = gameState.getStatus();
  if (status.state !== 'BUZZER_OPEN' && status.state !== 'READY') {
    res.json({ success: false, reason: 'buzzer_not_open', state: status.state });
    return;
  }
  res.json({
    success: true,
    state: status.state,
    winner: status.winner,
    teams: status.teams,
    message: 'Use WebSocket for real-time buzzing. REST API for status only.',
  });
});

app.get('/api/status/game', (_req, res) => {
  const status = gameState.getStatus();
  res.json({
    state: status.state,
    winner: status.winner,
    winnerName: status.winnerName,
    teams: status.teams,
    connectedTeams: status.connectedTeams,
    timer: status.timer,
    awaitingAnswer: status.awaitingAnswer,
    rebuttalActive: status.rebuttalActive,
    emergencyState: status.emergencyState,
    competition: status.competition,
    currentRound: status.currentRoundName,
  });
});

app.get('/api/status/teams', (_req, res) => {
  const status = gameState.getStatus();
  res.json({ teams: status.teams, connectedTeams: status.connectedTeams });
});

app.get('/api/status/timer', (_req, res) => {
  res.json(gameState.getTimerState());
});

app.get('/api/status/scoreboard', (_req, res) => {
  const teams = gameState.getTeams().sort((a, b) => b.score - a.score);
  res.json({ teams });
});

app.post('/api/reset', (_req, res) => {
  gameState.resetRound();
  res.json({ success: true });
});

// --- Analytics API ---
app.get('/api/analytics', (_req, res) => {
  gameState.recalculateAnalytics();
  res.json(gameState.getAnalytics());
});

// --- Bracket API ---
app.get('/api/bracket', (_req, res) => {
  const bracket = gameState.getBracket();
  res.json(bracket || { matches: [], qualifiers: [], phase: 'group_stage' });
});

// --- Rooms API ---
app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: gameState.getRooms() });
});

// --- SPA fallback ---
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

export default app;
