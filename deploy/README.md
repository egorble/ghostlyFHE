# Ghostly Deployment

## Architecture

```
ghostlyfhe.xyz       → Nginx (443/SSL) → localhost:4002 (Landing)
app.ghostlyfhe.xyz   → Nginx (443/SSL) → localhost:4003 (Main App)
```

## Prerequisites

- Ubuntu/Debian VPS with root access
- Domain DNS configured:
  - `ghostlyfhe.xyz` → your server IP
  - `app.ghostlyfhe.xyz` → your server IP
  - `www.ghostlyfhe.xyz` → your server IP
- Ports 80 and 443 open

## Quick Start

### Deploy everything at once
```bash
chmod +x deploy/*.sh
sudo bash deploy/deploy-all.sh
```

### Deploy individually
```bash
# Landing page only
sudo bash deploy/deploy-landing.sh

# Main app only
sudo bash deploy/deploy-app.sh
```

### Update after code changes
```bash
# Update landing
sudo bash deploy/update-landing.sh

# Update main app
sudo bash deploy/update-app.sh
```

## What the scripts do

1. **Install dependencies** — Node.js 20, Nginx, Certbot
2. **Copy & build** — rsync files to `/opt/ghostly/`, npm install, npm build
3. **Systemd service** — `vite preview` on non-standard ports (4002/4003)
4. **Nginx reverse proxy** — Routes domain traffic to internal ports
5. **SSL via Let's Encrypt** — Auto-configured with certbot, auto-renewal cron
6. **Firewall (UFW)** — Opens only necessary ports

## Services

| Service | Domain | Port | Systemd |
|---------|--------|------|---------|
| Landing | ghostlyfhe.xyz | 4002 | `ghostly-landing` |
| Main App | app.ghostlyfhe.xyz | 4003 | `ghostly-app` |

## Useful Commands

```bash
# Status
sudo systemctl status ghostly-landing
sudo systemctl status ghostly-app

# Logs
sudo journalctl -u ghostly-landing -f
sudo journalctl -u ghostly-app -f

# Restart
sudo systemctl restart ghostly-landing
sudo systemctl restart ghostly-app

# SSL certificates
sudo certbot certificates
sudo certbot renew --dry-run

# Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## FHE-Specific Notes

The main app (`app.ghostlyfhe.xyz`) includes `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers in the Nginx config. These are **required** for `SharedArrayBuffer` which is used by the FHE (TFHE) library.
