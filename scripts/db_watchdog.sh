#!/usr/bin/env bash
# ==============================================================================
# QuickPress DB Watchdog — Ensures PostgreSQL & Backend Stay Connected 24/7
# ==============================================================================

# 1. Ensure quickpress-net network exists
sudo docker network create quickpress-net 2>/dev/null || true

# 2. Check if quickpress-postgres is running
if ! sudo docker ps | grep -q "quickpress-postgres"; then
    echo "$(date): quickpress-postgres not running. Starting..."
    sudo docker start quickpress-postgres 2>/dev/null || true
    sudo docker network connect quickpress-net quickpress-postgres 2>/dev/null || true
fi

# 3. Check if quickpress-backend is attached to quickpress-net
if ! sudo docker network inspect quickpress-net --format='{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | grep -q "quickpress-backend"; then
    echo "$(date): quickpress-backend detached from quickpress-net. Reconnecting..."
    sudo docker network disconnect -f quickpress-net quickpress-backend 2>/dev/null || true
    sudo docker network connect quickpress-net quickpress-backend 2>/dev/null || true
    sudo docker restart quickpress-backend
fi

# 4. Check API health and ensure database engine is supabase-postgresql
DB_ENGINE=$(curl -s --max-time 4 http://127.0.0.1:8000/api/health | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
if [ "$DB_ENGINE" != "supabase-postgresql" ]; then
    echo "$(date): Backend reported database '$DB_ENGINE' instead of 'supabase-postgresql'. Healing..."
    sudo docker network disconnect -f quickpress-net quickpress-backend 2>/dev/null || true
    sudo docker network connect quickpress-net quickpress-backend 2>/dev/null || true
    sudo docker restart quickpress-backend
fi
