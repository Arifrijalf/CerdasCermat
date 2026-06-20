import http from 'http';
import os from 'os';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config';
import { gameState } from './services/GameState';
import { setupSocketHandlers } from './socket/handler';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocketHandlers(io);

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

server.listen(config.port, config.host, () => {
  console.log(`QuickBuzz server running on http://${config.host}:${config.port}`);
  console.log(`Local network: http://${localIp}:${config.port}`);
  console.log(`Judge dashboard: http://${localIp}:${config.port}/judge`);
  console.log(`Display: http://${localIp}:${config.port}/display`);
  console.log(`Scoreboard: http://${localIp}:${config.port}/display/scoreboard`);
  console.log(`Winner: http://${localIp}:${config.port}/display/winner`);

  const teams = gameState.getTeams();
  teams.forEach((team) => {
    if (team.enabled) {
      console.log(`  ${team.name}: http://${localIp}:${config.port}/team/${team.id}`);
    }
  });
});
