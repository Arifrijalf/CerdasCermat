# QuickBuzz v2.0 - LAN Deployment Guide

## Network Architecture

```
[Router/Switch]
    |
    +-- [Server PC] (runs QuickBuzz)
    |     IP: 192.168.1.100
    |
    +-- [Judge Device] (browser)
    |
    +-- [Team Device A] (browser)
    +-- [Team Device B] (browser)
    +-- [Team Device C] (browser)
    +-- [Team Device D] (browser)
    |
    +-- [Display/Projector] (browser)
    +-- [OBS Computer] (browser overlay)
```

## Setup Steps

### 1. Server Setup

```bash
npm run install:all
npm run build
npm start
```

Server prints all URLs on startup including the local IP.

### 2. Find Server IP

The server auto-detects and prints the local IP. Example:
```
Local: http://192.168.1.100:3000
```

### 3. Connect Devices

All devices connect to same WiFi/LAN network:
- Judge: `http://192.168.1.100:3000/judge`
- Teams: `http://192.168.1.100:3000/team/A`
- Display: `http://192.168.1.100:3000/display`

### 4. QR Code Generation

Click QR icon on Judge Dashboard to show team QR codes.

## LAN Discovery

The server advertises itself as `quickbuzz.local` via mDNS when available.

If mDNS is not supported on your network, use the IP address directly.

## Firewall

Ensure port 3000 (or configured port) is open for TCP connections.

Windows:
```powershell
netsh advfirewall firewall add rule name="QuickBuzz" dir=in action=allow protocol=tcp localport=3000
```

## Performance

- Supports up to 20+ simultaneous team connections
- WebSocket for real-time communication
- SQLite WAL mode for concurrent reads
- Auto-reconnect on network issues

## Offline Operation

QuickBuzz works entirely on local network. No internet connection required after initial setup.
