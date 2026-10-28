FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.js db.js supabase.js openapi.json ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
