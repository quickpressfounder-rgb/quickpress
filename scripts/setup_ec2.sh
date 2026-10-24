#!/usr/bin/env bash
# ==============================================================================
# QuickPress Automated EC2 Setup & Deployment Script
# Installs: Node.js 22, Docker, Nginx, Certbot
# Builds: website, customer, partner, rider, admin frontends
# Runs: Python FastAPI backend in Docker container
# Configures: Nginx reverse proxy + static hosting
# ==============================================================================

set -e

echo "========================================================"
echo "🚀 Starting QuickPress Full-Stack EC2 Deployment"
echo "========================================================"

# 1. Update system packages
echo "📦 [1/6] Updating Ubuntu system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx docker.io

# Enable and start Docker
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

# 2. Install Node.js 22 LTS
echo "📦 [2/6] Installing Node.js 22 LTS..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Setup Swap memory (2GB) so npm builds never run out of memory on small instances
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB swap file for smooth compilation..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 3. Create destination web folders
echo "📁 [3/6] Setting up web root directories..."
sudo mkdir -p /var/www/quickpress/website
sudo mkdir -p /var/www/quickpress/customer
sudo mkdir -p /var/www/quickpress/partner
sudo mkdir -p /var/www/quickpress/rider
sudo mkdir -p /var/www/quickpress/admin

# 4. Build all 5 Frontends
REPO_ROOT="$(pwd)"
echo "🔨 [4/6] Building Frontend applications..."

# A. Website
echo "  -> Building Website..."
cd "$REPO_ROOT/website"
npm ci
npm run build
sudo rm -rf /var/www/quickpress/website/*
sudo cp -r dist/* /var/www/quickpress/website/

# B. Customer Frontend
echo "  -> Building Customer Frontend..."
cd "$REPO_ROOT/customer-frontend"
npm ci
npm run build
sudo rm -rf /var/www/quickpress/customer/*
sudo cp -r dist/* /var/www/quickpress/customer/

# C. Partner Frontend
echo "  -> Building Partner Frontend..."
cd "$REPO_ROOT/partner-frontend"
npm ci
npm run build
sudo rm -rf /var/www/quickpress/partner/*
sudo cp -r dist/* /var/www/quickpress/partner/

# D. Rider Frontend
echo "  -> Building Rider Frontend..."
cd "$REPO_ROOT/rider-frontend"
npm ci
npm run build
sudo rm -rf /var/www/quickpress/rider/*
sudo cp -r dist/* /var/www/quickpress/rider/

# E. Admin Frontend
echo "  -> Building Admin Frontend..."
cd "$REPO_ROOT/admin-frontend"
npm ci
npm run build
sudo rm -rf /var/www/quickpress/admin/*
sudo cp -r dist/* /var/www/quickpress/admin/

sudo chown -R www-data:www-data /var/www/quickpress
sudo chmod -R 755 /var/www/quickpress

# 5. Build and Run FastAPI Backend via Docker
echo "🐳 [5/6] Building and running Python FastAPI Backend..."
cd "$REPO_ROOT"

# Ensure .env exists
if [ ! -f .env ]; then
    if [ -f backend-python/.env ]; then
        cp backend-python/.env .env
    elif [ -f .env.example ]; then
        cp .env.example .env
        echo "⚠️ Created .env from .env.example. Please update credentials in .env!"
    fi
fi

# Stop existing container if running
sudo docker stop quickpress-backend 2>/dev/null || true
sudo docker rm quickpress-backend 2>/dev/null || true

# Build Docker image
sudo docker build -t quickpress-api .

# Run container on port 8000
sudo docker run -d \
    --name quickpress-backend \
    --restart always \
    --env-file .env \
    -p 127.0.0.1:8000:8000 \
    quickpress-api

# 6. Configure Nginx
echo "🌐 [6/6] Configuring Nginx..."
sudo cp "$REPO_ROOT/scripts/quickpress_nginx.conf" /etc/nginx/sites-available/quickpress.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/quickpress.conf /etc/nginx/sites-enabled/quickpress.conf

sudo nginx -t
sudo systemctl reload nginx

echo "========================================================"
echo "✅ QuickPress Full-Stack Platform Deployed Successfully!"
echo "========================================================"
echo ""
echo "FastAPI Backend is running on port 8000."
echo "Frontends are live in /var/www/quickpress/."
echo ""
echo "To activate free SSL for all domains, run:"
echo "sudo certbot --nginx -d withquickpress.com -d www.withquickpress.com -d app.withquickpress.com -d partner.withquickpress.com -d rider.withquickpress.com -d admin.withquickpress.com -d api.withquickpress.com"
