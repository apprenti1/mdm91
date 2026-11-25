FROM node:20-alpine

# better-sqlite3 needs build tools to compile its native binding
RUN apk add --no-cache python3 make g++

# Polices pour le texte des vignettes de partage générées (/og/*.png)
RUN apk add --no-cache fontconfig font-dejavu font-noto

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data /app/src/public/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

EXPOSE 3000

CMD ["node", "server.js"]
