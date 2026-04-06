#!/bin/bash
# Auto-restart script for FeedMeForward dev server
cd /home/z/my-project

while true; do
  echo "[$(date)] Starting Next.js dev server..."
  NODE_OPTIONS="--max-old-space-size=4096" node node_modules/.bin/next dev -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
