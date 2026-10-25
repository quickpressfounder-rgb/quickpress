#!/usr/bin/env bash
# ==============================================================================
# QuickPress One-Click Server Update Script
# Updates Partner Portal (PM2) & Backend API (Docker)
# ==============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "========================================================"
echo "🚀 Updating QuickPress Production Services on EC2"
echo "========================================================"

# 1. Partner Frontend
echo "🏬 [1/3] Building Partner Portal & restarting PM2..."
cd "$REPO_ROOT/partner-frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
NITRO_PRESET=node-server npm run build
pm2 restart quickpress-partner || (PORT=8082 pm2 start .output/server/index.mjs --name quickpress-partner && pm2 save)

# 2. Website (withquickpress.com)
echo "🌐 [2/4] Building Website & updating static files..."
cd "$REPO_ROOT/website"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
sudo mkdir -p /var/www/quickpress/website
sudo rm -rf /var/www/quickpress/website/*
sudo cp -r dist/* /var/www/quickpress/website/
sudo chown -R www-data:www-data /var/www/quickpress/website

# 3. Docker Backend
echo "🐳 [3/4] Rebuilding & restarting Python FastAPI Backend Container..."
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
    echo "✅ Backend container running on port 8000."
fi

# 4. Reload Nginx
echo "🌐 [4/4] Testing & reloading Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "========================================================"
echo "✅ QuickPress Update Complete & Live!"
echo "========================================================"
