#!/bin/bash
cd /home/z/my-project

# Kill any existing process on port 3000
if command -v fuser &>/dev/null; then
  fuser -k 3000/tcp 2>/dev/null
elif command -v lsof &>/dev/null; then
  lsof -ti:3000 | xargs kill -9 2>/dev/null
else
  # Fallback: kill by process name
  pkill -f "server.js" 2>/dev/null
fi
sleep 1

# Copy static assets for standalone build
cp -r .next/static .next/standalone/.next/static 2>/dev/null
cp -r public .next/standalone/public 2>/dev/null

exec node --max-old-space-size=512 .next/standalone/server.js -p 3000
