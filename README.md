# QuickBuzz v2.0 - Professional Competition Platform

A professional-grade, real-time buzzer system for quiz competitions. Fully offline, local network operation with SQLite persistence, PWA support, OBS integration, tournament brackets, multi-room support, and ESP32 hardware compatibility.

## Quick Start

```bash
cd quickbuzz
npm install
npm run build
npm start
```

Open `http://YOUR_IP:3000/judge` on the judge device.

## Routes

### Judge Dashboard

| Route | Purpose |
|-------|---------|
| `/judge` | Main judge dashboard |
| `/judge/admin` | Admin role (full access) |
| `/judge/assistant` | Assistant role (scoring only) |
| `/judge/viewer` | Viewer role (read only) |

### Team Buzzer

| Route | Purpose |
|-------|---------|
| `/team/:id` | Participant buzzer (e.g., `/team/A`) |

### Display Screens

| Route | Purpose |
|-------|---------|
| `/display` | Main display (winner + teams) |
| `/display/scoreboard` | Scoreboard ranking |
| `/display/winner` | Winner announcement |
| `/display/bracket` | Tournament bracket |
| `/display/timer` | Large countdown timer |

### OBS Overlays

| Route | Purpose |
|-------|---------|
| `/overlay/winner` | Winner name overlay |
| `/overlay/score` | Top 5 scores overlay |
| `/overlay/timer` | Timer overlay |
| `/overlay/bracket` | Bracket overlay |

### REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Health check |
| GET | `/api/status/game` | Full game state |
| GET | `/api/status/teams` | Teams + connections |
| GET | `/api/status/timer` | Timer state |
| GET | `/api/status/scoreboard` | Scoreboard sorted |
| GET | `/api/analytics` | Competition analytics |
| GET | `/api/bracket` | Tournament bracket |
| GET | `/api/rooms` | Room list |
| POST | `/api/buzz` | Hardware buzz endpoint |
| POST | `/api/reset` | Reset current round |
| GET | `/api/logs/csv` | Export logs as CSV |
| GET | `/api/logs/json` | Export logs as JSON |
| GET | `/api/backup` | Export full database |
| POST | `/api/backup/import` | Import database |

## Architecture

```
quickbuzz/
├── server/                    # Node.js + Express + Socket.IO (TypeScript)
│   ├── src/services/
│   │   ├── Database.ts        # SQLite persistence (14 tables)
│   │   └── GameState.ts       # State machine + all competition logic
│   ├── src/socket/handler.ts  # All WebSocket event handlers
│   ├── src/app.ts             # Express routes (REST API + ESP32 API)
│   └── src/index.ts           # HTTP server + LAN IP + mDNS
├── client/                    # React + Vite (TypeScript)
│   ├── src/pages/
│   │   ├── TeamPage.tsx       # Buzzer + false start warning
│   │   ├── JudgePage.tsx      # Full dashboard (all panels)
│   │   ├── DisplayPage.tsx    # Multi-view projector display
│   │   └── OverlayPage.tsx    # OBS browser source overlays
│   ├── src/components/        # UI components
│   └── src/hooks/useSocket.ts # Socket.IO with all event bindings
├── shared/types.ts            # Shared TypeScript types (all interfaces)
├── data/                      # SQLite database (auto-created)
├── docs/                      # Documentation guides
└── vitest.config.ts           # Test configuration
```

## Client Flow

```
Team Device                  Judge Device                 Display/Projector
    │                              │                              │
    ├── join:team ───────────────> │                              │
    │   (auto-connect)             │                              │
    │                              ├── judge:join ────────────>   │
    │                              │                              │
    │                              ├── judge:start ───────────>   │
    │                              │   (BUZZER_OPEN)             │
    │                              │                              │
    ├── buzz ───────────────────>  │                              │
    │   (first team wins)          │                              │
    │                              │<── game:winner ──────────   │
    │<── game:status ──────────   │                              │
    │   (LOCKED + winner)          │                              │
    │                              │                              │
    │                              ├── judge:answer-correct ──>  │
    │                              │   (score +10)              │
    │                              │                              │
    │                              ├── judge:reset ───────────>  │
    │                              │   (BUZZER_OPEN)             │
```

