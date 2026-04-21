#!/bin/bash
cd /home/z/my-project
exec node --max-old-space-size=512 .next/standalone/server.js -p 3000
