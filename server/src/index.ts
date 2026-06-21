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
  pingTimeout: 30000,
  pingInterval: 10000,
  transports: ['websocket'],
  allowUpgrades: false,
  perMessageDeflate: false,
  httpCompression: false,
});

setupSocketHandlers(io);

gameState.onTimerExpired = () => {
  io.volatile.emit('timer:expired');
  io.volatile.emit('timer:sync', gameState.getTimerState());
  io.volatile.emit('game:status', gameState.getStatus());
};

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
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║          QuickBuzz v2.0 - Pro Edition        ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Server:       http://${config.host}:${config.port}`);
  console.log(`  Local:        http://${localIp}:${config.port}`);
  console.log(`  Judge:        http://${localIp}:${config.port}/judge`);
  console.log(`  Display:      http://${localIp}:${config.port}/display`);
  console.log(`  Scoreboard:   http://${localIp}:${config.port}/display/scoreboard`);
  console.log(`  Winner:       http://${localIp}:${config.port}/display/winner`);
  console.log(`  Bracket:      http://${localIp}:${config.port}/display/bracket`);
  console.log(`  Timer:        http://${localIp}:${config.port}/display/timer`);
  console.log('');
  console.log('  OBS Overlays:');
  console.log(`    Winner:     http://${localIp}:${config.port}/overlay/winner`);
  console.log(`    Score:      http://${localIp}:${config.port}/overlay/score`);
  console.log(`    Timer:      http://${localIp}:${config.port}/overlay/timer`);
  console.log(`    Bracket:    http://${localIp}:${config.port}/overlay/bracket`);
  console.log('');
  console.log('  ESP32 API:');
  console.log(`    Status:     http://${localIp}:${config.port}/api/status/game`);
  console.log(`    Teams:      http://${localIp}:${config.port}/api/status/teams`);
  console.log(`    Timer:      http://${localIp}:${config.port}/api/status/timer`);
  console.log(`    Scoreboard: http://${localIp}:${config.port}/api/status/scoreboard`);
  console.log(`    Analytics:  http://${localIp}:${config.port}/api/analytics`);
  console.log('');

  const teams = gameState.getTeams();
  console.log('  Teams:');
  teams.forEach((team) => {
    if (team.enabled) {
      console.log(`    ${team.name}: http://${localIp}:${config.port}/team/${team.id}`);
    }
  });
  console.log('');

  try {
    const mdns = require('mdns-js');
    const ad = mdns.createAdvertisement(mdns.tcp('http'), config.port, {
      name: 'quickbuzz',
    });
    ad.start();
    console.log('  mDNS: quickbuzz.local advertised');
  } catch {
    // mDNS not available - that's fine for LAN
  }
});
