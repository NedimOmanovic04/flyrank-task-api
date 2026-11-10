FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.js db.js supabase.js auth.js openapi.json ./
COPY src ./src
COPY prompts ./prompts
RUN mkdir logs && chown node:node logs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
