#!/bin/bash
# Cyber Psychosis: double-click this on a Mac to play the game in your browser, for trying out
# playfield art. Drag a picture onto the game to use it as the playfield (art/README.md).
# Close this window to stop.

cd "$(dirname "$0")" || exit 1
stop() {
  echo
  echo "$1"
  echo
  read -n 1 -s -r -p "Press any key to close this window."
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  open "https://nodejs.org"
  stop "Node.js isn't installed yet. Download the LTS installer from nodejs.org (opening it now), run it, then double-click this file again."
fi
if [ ! -d node_modules ]; then
  echo "Installing the project's packages (the first time takes a minute or two)"
  npm install || stop "Installing the packages failed; the messages above say why."
fi

echo
echo "Starting the game. Your browser opens it in a moment."
echo "Drag a picture onto the game to try it as the playfield."
echo "The Network address below also works on a phone on the same Wi-Fi."
echo "Close this window to stop."
echo
npm run dev -- --open
