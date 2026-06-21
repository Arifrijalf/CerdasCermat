# QuickBuzz v2.0 - Team Guide

## Joining a Competition

1. Scan the QR code displayed by the judge, OR
2. Open the team URL: `http://{ip}:3000/team/{teamId}`

## Using the Buzzer

1. Wait for **"Waiting for buzz..."** or **"BUZZER_OPEN"** state
2. Tap the buzzer button when ready
3. If you buzz first, you'll see the winner animation
4. Wait for judge to validate your answer

## States

| State | Meaning |
|-------|---------|
| LOCKED | Buzzers disabled, waiting for judge |
| QUESTION_READING | Question being read, do not buzz |
| BUZZER_OPEN | Buzzers active, tap to buzz |
| REBUTTAL | Other teams can buzz after wrong answer |

## False Start Warning

If you buzz during **QUESTION_READING** state:
- Visual FALSE START overlay appears
- Your team name is displayed
- Penalty may be applied based on competition settings

## Team Page Features

- **Score**: Current points displayed in header
- **Timer**: Countdown shown when active
- **Connection Status**: Shows connected/disconnected
- **Winner Animation**: Full-screen celebration when you win

## Tips

- Keep your device volume on for audio cues
- Stay on the buzzer page - don't navigate away
- A fast connection gives you the best reaction time
- In kiosk mode, the page is locked for touch-only interaction
