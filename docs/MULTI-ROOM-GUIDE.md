# QuickBuzz v2.0 - Multi-Room Setup Guide

## Overview

Multi-room support allows running parallel competitions in different physical rooms, all managed from a single server instance.

## Architecture

```
[QuickBuzz Server]
    |
    +-- Room A (Teams 1-4, Judge A)
    +-- Room B (Teams 5-8, Judge B)
    +-- Room C (Teams 9-12, Judge C)
```

## Setup

### 1. Create Rooms

1. Open Judge Dashboard
2. Click **Rooms** button
3. Enter room name (e.g., "Room A - Gymnasium")
4. Select teams for this room
5. Click **Create Room**

### 2. Assign Teams

Each team can only be in one room at a time. Teams are assigned during room creation.

### 3. Switch Rooms

- Click **Switch** on any room card
- Judge dashboard controls now apply to the selected room
- Teams in other rooms continue operating independently

### 4. Monitor All Rooms

The Master Dashboard shows all rooms. Individual displays show only their room's data.

## Room Features

Each room has:
- Independent team roster
- Independent scoring
- Independent rounds
- Independent buzzer state
- Independent timer
- Independent event log

## Display Setup Per Room

Each room should have its own display:
- `http://{ip}:3000/display?room={roomId}`
- Connect projector/display to the room's URL

## Team Connections

Teams connect to the server and are automatically associated with their room based on team ID.

## Deleting Rooms

Click **Delete** on room card. Teams are released but not deleted.

## Limitations

- One active competition at a time across all rooms
- Room switching requires judge action
- Emergency controls affect all rooms globally
