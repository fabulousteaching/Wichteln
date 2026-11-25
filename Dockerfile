FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_PATH=/data/wichtel.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

# Datenbank liegt in /data – dieses Verzeichnis als Volume einbinden!
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1
CMD ["npm", "start"]
