#!/usr/bin/env bash
# ==============================================================================
# QuickPress One-Click Server Update Script
# Updates Partner Portal (PM2), Admin Portal, Rider Portal, Website & Backend API (Docker)
# ==============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "========================================================"
echo "🚀 Updating QuickPress Production Services on EC2"
echo "========================================================"

# 0. Redis Server Setup & Auto-configuration
echo "⚡ [0/5] Verifying Redis in-memory cache server..."
if ! command -v redis-server &> /dev/null; then
    echo "  -> Installing Redis server on host..."
    sudo apt-get update -y && sudo apt-get install -y redis-server
fi
sudo systemctl enable --now redis-server 2>/dev/null || sudo service redis-server start 2>/dev/null || true

# Ensure REDIS_URL is in .env files
for ENV_FILE in "$REPO_ROOT/.env" "$REPO_ROOT/backend-python/.env"; do
    if [ -f "$ENV_FILE" ]; then
        if ! grep -q "^REDIS_URL=" "$ENV_FILE"; then
            echo "REDIS_URL=redis://127.0.0.1:6379/0" >> "$ENV_FILE"
            echo "  -> Added REDIS_URL to $ENV_FILE"
        fi
    fi
done

# 1. Partner Frontend
echo "🏬 [1/5] Building Partner Portal & restarting PM2..."
cd "$REPO_ROOT/partner-frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
NITRO_PRESET=node-server npm run build
pm2 restart quickpress-partner || (PORT=8082 pm2 start .output/server/index.mjs --name quickpress-partner && pm2 save)

# 2. Admin Frontend
echo "🛡️ [2/5] Building Admin Console & updating static files..."
cd "$REPO_ROOT/admin-frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
sudo mkdir -p /var/www/quickpress/admin
sudo rm -rf /var/www/quickpress/admin/*
if [ -d "dist" ]; then
    sudo cp -r dist/* /var/www/quickpress/admin/
elif [ -d ".output/public" ]; then
    sudo cp -r .output/public/* /var/www/quickpress/admin/
fi
sudo chown -R www-data:www-data /var/www/quickpress/admin

# 3. Rider Frontend
echo "🛵 [3/5] Building Rider Console & updating static files..."
cd "$REPO_ROOT/rider-frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
sudo mkdir -p /var/www/quickpress/rider
sudo rm -rf /var/www/quickpress/rider/*
if [ -d "dist" ]; then
    sudo cp -r dist/* /var/www/quickpress/rider/
elif [ -d ".output/public" ]; then
    sudo cp -r .output/public/* /var/www/quickpress/rider/
fi
sudo chown -R www-data:www-data /var/www/quickpress/rider

# 4. Website (withquickpress.com)
echo "🌐 [4/5] Building Website & updating static files..."
cd "$REPO_ROOT/website"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
sudo mkdir -p /var/www/quickpress/website
sudo rm -rf /var/www/quickpress/website/*
sudo cp -r dist/* /var/www/quickpress/website/
sudo chown -R www-data:www-data /var/www/quickpress/website

# 5. Docker Backend
echo "🐳 [5/5] Rebuilding & restarting Python FastAPI Backend Container..."
cd "$REPO_ROOT"
if command -v docker &> /dev/null; then
    sudo docker build -t quickpress-api .
    sudo docker stop quickpress-backend 2>/dev/null || true
    sudo docker rm quickpress-backend 2>/dev/null || true
    sudo docker run -d \
        --name quickpress-backend \
        --restart always \
        --env-file .env \
        -p 127.0.0.1:8000:8000 \
        quickpress-api
    echo "  -> Verifying backend container health..."
    sleep 3
    if sudo docker ps | grep -q "quickpress-backend"; then
        echo "✅ Backend container running healthy on port 8000."
    else
        echo "⚠️ Warning: Backend container exited. Dumping last logs:"
        sudo docker logs --tail 30 quickpress-backend || true
    fi
fi

# 6. Reload Nginx
echo "🌐 Testing & reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "========================================================"
echo "✅ QuickPress Full Platform Update Complete & Live on EC2!"
echo "========================================================"
