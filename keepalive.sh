#!/bin/bash
cd /home/z/my-project
while true; do
  echo "$(date): Starting Next.js server..." >> /home/z/my-project/keepalive.log
  npx next dev -p 3000 >> /home/z/my-project/keepalive.log 2>&1
  echo "$(date): Server exited, restarting in 2s..." >> /home/z/my-project/keepalive.log
  sleep 2
done
