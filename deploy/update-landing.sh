#!/bin/bash
# ============================================================
# Quick update script — Landing Page only
# Use this for redeployment after code changes
# ============================================================

set -e

APP_DIR="/opt/ghostly/landing"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="ghostly-landing"

echo "🔄 Updating landing page..."

# Sync files
sudo rsync -av --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  "$REPO_DIR/landing/" "$APP_DIR/"
sudo chown -R www-data:www-data "$APP_DIR"

# Rebuild
cd "$APP_DIR"
sudo -u www-data npm install --production=false
sudo -u www-data npm run build

# Restart service
sudo systemctl restart ${SERVICE_NAME}

echo "✅ Landing page updated and restarted!"
echo "   Check: sudo systemctl status ${SERVICE_NAME}"
