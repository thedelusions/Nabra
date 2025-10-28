# Railway Setup Checklist

## ⚠️ If Bot Crashes with No Logs

The bot needs **environment variables** to run! Here's what to check:

### 1. ✅ Bot Service Environment Variables

Go to your **bot service** in Railway → **Variables** tab and add:

```env
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id
LAVALINK_HOST=lavalink.railway.internal
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
```

**How to get these:**
- `TOKEN`: [Discord Developer Portal](https://discord.com/developers/applications) → Your Bot → Bot → Reset Token
- `CLIENT_ID`: Discord Developer Portal → Your Bot → General Information → Application ID
- `GUILD_ID`: (Optional) Your Discord server ID for testing

### 2. ✅ Lavalink Service Running

You need a **separate Lavalink service**:

1. Click **"+ New"** in your Railway project
2. Select **"Empty Service"**
3. Name it `lavalink`
4. Go to **Settings** → **Deploy** → **Source**
5. Choose **"Docker Image"**
6. Enter: `ghcr.io/lavalink-devs/lavalink:4.0.8`
7. Add **Environment Variables**:
   ```env
   SERVER_PORT=2333
   LAVALINK_SERVER_PASSWORD=youshallnotpass
   ```
8. Click **"Deploy"**

### 3. ✅ Check Deployment Logs

**Bot Service Logs:**
- Go to **Deployments** tab
- Click on latest deployment
- View **Deploy Logs** and **Runtime Logs**

**Common Errors:**
- `❌ Environment validation failed` = Missing environment variables
- `Cannot find package` = Build error (already fixed)
- `Lavalink Manager not initialized` = Lavalink service not running

**Lavalink Service Logs:**
- Should show: `Lavalink is ready to accept connections`
- If not, redeploy the Lavalink service

### 4. ✅ Register Slash Commands

Once both services are running, register commands:

**Option 1: Railway CLI**
```bash
npm i -g @railway/cli
railway login
railway link
railway run node src/deploy-commands.js
```

**Option 2: Run Locally**
```bash
# Copy environment variables from Railway to .env
node src/deploy-commands.js
```

### 5. ✅ Test the Bot

1. Invite bot to your server
2. Type `/play` - you should see the command
3. Join a voice channel
4. Use `/play https://www.youtube.com/watch?v=...`
5. Music should play! 🎵

---

## 🔍 Debugging

### Check if Services are Running
- Railway Dashboard → Your Project
- Both **bot** and **lavalink** should show green "Active" status

### View Real-Time Logs
```bash
railway logs --service nabra-lavalink  # Bot logs
railway logs --service lavalink         # Lavalink logs
```

### Common Issues

**Bot keeps restarting:**
- Missing TOKEN environment variable
- Invalid Discord token (reset it)
- Lavalink not accessible

**Music not playing:**
- Lavalink service not running
- LAVALINK_HOST not set to `lavalink.railway.internal`
- Firewall blocking port 2333

**Commands not showing:**
- Need to register with `/deploy-commands.js`
- Wait 1-5 minutes for Discord to update
- Try in different server or DM

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOKEN` | ✅ Yes | - | Discord bot token |
| `CLIENT_ID` | ✅ Yes | - | Bot application ID |
| `GUILD_ID` | ❌ No | - | Guild ID for testing |
| `LAVALINK_HOST` | ✅ Yes | localhost | Lavalink hostname (use `lavalink.railway.internal`) |
| `LAVALINK_PORT` | ❌ No | 2333 | Lavalink port |
| `LAVALINK_PASSWORD` | ❌ No | youshallnotpass | Lavalink password |
| `LOG_LEVEL` | ❌ No | info | Logging level (error/warn/info/debug) |

---

## 🆘 Still Not Working?

1. **Check Railway logs** - Look for specific error messages
2. **Verify environment variables** - Make sure all required vars are set
3. **Restart services** - Redeploy both bot and Lavalink
4. **Check Discord token** - Make sure it's valid and not expired
5. **Check bot permissions** - Bot needs proper Discord permissions

**Need more help?** Check the [main README](./README.md) or [Railway docs](https://docs.railway.app/)
