# Nabra Discord Music Bot - Railway Deployment

## 🚂 Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/thedelusions/Nabra)

### Prerequisites
- GitHub account
- Discord bot token ([Get one here](https://discord.com/developers/applications))
- Railway account ([Sign up here](https://railway.app/))

---

## 📋 Deployment Steps

### 1. Create Railway Account
1. Go to [Railway.app](https://railway.app/)
2. Sign up with your GitHub account
3. You'll get **$5 free credit** per month

### 2. Deploy the Bot

#### Option A: Deploy from GitHub (Recommended)
1. Click the "Deploy on Railway" button above, OR:
2. Go to [Railway Dashboard](https://railway.app/dashboard)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **`thedelusions/Nabra`** repository
6. Railway will automatically detect the configuration

#### Option B: Deploy with Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

### 3. Set Up Lavalink Service

Railway needs TWO services: **Bot** + **Lavalink Server**

#### Add Lavalink Service:
1. In your Railway project, click **"+ New"**
2. Select **"Empty Service"**
3. Name it `lavalink`
4. Go to **Settings** → **Source** → **Docker Image**
5. Use image: `ghcr.io/lavalink-devs/lavalink:4.0.8`
6. In **Variables**, add:
   ```
   SERVER_PORT=2333
   LAVALINK_SERVER_PASSWORD=youshallnotpass
   ```
7. Click **Deploy**

### 4. Configure Environment Variables

In your **Bot service**, add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `TOKEN` | `YOUR_BOT_TOKEN` | Discord bot token |
| `CLIENT_ID` | `YOUR_CLIENT_ID` | Bot application ID |
| `GUILD_ID` | `YOUR_GUILD_ID` | Your Discord server ID (optional) |
| `LAVALINK_HOST` | `lavalink.railway.internal` | Lavalink internal hostname |
| `LAVALINK_PORT` | `2333` | Lavalink port |
| `LAVALINK_PASSWORD` | `youshallnotpass` | Lavalink password |

**How to add variables:**
1. Go to your bot service
2. Click **"Variables"** tab
3. Click **"+ New Variable"**
4. Add each variable from the table above

### 5. Deploy Commands to Discord

After the bot starts, you need to register slash commands:

**Option 1: Using Railway CLI**
```bash
railway run node src/deploy-commands.js
```

**Option 2: Temporary local deployment**
1. Copy your Railway environment variables to local `.env`
2. Run: `node src/deploy-commands.js --scope=guild`
3. Commands will be registered globally

### 6. Start the Bot

Once both services are running:
1. Check **Deployments** tab for any errors
2. View **Logs** to confirm bot is connected
3. Look for: `✅ Logged in as Nabra#7511`
4. Invite bot to your server and test `/play`

---

## 🔧 Configuration Files

### `railway.json`
Tells Railway how to build and deploy the bot.

### `nixpacks.toml`
Specifies Node.js 20 and Java 17 for Lavalink compatibility.

### `application.yml`
Lavalink configuration (already included in Docker image).

---

## 💰 Cost Estimate

Railway pricing (as of 2025):
- **Free tier**: $5 credit/month
- **Bot service**: ~$2-3/month
- **Lavalink service**: ~$2-3/month
- **Total**: ~$4-6/month (fits in free tier for small bots)

If you exceed $5/month, you'll need to add a payment method.

---

## 📊 Monitoring

### View Logs
```bash
# View bot logs
railway logs

# View Lavalink logs
railway logs --service lavalink
```

### Check Status
- Railway Dashboard shows CPU, Memory, Network usage
- Set up alerts for crashes or high usage

---

## 🐛 Troubleshooting

### Bot not connecting to Lavalink
- Check `LAVALINK_HOST` is set to `lavalink.railway.internal`
- Verify Lavalink service is running (green status)
- Check Lavalink logs for errors

### Commands not showing in Discord
- Run `node src/deploy-commands.js` to register commands
- Wait 1-5 minutes for Discord to update
- Try in a different server or DM the bot

### Bot keeps restarting
- Check logs for errors
- Verify all environment variables are set correctly
- Make sure you have valid Discord token

### Out of credits
- Optimize: Reduce logging, lower Lavalink memory
- Upgrade: Add payment method for $5+/month
- Alternative: Switch to VPS (DigitalOcean $4/month)

---

## 🔄 Updating the Bot

### Automatic Deployments
Railway automatically deploys when you push to GitHub:
```bash
git add .
git commit -m "Update bot"
git push origin main
```

### Manual Deployment
In Railway Dashboard:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment

---

## 📝 Important Notes

- **Keep your `.env` file private** - Never commit it to GitHub
- **Reset bot token** if it gets exposed
- **Monitor your Railway usage** to avoid unexpected charges
- **Enable 2FA** on Discord and Railway accounts for security

---

## 🆘 Support

- **Railway Docs**: https://docs.railway.app/
- **Discord.js Guide**: https://discordjs.guide/
- **Lavalink Docs**: https://lavalink.dev/

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
