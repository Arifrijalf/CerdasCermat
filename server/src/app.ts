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

app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
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

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

export default app;
