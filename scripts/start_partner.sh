#!/usr/bin/env bash
# ==============================================================================
# QuickPress Partner Service Startup Script (Port 8082)
# ==============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/partner-frontend"

echo "📦 [1/4] Installing Partner Frontend dependencies (if needed)..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ]; then
    npm install
fi

echo "🔨 [2/4] Building Partner Frontend (Node Server Preset)..."
NITRO_PRESET=node-server npm run build

echo "🚀 [3/4] Starting Partner App via PM2..."
pm2 delete quickpress-partner 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "⏳ [4/4] Checking Port 8082 Status..."
sleep 2
curl -I http://127.0.0.1:8082/ || {
    echo "⚠️ Port 8082 not responding. Showing PM2 logs:"
    pm2 logs quickpress-partner --lines 20 --nostream
    exit 1
}

echo ""
echo "✅ QuickPress Partner Node Server is running on port 8082!"
