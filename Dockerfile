FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install sequelize-cli

FROM node:20-alpine
RUN apk add --no-cache ca-certificates git tzdata
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
RUN addgroup -S api && adduser -S api -G api \
    && chown -R api:api /app \
    && chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

USER api
CMD ["/app/docker-entrypoint.sh"]
