# Nabra Discord Music Bot

> A modern, scalable Discord music bot with Lavalink and multi-source support

![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![License](https://img.shields.io/badge/license-MIT-green)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/thedelusions/Nabra)

## ✨ Features

- 🎵 **Multi-Source Support**: YouTube, Spotify, Apple Music, SoundCloud
- 🚀 **Dual Playback Engine**: Lavalink for primary streaming, play-dl for fallback
- 🎮 **Interactive Controls**: Button-based music controls with /controls command
- 📜 **Advanced Queue Management**: Repeat modes, shuffle, jump to track, pagination
- 🔴 **Live Updates**: Auto-updating now playing display with /live command
- 🏠 **24/7 Mode**: Keep bot in voice channel even when queue ends
- ⏱️ **Seek Controls**: Forward/backward seeking in tracks
- 🎨 **Rich Embeds**: Beautiful modern Discord Blurple theme
- 📝 **Comprehensive Logging**: Winston-based logging with file rotation
- 🔄 **Auto-Reconnect**: Automatic reconnection and error recovery
- 🌐 **Production Ready**: Deployable on Railway, Heroku, or VPS

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **Lavalink Server** (standalone or Docker)
- **Discord Bot Token** ([Create one here](https://discord.com/developers/applications))

## 🚂 Deploy to Railway (Recommended)

**Quick deploy with one click!** See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed instructions.

1. Click the "Deploy on Railway" button above
2. Set up environment variables (bot token, etc.)
3. Add Lavalink service (included in guide)
4. Deploy and enjoy! 🎵

## 🚀 Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd please-work
npm install
```

### 2. Setup Lavalink Server

#### Option A: Docker (Recommended)

```bash
docker run -d \
  --name lavalink \
  -p 2333:2333 \
  -v $(pwd)/application.yml:/opt/Lavalink/application.yml \
  ghcr.io/lavalink-devs/lavalink:latest
```

#### Option B: Standalone Java

Download from [Lavalink Releases](https://github.com/lavalink-devs/Lavalink/releases) and create `application.yml`:

```yaml
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
    bufferDurationMs: 400
    frameBufferDurationMs: 5000
    youtubePlaylistLoadLimit: 6
    playerUpdateInterval: 5
    youtubeSearchEnabled: true
    soundcloudSearchEnabled: true
    gc-warnings: true

plugins:
  - dependency: "dev.lavalink.youtube:youtube-plugin:1.0.0"
    repository: "https://maven.lavalink.dev/releases"
```

Run Lavalink:
```bash
java -jar Lavalink.jar
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_test_guild_id_here

LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass

LOG_LEVEL=info
```

### 4. Deploy Commands

**For testing (guild-specific, instant):**
```bash
npm run deploy:guild
```

**For production (global, takes ~1 hour):**
```bash
npm run deploy:global
```

### 5. Start the Bot

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `/help` | Display help and all commands |
| `/play <query>` | Play a song or add to queue |
| `/pause` | Pause the current track |
| `/resume` | Resume playback |
| `/skip` | Skip to next track |
| `/previous` | Play previous track |
| `/queue` | Display current queue |
| `/clear` | Clear the queue |
| `/shuffle` | Shuffle the queue |
| `/repeat <mode>` | Set repeat mode (off/track/queue) |
| `/forward <seconds>` | Skip forward in track |
| `/backward <seconds>` | Skip backward in track |

## 🎵 Supported Sources

- **YouTube** - Direct links and search
- **Spotify** - Tracks, albums, playlists (via Lavalink)
- **SoundCloud** - Tracks and playlists
- **Deezer** - Tracks, albums, playlists
- **Anghami** - Metadata extraction → YouTube lookup

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Discord Bot (Nabra)             │
├─────────────────────────────────────────┤
│  ┌───────────┐        ┌──────────────┐ │
│  │ Commands  │◄──────►│ Queue Manager│ │
│  └───────────┘        └──────────────┘ │
│         │                      │        │
│         ▼                      ▼        │
│  ┌─────────────────────────────────┐   │
│  │      Player Manager             │   │
│  │  ┌─────────┐    ┌─────────────┐│   │
│  │  │Lavalink │    │  play-dl    ││   │
│  │  │(Primary)│    │ (Fallback)  ││   │
│  │  └─────────┘    └─────────────┘│   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
           │                │
           ▼                ▼
    ┌──────────┐    ┌─────────────┐
    │ Lavalink │    │Direct Streams│
    │  Server  │    │(YouTube, etc)│
    └──────────┘    └─────────────┘
```

## 📁 Project Structure

```
Nabra/
├── src/
│   ├── commands/          # Slash commands
│   │   ├── music/         # Music-related commands
│   │   └── help.js
│   ├── core/              # Core systems
│   │   ├── lavalinkClient.js
│   │   ├── player.js
│   │   ├── queueManager.js
│   │   └── registry.js
│   ├── events/            # Discord events
│   ├── utils/             # Utilities
│   │   ├── embeds.js
│   │   ├── search.js
│   │   ├── anghami.js
│   │   ├── config.js
│   │   └── logger.js
│   ├── index.js           # Main entry point
│   └── deploy-commands.js
├── logs/                  # Log files (auto-created)
├── config.json            # Bot configuration
├── .env                   # Environment variables
├── package.json
└── README.md
```

## 🚢 Deployment

### Render.com

1. Create new **Web Service**
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from `.env`
6. Deploy!

### Heroku

```bash
heroku create nabra-music-bot
heroku config:set TOKEN=your_token
heroku config:set CLIENT_ID=your_client_id
# ... set other env vars
git push heroku main
```

### VPS (Ubuntu/Debian)

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd please-work
npm install

# Setup PM2
npm install -g pm2
pm2 start src/index.js --name nabra
pm2 startup
pm2 save
```

## 🔧 Configuration

### Multiple Lavalink Nodes

Add to `.env`:
```env
LAVALINK_NODES=node1:localhost:2333:pass1,node2:example.com:2333:pass2
```

### Custom Settings

Edit `config.json`:
```json
{
  "embedColor": "#FF6B6B",
  "maxQueueSize": 100,
  "maxSongDuration": 7200,
  "defaultVolume": 100,
  "disconnectTimeout": 300000
}
```

## 🐛 Troubleshooting

### Bot doesn't respond to commands
- Ensure commands are deployed: `npm run deploy:guild`
- Check bot has necessary permissions in Discord server
- Verify bot is online and Lavalink is connected (check logs)

### Lavalink connection fails
- Verify Lavalink server is running: `curl http://localhost:2333`
- Check `LAVALINK_HOST`, `LAVALINK_PORT`, and `LAVALINK_PASSWORD` in `.env`
- Review Lavalink logs for errors

### No audio playing
- Bot uses play-dl fallback if Lavalink unavailable
- Check bot has "Connect" and "Speak" permissions in voice channel
- Ensure voice channel isn't full or user-limited

### Anghami links not working
- Bot extracts metadata and searches YouTube
- Check logs for extraction errors
- Some Anghami pages may have different HTML structure

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Support Server](#) (optional)

## 🙏 Acknowledgments

- [discord.js](https://discord.js.org/) - Discord API library
- [Lavalink](https://github.com/lavalink-devs/Lavalink) - Audio streaming node
- [play-dl](https://github.com/play-dl/play-dl) - Audio extraction library
- [Winston](https://github.com/winstonjs/winston) - Logging library

---

Made with ❤️ for the Discord music community
