#!/bin/bash

set -e

echo "🚀 Deploy em produção"

# 1. Atualizar código
echo "📥 Git pull..."
git pull origin main

# 2. Rebuild da imagem (sem cache)
echo "🔨 Build da imagem..."
docker build --no-cache --pull -t portaria-api:latest .

# 3. Forçar atualização do serviço (todas as réplicas)
echo "⚡ Atualizando serviço..."
docker service update --force --detach=false --image portaria-api:latest portaria-api_portaria-api

echo ""
echo "✅ Deploy iniciado!"
echo "📝 Acompanhe: docker service logs -f portaria-api_portaria-api"
