# Cerdas Cermat

A professional-grade, real-time buzzer system for quiz competitions (Lomba Cerdas Cermat). Fully offline, local network operation with SQLite persistence, PWA support, and OBS integration.

## Quick Start

```bash
cd quickbuzz
npm install
npm run build
npm run start
```

Open `http://YOUR_IP:3000/judge` on the judge device.

## Routes

| Route                 | Purpose                              |
| --------------------- | ------------------------------------ |
| `/judge`              | Judge dashboard (full control)       |
| `/team/:id`           | Participant buzzer (e.g., `/team/A`) |
| `/display`            | Big screen / projector main view     |
| `/display/scoreboard` | Scoreboard-only display view         |
| `/display/winner`     | Winner announcement display          |
| `/overlay/winner`     | OBS overlay — winner name            |
| `/overlay/score`      | OBS overlay — top scores             |
| `/overlay/timer`      | OBS overlay — countdown timer        |

## Architecture

```
quickbuzz/
├── server/                    # Node.js + Express + Socket.IO (TypeScript)
│   ├── src/services/
│   │   ├── Database.ts        # SQLite persistence layer
│   │   └── GameState.ts       # State machine + competition logic
│   ├── src/socket/handler.ts  # All WebSocket event handlers
│   ├── src/app.ts             # Express routes (REST API)
│   └── src/index.ts           # HTTP server + LAN IP detection
├── client/                    # React + Vite (TypeScript)
│   ├── src/pages/
│   │   ├── TeamPage.tsx       # Buzzer with score + timer display
│   │   ├── JudgePage.tsx      # Full dashboard with all controls
│   │   ├── DisplayPage.tsx    # Multi-view projector display
│   │   └── OverlayPage.tsx    # OBS browser source overlays
│   ├── src/components/
│   │   ├── Scoreboard.tsx     # Score management with quick-add
│   │   ├── Timer.tsx          # Countdown timer with controls
│   │   ├── AnswerPanel.tsx    # Correct/Wrong/Skip validation
│   │   ├── CompetitionManager.tsx  # Competition + rounds CRUD
│   │   ├── TeamManager.tsx    # Team CRUD
│   │   ├── SettingsPanel.tsx  # App settings
│   │   ├── QrCodeView.tsx     # QR code generation
│   │   ├── WinnerAnimation.tsx # Full-screen animation
│   │   └── NetworkIndicator.tsx # Ping + quality indicator
│   └── src/hooks/useSocket.ts # Socket.IO with all event bindings
├── shared/types.ts            # Shared TypeScript types + interfaces
├── data/                      # SQLite database (auto-created)
└── vitest.config.ts           # Test configuration
```

## Features

### Competition Management

- Create, edit, save, load, delete competitions
- Each competition stores teams, rounds, scores, and settings
- Data persists in SQLite — no loss on restart

### Team Management

- Dynamic teams — add, edit, delete, enable/disable
- Each team has a name, color, and score
- Default: Alpha, Bravo, Charlie, Delta

### Scoreboard

- Real-time score updates via WebSocket
- Quick-add buttons: -10, -5, +5, +10, +20
- Direct score set with input field
- Auto-sorted by score

### Question Timer

- Configurable durations: 5s, 10s, 15s, 20s, 30s, 60s
- Controls: Start, Pause, Resume, Reset
- Visual bar + animated countdown
- "TIME'S UP!" alert with sound
- Synchronized across all connected devices

### Round Management

- Create named rounds (Round 1, Round 2, ... Semi Final, Final)
- Open/close rounds
- Rename rounds
- Track which team won each round

### Answer Validation Workflow

1. Team wins buzzer
2. Awaiting answer state activates
3. Judge selects: Correct (+points), Wrong (optional penalty), Skip
4. All actions logged to audit trail

### Rebuttal Mode

- After a wrong answer, judge activates rebuttal
- Configurable lock period prevents immediate buzzing
- After lock, buzzers reopen for other teams
- Visual "REBUTTAL" badge on dashboard

### Advanced Display Screens

- **Main view**: Winner + connected teams
- **Scoreboard view**: Full ranking table
- **Winner view**: Full-screen winner announcement
- All views auto-synchronize in real time

### OBS Overlay Mode

- Browser-source compatible transparent overlays
- `overlay/winner` — floating winner name
- `overlay/score` — top 5 scores
- `overlay/timer` — countdown timer
- Zero configuration — just add as browser source in OBS

### Multi-Judge Support

- **Main Judge**: Full control (start/reset, scores, teams, settings)
- **Assistant Judge**: Limited control
- **Viewer**: Read-only access
- Permissions enforced server-side

### Data Persistence (SQLite)

- All data persists to SQLite database
- Competitions, teams, scores, rounds, settings, audit logs
- No data loss on server restart
- WAL mode for concurrent read performance

### Audit Log System

- Every action logged: CONNECT, DISCONNECT, BUZZ, WINNER, ANSWER_CORRECT, ANSWER_WRONG, SCORE_CHANGE, TIMER_START, RESET
- Includes timestamp, team, action, and message
- Immutable — appended via SQLite, cannot be modified
- Exportable to CSV and JSON

### Backup & Restore

- Export full competition state as JSON
- Import JSON to restore any previous state
- API: `GET /api/backup` / `POST /api/backup/import`

### PWA (Progressive Web App)

- Installable on Android, iPhone, Windows
- Service worker with Workbox caching
- App manifest with SVG icons

### Network Quality

- Real-time ping measurement (5s interval)
- Quality indicator: good, fair, poor, disconnected
- Auto-reconnect with session restoration

### Winner Animation

- Full-screen overlay animation
- Stamp-in effect with sparkles
- Suitable for projectors

### Sound Effects

- Web Audio API (no files needed)
- Winner fanfare, ready chime, connect pop
- Volume control + enable/disable

### Accessibility

- High contrast mode (system preference)
- Reduced motion support
- Large touch targets
- Screen reader compatible labels
- Landscape support on mobile

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

## OBS Integration

Add these as Browser Sources in OBS:

| Source | URL               | Width | Height |
| ------ | ----------------- | ----- | ------ |
| Winner | `/overlay/winner` | 800   | 200    |
| Scores | `/overlay/score`  | 400   | 300    |
| Timer  | `/overlay/timer`  | 200   | 150    |

Enable "Allow transparency" in OBS browser source properties.

## API Endpoints

| Method | Path                 | Description                  |
| ------ | -------------------- | ---------------------------- |
| GET    | `/api/status`        | Health check                 |
| GET    | `/api/logs/csv`      | Export audit log as CSV      |
| GET    | `/api/logs/json`     | Export audit log as JSON     |
| GET    | `/api/backup`        | Export full database as JSON |
| POST   | `/api/backup/import` | Import database from JSON    |

## Environment Variables (.env)

| Variable | Default   | Description  |
| -------- | --------- | ------------ |
| `PORT`   | `3000`    | Server port  |
| `HOST`   | `0.0.0.0` | Bind address |

## Configuration (Settings Panel)

- Competition name
- Sound effects on/off + volume
- Dark/Light theme
- Fullscreen toggle

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

### PWA not installing

- Chrome requires HTTPS or localhost
- iPhone requires Safari browser
- Clear browser cache and reload

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

## Future Improvements

- WebRTC for sub-10ms latency
- Tournament mode with brackets
- Team logos/image upload
- Spectator web page
- Multi-language support
- Cloud sync for remote competitions
- Advanced access control (PIN-protected judge login)
