#!/bin/bash
# ============================================================
# Quick update script — Main App only
# Use this for redeployment after code changes
# ============================================================

set -e

APP_DIR="/opt/ghostly/frontend"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="ghostly-app"

echo "🔄 Updating main app..."

# Sync files
sudo rsync -av --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  "$REPO_DIR/frontend/" "$APP_DIR/"
sudo chown -R www-data:www-data "$APP_DIR"

# Rebuild
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

sudo -u www-data npm install --legacy-peer-deps --cache "$NPM_CACHE_DIR"
sudo -u www-data npm run build

# Restart service
sudo systemctl restart ${SERVICE_NAME}

echo "✅ Main app updated and restarted!"
echo "   Check: sudo systemctl status ${SERVICE_NAME}"