## Socket Flow

```
Client ──buzz──> Server
  │                 │
  │            Validate state
  │            Check team exists
  │            Check false start
  │            Record buzz time
  │            Update DB
  │                 │
  │<──game:status───┤
  │<──game:winner───┤  (broadcast to all)
  │                 │
  │            io.emit('game:status')
  │            io.emit('game:winner')
```

## Game States

```
LOCKED ──startRound──> BUZZER_OPEN
    ^                      │
    │                      ├── buzz() (first team wins)
    │                      │      │
    │                      │      v
    │                      │    LOCKED (awaitingAnswer)
    │                      │      │
    │                      │  correct / wrong / skip
    │                      │      │
    │                      │      v
    │                      │    RESET
    │                      │
    │  rebuttalStart ──> REBUTTAL
    │                      │
    └──────────────────────┘

QUESTION_READING (during question read)
    │
    └── any buzz ──> FALSE_START
```

## Tournament Architecture

```
Group Stage ──────> Quarter Finals ──> Semi Finals ──> Final
    │                    │                  │             │
    ├── Team A           ├── A vs B         ├── W1 vs W2   ├── Winner
    ├── Team B           ├── C vs D         │             │
    ├── Team C           ├── E vs F         ├── W3 vs W4   └── Champion
    ├── Team D           └── G vs H         │
    ├── Team E                             └── ...
    ├── Team F
    ├── Team G
    └── Team H
```

## Features

### False Start Detection

- Question Reading mode prevents premature buzzing
- Configurable actions: warning, minus score, temporary lock, custom penalty
- Visual FALSE START overlay on all displays
- Full event logging

### Advanced Penalty System

- Wrong answer penalty (configurable per competition)
- False start penalty
- Rule violation penalty
- Custom penalties with reason tracking
- All penalties logged with audit trail

### Rebuttal Mode

- After wrong answer, judge activates rebuttal
- Configurable lock period
- Other teams can buzz to answer
- Original team locked out

### Team Profiles

- Institution/school name
- Participant names (members list)
- Logo and photo support
- Displayed across all views

### Tournament Bracket System

- Group Stage, Quarter Final, Semi Final, Final
- Visual bracket on display and overlay
- Pick winners to advance
- Auto-generate brackets from team list

### Qualification Engine

- Top N per group
- Top N overall
- Custom qualification rules
- Auto-generate next round brackets

### Multi-Room Support

- Create rooms with assigned teams
- Independent scoring per room
- Switch between rooms on judge dashboard
- All rooms served from single server

### Multi-Role System

| Role | Permissions |
|------|-------------|
| Admin | Full access + competition settings + emergency |
| Main Judge | Competition control + scoring + emergency |
| Assistant | Scoring only |
| Viewer | Read only |

### Analytics

- Total buzzes, correct/wrong answers
- Average and fastest response time
- Team rankings: Fastest, Most Correct, Most Active
- Per-team buzz analytics

### Reaction Time Analysis

- Server-side timestamp recording
- Response time per buzz
- Team ranking by reaction speed
- Visual analytics dashboard

### Emergency Controls

- EMERGENCY STOP: Halt all activity
- FREEZE COMPETITION: Pause timer and state
- LOCK ALL BUZZERS: Disable all input
- RESUME: Clear emergency state

### Hardware Integration

- Unified input API for all devices
- Sources: Web, PWA, ESP32, Arduino
- Same server-side processing for all inputs
- Device tracking and logging

### ESP32 Compatibility API

REST endpoints:
```
GET  /api/status/game
GET  /api/status/teams
GET  /api/status/timer
GET  /api/status/scoreboard
POST /api/buzz
POST /api/reset
```

WebSocket events:
```
join:team:hw  - Join as hardware device
buzz          - Send buzz event
game:status   - Receive game state
game:winner   - Receive winner notification
```

### Kiosk Mode

- Fullscreen on team devices
- Disable scrolling and zooming
- Touch optimized
- Prevent accidental navigation

