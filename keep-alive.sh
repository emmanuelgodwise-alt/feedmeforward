#!/bin/bash
while true; do
  if ! pgrep -f "server.js" > /dev/null 2>&1; then
    echo "$(date): Restarting server..." >> /tmp/keep-alive.log
    cd /home/z/my-project
    NODE_OPTIONS="--max-old-space-size=512" node --max-old-space-size=512 .next/standalone/server.js -p 3000 >> /tmp/keep-alive.log 2>&1 &
    sleep 3
  fi
  sleep 2
done
