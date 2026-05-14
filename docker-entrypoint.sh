#!/bin/sh
set -e

# Read Docker Swarm secrets into environment variables
for secret in portaria_db_password portaria_db_root_password portaria_jwt_secret portaria_encryption_key portaria_metrics_token portaria_twilio_auth_token portaria_openai_api_key portaria_elevenlabs_api_key; do
  if [ -f "/run/secrets/$secret" ]; then
    case "$secret" in
      portaria_db_password)        export DB_PASSWORD=$(cat /run/secrets/$secret) ;;
      portaria_jwt_secret)         export JWT_SECRET=$(cat /run/secrets/$secret) ;;
      portaria_encryption_key)     export ENCRYPTION_KEY=$(cat /run/secrets/$secret) ;;
      portaria_metrics_token)      export METRICS_TOKEN=$(cat /run/secrets/$secret) ;;
      portaria_twilio_auth_token)  export TWILIO_AUTH_TOKEN=$(cat /run/secrets/$secret) ;;
      portaria_openai_api_key)     export OPENAI_API_KEY=$(cat /run/secrets/$secret) ;;
      portaria_elevenlabs_api_key) export ELEVENLABS_API_KEY=$(cat /run/secrets/$secret) ;;
    esac
  fi
done

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
MAX_RETRIES=30
RETRY_COUNT=0
until node -e "
  const mysql = require('mysql2/promise');
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }).then(conn => { conn.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "MySQL not reachable after $MAX_RETRIES attempts, starting anyway..."
    break
  fi
  echo "MySQL not ready (attempt $RETRY_COUNT/$MAX_RETRIES), retrying in 2s..."
  sleep 2
done

echo "Running database migrations..."
npx sequelize-cli db:migrate || echo "Migration failed or already up to date"

echo "Starting server..."
exec node src/server.js