### LAN Discovery

- mDNS advertisement as `quickbuzz.local`
- Auto-detect local IP
- Works on local network without internet

### Backup & Restore

- Export: competitions, teams, rounds, settings, profiles, rooms, brackets, buzz records, penalties, logs
- Import: full state restoration
- JSON and CSV formats
- Versioned backup format (v2.0.0)

### Display System

- Main display with winner + team status
- Scoreboard ranking display
- Winner-only announcement
- Tournament bracket display
- Large countdown timer
- All views real-time synchronized

### OBS Integration

- Transparent browser source overlays
- Winner name overlay
- Top 5 score overlay
- Timer overlay
- Bracket overlay
- Zero configuration

### Reliability

- Server as single source of truth
- SQLite WAL mode for concurrent reads
- Auto-reconnect with session restoration
- Race condition prevention in buzz handling
- Emergency state preservation on disconnect

## Installation

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

### Install

```bash
cd quickbuzz
npm install
```

### Development

```bash
npm run dev
```

Server: http://localhost:3000 | Client: http://localhost:5173

### Production Build

```bash
npm run build
npm run start
```

## LAN Deployment

1. Find your local IP:

   ```bash
   ipconfig           # Windows
   ifconfig | grep inet  # macOS/Linux
   ```

2. Start server: `npm run build && npm run start`

3. Open on connected devices:
   - Judge: `http://192.168.x.x:3000/judge`
   - Teams: `http://192.168.x.x:3000/team/A`
   - Display: `http://192.168.x.x:3000/display`
   - Bracket: `http://192.168.x.x:3000/display/bracket`

4. Allow port through firewall:

   ```powershell
   netsh advfirewall firewall add rule name="QuickBuzz" dir=in action=allow protocol=tcp localport=3000
   ```

## OBS Setup

Add these as Browser Sources in OBS:

| Source | URL | Width | Height |
|--------|-----|-------|--------|
| Winner | `/overlay/winner` | 800 | 200 |
| Scores | `/overlay/score` | 400 | 300 |
| Timer | `/overlay/timer` | 200 | 150 |
| Bracket | `/overlay/bracket` | 400 | 400 |

Enable "Allow transparency" in OBS browser source properties.

## Testing

```bash
npm test
```

Runs 22 unit tests covering:

- Winner selection (first buzz wins, lock enforcement)
- Lock logic (state transitions)
- Score calculation (add, subtract, set)
- Answer validation (awaiting state, correct scoring)
- Rebuttal mode (activation, lock duration)
- Timer (duration, running state, reset)
- Duplicate protection
- Competition management (create, load)

## Documentation

- [Administrator Guide](docs/ADMINISTRATOR-GUIDE.md)
- [Judge Guide](docs/JUDGE-GUIDE.md)
- [Team Guide](docs/TEAM-GUIDE.md)
- [LAN Deployment Guide](docs/LAN-DEPLOYMENT-GUIDE.md)
- [Multi-Room Setup Guide](docs/MULTI-ROOM-GUIDE.md)
- [OBS Setup Guide](docs/OBS-SETUP-GUIDE.md)
- [ESP32 Integration Guide](docs/ESP32-INTEGRATION-GUIDE.md)

## Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |

## Troubleshooting

### Cannot connect from other devices

- Check firewall allows port 3000
- Use `0.0.0.0` as HOST (default)
- All devices must be on same WiFi network
- Try `http://[local-ip]:3000` (not localhost)

### SQLite errors

- The `data/` directory is auto-created
- Ensure write permissions in install directory
- Backup before deleting database files

### Sound not working

- Browser autoplay policies may require first interaction
- Check sound is enabled in settings
- Increase volume slider

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO, better-sqlite3, TypeScript
- **Frontend**: React 18, Vite, Socket.IO Client, TypeScript
- **PWA**: vite-plugin-pwa, Workbox
- **QR**: qrcode
- **Audio**: Web Audio API
- **Testing**: Vitest
- **Database**: SQLite (better-sqlite3)
- **Network**: mDNS (optional)
