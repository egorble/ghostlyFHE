#!/bin/bash
# ============================================================
# Ghostly Landing Page Deployment Script
# Domain: ghostlyfhe.xyz
# Internal port: 4002 (Vite preview)
# ============================================================

set -e

# ── Config ───────────────────────────────────────────────────
DOMAIN="ghostlyfhe.xyz"
EMAIL="egor4042007@gmail.com"
APP_PORT=4002
APP_DIR="/opt/ghostly/landing"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="ghostly-landing"

echo "═══════════════════════════════════════════════════════════"
echo "  🦉 Ghostly Landing — Deploying to $DOMAIN"
echo "═══════════════════════════════════════════════════════════"

# ── 1. System dependencies ──────────────────────────────────
echo ""
echo "► [1/7] Installing system dependencies..."
sudo apt update -qq
sudo apt install -y nginx certbot python3-certbot-nginx curl

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
  echo "  → Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
  echo "  → Installing pnpm..."
  sudo npm install -g pnpm
fi

echo "  ✓ Node $(node -v) | npm $(npm -v) | pnpm $(pnpm -v)"

# ── 2. Copy app files ───────────────────────────────────────
echo ""
echo "► [2/7] Deploying application files..."
sudo mkdir -p "$APP_DIR"
sudo rsync -av --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  "$REPO_DIR/landing/" "$APP_DIR/"
sudo chown -R www-data:www-data "$APP_DIR"

# ── 3. Build ─────────────────────────────────────────────────
echo ""
echo "► [3/7] Installing dependencies & building..."
cd "$APP_DIR"

# Clean node_modules to avoid ENOTEMPTY errors during npm install
if [ -d "$APP_DIR/node_modules" ]; then
  echo "  → Cleaning old node_modules..."
  sudo rm -rf "$APP_DIR/node_modules"
fi

# Use dedicated npm cache dir to avoid EACCES on /var/www/.npm
NPM_CACHE_DIR="/opt/ghostly/.npm-cache"
sudo mkdir -p "$NPM_CACHE_DIR"
sudo chown -R www-data:www-data "$NPM_CACHE_DIR"

sudo -u www-data npm install --production=false --cache "$NPM_CACHE_DIR"
sudo -u www-data npm run build

# ── 4. Systemd service (Vite preview on port 4002) ──────────
echo ""
echo "► [4/7] Setting up systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Ghostly Landing Page (ghostlyfhe.xyz)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}
ExecStart=$(which npx) vite preview --host 0.0.0.0 --port ${APP_PORT}
Restart=always
RestartSec=5
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}
echo "  ✓ Service ${SERVICE_NAME} started on port ${APP_PORT}"

# ── 5. Nginx config (HTTP first) ────────────────────────────
echo ""
echo "► [5/7] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/${DOMAIN} > /dev/null <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name ghostlyfhe.xyz;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "  ✓ Nginx configured for ${DOMAIN}"

# ── 6. SSL Certificate ──────────────────────────────────────
echo ""
echo "► [6/7] Obtaining SSL certificate..."
sudo certbot --nginx \
  -d ${DOMAIN} \
  --non-interactive \
  --agree-tos \
  --email ${EMAIL} \
  --redirect

echo "  ✓ SSL certificate installed"

# ── 7. Firewall ──────────────────────────────────────────────
echo ""
echo "► [7/7] Configuring firewall..."
if command -v ufw &> /dev/null; then
  sudo ufw allow 'Nginx Full'
  sudo ufw allow OpenSSH
  sudo ufw --force enable
  echo "  ✓ UFW configured"
else
  echo "  → UFW not found, skipping firewall setup"
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Landing page deployed!"
echo ""
echo "  🌐 https://${DOMAIN}"
echo "  🌐 https://www.${DOMAIN}"
echo "  🔧 Service: sudo systemctl status ${SERVICE_NAME}"
echo "  📋 Logs:    sudo journalctl -u ${SERVICE_NAME} -f"
echo "═══════════════════════════════════════════════════════════"
