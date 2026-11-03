#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if curl --silent --fail --max-time 2 http://127.0.0.1:5173/ >/dev/null; then
  open http://127.0.0.1:5173/
  exit 0
fi
if ! command -v npm >/dev/null; then
  echo 'Node.js is required to run DemoTake locally. Install Node.js, then open this file again.'
  read '?Press Return to close.'
  exit 1
fi
echo 'Starting DemoTake. Keep this Terminal window open while using the website.'
npm run dev -- --port 5173 --strictPort --open
