#!/bin/bash
# ============================================================
# Ghostly — Deploy Everything
# Runs both landing + app deployment scripts sequentially
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔═════════════════════════════════════════════════════════╗"
echo "║    🦉 Ghostly FHE — Full Deployment                   ║"
echo "║                                                         ║"
echo "║    Landing → ghostlyfhe.xyz       (port 4002)          ║"
echo "║    App     → app.ghostlyfhe.xyz   (port 4003)          ║"
echo "╚═════════════════════════════════════════════════════════╝"
echo ""

# Deploy landing page
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Landing Page"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-landing.sh"

echo ""

# Deploy main app
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Main App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-app.sh"

# Setup auto-renewal cron
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: SSL Auto-Renewal"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Add certbot renewal cron if not exists
if ! sudo crontab -l 2>/dev/null | grep -q "certbot renew"; then
  (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sudo crontab -
  echo "  ✓ SSL auto-renewal cron configured (daily at 3 AM)"
else
  echo "  → SSL auto-renewal cron already exists"
fi

echo ""
echo "╔═════════════════════════════════════════════════════════╗"
echo "║  ✅ ALL DEPLOYMENTS COMPLETE!                          ║"
echo "║                                                         ║"
echo "║  🌐 https://ghostlyfhe.xyz         (Landing)           ║"
echo "║  🌐 https://app.ghostlyfhe.xyz     (Main App)          ║"
echo "║                                                         ║"
echo "║  Useful commands:                                       ║"
echo "║  • sudo systemctl status ghostly-landing                ║"
echo "║  • sudo systemctl status ghostly-app                    ║"
echo "║  • sudo journalctl -u ghostly-landing -f                ║"
echo "║  • sudo journalctl -u ghostly-app -f                    ║"
echo "║  • sudo certbot certificates                            ║"
echo "║  • sudo nginx -t && sudo systemctl reload nginx         ║"
echo "╚═════════════════════════════════════════════════════════╝"
