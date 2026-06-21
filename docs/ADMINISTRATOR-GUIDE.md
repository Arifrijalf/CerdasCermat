# QuickBuzz v2.0 - Administrator Guide

## System Requirements

- Node.js 18+
- npm 9+
- Local network (no internet required)

## Installation

```bash
npm run install:all
npm run build
npm start
```

## Server Configuration

Configure via `.env` file:

```
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*
```

## Database

SQLite database auto-created at `data/quickbuzz.db`. Tables:

- `competitions` - Competition records
- `teams` - Team configs per competition
- `rounds` - Round records per competition
- `team_profiles` - Team institution, members, logo
- `competition_settings` - Per-competition penalty/false start config
- `rooms` - Multi-room configurations
- `brackets` - Tournament bracket data
- `buzz_records` - Reaction time tracking
- `penalty_records` - Penalty audit trail
- `hardware_inputs` - ESP32/hardware device tracking
- `audit_log` - Event audit trail
- `settings` - App-wide settings
- `buzzer_state` - Singleton buzzer state

## Backup & Restore

### Via Judge Dashboard

1. Open Judge page
2. Click "Export" in Competition Manager
3. Save JSON file

### Via REST API

```bash
# Export
curl http://localhost:3000/api/backup -o backup.json

# Import
curl -X POST http://localhost:3000/api/backup/import \
  -H "Content-Type: application/json" \
  -d @backup.json
```

Backup includes: competitions, teams, rounds, settings, team profiles, competition settings, rooms, brackets, buzz records, penalty records, audit logs.

## Multi-Room Setup

1. Open Judge Dashboard
2. Click "Rooms" button
3. Create room with name and select teams
4. Switch between rooms to manage different competition areas
5. Each room has independent teams and judging

## Tournament Brackets

1. Set up teams and competition
2. Click "Bracket" button on Judge Dashboard
3. Select bracket phase (Quarter Final, Semi Final, etc.)
4. System generates bracket matches
5. Pick winners to advance through the bracket

## Emergency Controls

Access via "Emergency" button on Judge Dashboard:

- **EMERGENCY STOP**: Halts all activity, resets buzzer
- **FREEZE COMPETITION**: Pauses timer and locks state
- **RESUME**: Clears emergency state

## Roles

| Role | Access |
|------|--------|
| Admin | Full access, competition settings, emergency controls |
| Main Judge | Competition control, scoring, emergency |
| Assistant | Scoring only |
| Viewer | Read only |

Access roles via URL: `/judge/admin`, `/judge/assistant`, `/judge/viewer`

## Kiosk Mode

Add `?kiosk=true` to team page URL to enable kiosk mode:
- Fullscreen
- Disable scrolling/zoom
- Touch optimized
- Prevents accidental navigation
