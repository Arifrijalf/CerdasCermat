# QuickBuzz v2.0 - OBS Setup Guide

## Overview

QuickBuzz provides transparent browser overlays for OBS Studio.

## Overlay Routes

| Route | Purpose |
|-------|---------|
| `/overlay/winner` | Shows current winner name |
| `/overlay/score` | Shows top 5 scoreboard |
| `/overlay/timer` | Shows countdown timer |
| `/overlay/bracket` | Shows tournament bracket |

## OBS Setup

### 1. Add Browser Source

1. In OBS, add a new **Browser Source**
2. Set URL to: `http://{server-ip}:3000/overlay/winner`
3. Set Width: 400, Height: 200
4. Check **"Shutdown source when not visible"**
5. Click OK

### 2. Configure Transparency

1. Right-click the Browser Source
2. Select **Properties**
3. Ensure Custom CSS includes:

```css
body { background-color: rgba(0, 0, 0, 0); }
```

### 3. Position and Resize

- Drag to desired position on canvas
- Resize as needed
- Overlays auto-update in real-time

## Overlay Examples

### Winner Overlay
Shows winner name with animation. Auto-clears when round resets.

### Score Overlay
Top 5 teams ranked by score. Updates in real-time.

### Timer Overlay
Large countdown timer. Turns red when under 5 seconds.

### Bracket Overlay
Shows all tournament matches and winners.

## Tips

- Use separate Browser Sources for each overlay type
- Set appropriate dimensions for each overlay
- Test with a few rounds before going live
- All overlays use transparent backgrounds automatically
