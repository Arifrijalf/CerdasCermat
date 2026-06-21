# QuickBuzz v2.0 - ESP32 Integration Guide

## Architecture

QuickBuzz provides a hardware abstraction layer for physical buzzer devices.

```
[ESP32 Buzzer] --WiFi--> [QuickBuzz Server]
[Arduino Buzzer] --WiFi--> [QuickBuzz Server]
[Web Client] --WiFi--> [QuickBuzz Server]
[PWA] --WiFi--> [QuickBuzz Server]
```

All input sources are processed through the same server-side logic.

## REST API

### Game Status
```
GET /api/status/game
```
Returns current game state, winner, teams, timer.

### Team Status
```
GET /api/status/teams
```
Returns all teams and connected teams.

### Timer Status
```
GET /api/status/timer
```
Returns current timer state.

### Scoreboard
```
GET /api/status/scoreboard`
```
Returns teams sorted by score.

### Analytics
```
GET /api/analytics
```
Returns competition analytics.

### Reset
```
POST /api/reset
```
Resets the current round.

## WebSocket Events

ESP32 devices should connect via Socket.IO for real-time buzzing:

### Connect
```javascript
const socket = io('http://192.168.1.100:3000');
```

### Join as Hardware Device
```javascript
socket.emit('join:team:hw', {
  team: 'A',
  source: 'esp32',
  deviceId: 'ESP32-001'
});
```

### Buzz
```javascript
socket.emit('buzz');
```

### Listen for Events
```javascript
socket.on('game:status', (status) => {
  // status.state: 'LOCKED' | 'BUZZER_OPEN' | 'REBUTTAL'
  // status.winner: teamId or null
  // status.timer: { remaining, running }
});

socket.on('game:winner', (data) => {
  // data.winner: teamId
  // data.winnerName: team name
});

socket.on('game:ready', () => {
  // Buzzer opened
});

socket.on('timer:expired', () => {
  // Timer ran out
});
```

## Input Sources

The system tracks buzz origin:

| Source | Description |
|--------|-------------|
| `web` | Browser client |
| `pwa` | Progressive Web App |
| `esp32` | ESP32 device |
| `arduino` | Arduino device |
| `future` | Future hardware |

## ESP32 Firmware Guidelines

When implementing ESP32 firmware:

1. Connect to local WiFi
2. Connect to QuickBuzz server via Socket.IO
3. Send `join:team:hw` with team ID and device ID
4. Monitor `game:status` for buzzer state
5. Send `buzz` event on button press
6. Handle reconnection gracefully
7. Store team ID and device ID in EEPROM

## Timing

- Server timestamps all buzz events
- Response time calculated server-side
- Reaction time analytics available via `/api/analytics`
- All timing is relative to round start, not clock time

## Future Devices

The unified input API supports any device that can:
1. Connect to WiFi
2. Send HTTP requests or WebSocket messages
3. Follow the event protocol above
