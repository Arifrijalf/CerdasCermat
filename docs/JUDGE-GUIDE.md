# QuickBuzz v2.0 - Judge Guide

## Getting Started

1. Open browser and navigate to the Judge Dashboard URL
2. You'll see the main control panel with all competition tools

## Competition Flow

### 1. Setup Competition
- Create a competition with name and date
- Add teams with names and colors
- Configure competition settings (penalties, false start action)

### 2. Run Rounds
- Click **Start Round** to open buzzers
- Teams buzz in using their devices
- First team to buzz wins
- Validate answer: **Correct**, **Wrong**, or **Skip**
- Click **Reset Round** for next question

### 3. Question Reading Mode
- Click **Question Reading** before reading a question
- Buzzer automatically opens after configured duration
- Any buzz during reading triggers **FALSE START** warning

### 4. Rebuttal Mode
- After wrong answer, click **Activate Rebuttal**
- Other teams can buzz to answer
- Original team is locked out

## Controls Reference

| Button | Action |
|--------|--------|
| Start Round | Opens buzzers for teams |
| Reset Round | Resets current round |
| Question Reading | Enables false start detection |
| Emergency | Opens emergency control panel |
| Penalty | Opens penalty application panel |
| Comp Settings | Configure competition rules |
| Profiles | Edit team institution/members |
| Rooms | Manage multi-room setup |
| Bracket | Tournament bracket management |
| Analytics | View competition statistics |

## Score Management

- Use quick-add buttons (+5, +10, +15, +20) in Scoreboard
- Set exact score via direct input
- Apply penalties with reason tracking
- Override scores with audit trail

## Emergency Controls

- **EMERGENCY STOP**: Immediately halts competition
- **FREEZE**: Pauses timer and state
- **RESUME**: Returns to normal operation

## Display URLs

Share these with your AV team:

- Main Display: `http://{ip}:3000/display`
- Scoreboard: `http://{ip}:3000/display/scoreboard`
- Winner Only: `http://{ip}:3000/display/winner`
- Bracket: `http://{ip}:3000/display/bracket`
- Timer: `http://{ip}:3000/display/timer`
