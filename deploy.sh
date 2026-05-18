#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/foodpark"
PM2_APP="foodpark-api"
HEALTH_URL="http://localhost:5000/health"

cd "$APP_DIR"

echo "==> [1/4] Pulling latest code..."
git pull origin main

echo "==> [2/4] Installing backend dependencies..."
cd backend && npm ci --omit=dev && cd ..

echo "==> [3/4] Reloading backend service..."
pm2 reload "$PM2_APP" --update-env
sudo nginx -t && sudo systemctl reload nginx

echo "==> [4/4] Health check..."
sleep 4
for i in 1 2 3; do
  if curl -sf "$HEALTH_URL" > /dev/null; then
    echo "Deployment successful."
    exit 0
  fi
  echo "  Attempt $i failed, retrying in 3s..."
  sleep 3
done

echo "Health check failed. Showing recent logs:"
pm2 logs "$PM2_APP" --lines 30 --nostream
exit 1
