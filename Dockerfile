FROM node:22-slim

WORKDIR /app

# Install deps first so this layer caches between rebuilds
COPY package*.json ./
RUN npm ci --omit=dev

# Now copy the rest of the bot
COPY . .

ENV NODE_ENV=production

EXPOSE 8888

CMD ["node", "index.js"]
