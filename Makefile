.PHONY: help build up up-logs down restart logs dev dev-full clean mysql migrate migrate-fresh prune backup restore ssh-prod

help:
	@echo "Comandos disponíveis:"
	@echo "  make build         - Constrói a imagem Docker"
	@echo "  make up            - Sobe MySQL em background"
	@echo "  make up-logs       - Sobe MySQL com logs visíveis"
	@echo "  make down          - Para os containers"
	@echo "  make restart       - Reinicia os containers"
	@echo "  make logs          - Exibe os logs dos containers"
	@echo "  make dev           - Sobe MySQL e roda a API local (npm run dev)"
	@echo "  make dev-full      - Sobe tudo (MySQL + API + Frontend)"
	@echo "  make mysql         - Conecta no MySQL"
	@echo "  make migrate       - Roda as migrations"
	@echo "  make migrate-fresh - Dropa o banco e recria tudo"
	@echo "  make backup        - Faz backup do banco de dados"
	@echo "  make restore       - Restaura backup (make restore file=backup.sql)"
	@echo "  make clean         - Remove containers e imagens"
	@echo "  make prune         - Remove tudo do Docker (containers, volumes, imagens)"
	@echo "  make ssh-prod      - Conecta no servidor de produção via SSH"

build:
	docker compose build

up:
	docker compose up -d mysql

up-logs:
	docker compose up mysql

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

dev:
	docker compose up -d mysql
	@echo "Aguardando MySQL ficar pronto..."
	@until docker exec portaria-mysql mysqladmin ping -h localhost --silent 2>/dev/null; do sleep 1; done
	@echo "MySQL pronto! Iniciando API..."
	npm run dev

dev-full:
	docker compose up -d mysql
	@echo "Aguardando MySQL ficar pronto..."
	@until docker exec portaria-mysql mysqladmin ping -h localhost --silent 2>/dev/null; do sleep 1; done
	@echo "MySQL pronto! Iniciando API em background..."
	npm run dev &
	@echo "Iniciando Frontend..."
	cd ../portaria-front && npm run dev

mysql:
	docker exec -it portaria-mysql mysql -uroot -pportaria_dev_2026 portaria

migrate:
	npm run migrate

migrate-fresh:
	docker exec -i portaria-mysql mysql -uroot -pportaria_dev_2026 -e "DROP DATABASE IF EXISTS portaria; CREATE DATABASE portaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
	npm run migrate

backup:
	@echo "Fazendo backup do banco de dados..."
	docker exec portaria-mysql mysqldump -uroot -pportaria_dev_2026 portaria > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup criado com sucesso!"

restore:
	@echo "Restaurando backup..."
	@if [ -z "$(file)" ]; then \
		echo "Uso: make restore file=backup_20240101_120000.sql"; \
	else \
		docker exec -i portaria-mysql mysql -uroot -pportaria_dev_2026 portaria < $(file); \
		echo "Backup restaurado com sucesso!"; \
	fi

clean:
	docker compose down -v
	docker rmi portaria-api 2>/dev/null || true

prune:
	@echo "Removendo containers e imagens..."
	docker compose down --rmi all
	docker system prune -af
	@echo "Limpeza concluída!"

ssh-prod:
	@echo "Conectando no servidor de produção..."
	ssh root@5.78.191.14
