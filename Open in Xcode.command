#!/bin/bash
# Cyber Psychosis: double-click this on a Mac to get the iPhone app ready and open it in Xcode.
# It installs the project's packages, builds the game, copies it into the app, and opens Xcode.
# Double-click it again whenever the game changes. docs/MAC-SETUP.md has the whole setup.

cd "$(dirname "$0")" || exit 1
pause() {
  echo
  read -n 1 -s -r -p "Press any key to close this window."
  echo
}
stop() {
  echo
  echo "$1"
  pause
  exit 1
}

echo "Cyber Psychosis: getting the iPhone app ready"
echo

if ! command -v node >/dev/null 2>&1; then
  open "https://nodejs.org"
  stop "Node.js isn't installed yet. Download the LTS installer from nodejs.org (opening it now), run it, then double-click this file again."
fi
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  open "https://nodejs.org"
  stop "This needs Node.js 22 or later, and this Mac has $(node -v). Install the LTS version from nodejs.org (opening it now), then double-click this file again."
fi
if ! ls -d /Applications/Xcode*.app >/dev/null 2>&1; then
  open "macappstore://apps.apple.com/app/xcode/id497799835"
  stop "Xcode isn't installed yet. Install it from the Mac App Store (opening it now), open it once, then double-click this file again."
fi

echo "1 of 3: installing the project's packages (the first time takes a minute or two)"
npm install || stop "Installing the packages failed; the messages above say why."
echo
echo "2 of 3: building the game and copying it into the iPhone app"
npm run ios || stop "The build failed; the messages above say why."
echo
echo "3 of 3: opening the project in Xcode"
npm run ios:open || stop "Xcode didn't open; the messages above say why."
echo
echo "Done: Xcode is opening the project. Next, docs/MAC-SETUP.md step 6 (signing)."
pause
