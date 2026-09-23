#!/usr/bin/env bash
#
# install-button.sh - compile the Add Key to Doppler button into an app you
# can bind to a Stream Deck key, a mouse button, or Spotlight.
#
# macOS only. It compiles the AppleScript source sitting next to it, on your
# machine, with Apple's own osacompile. Nothing is downloaded and no
# prebuilt binary ships with this skill.
#
# Usage:
#   ./install-button.sh                # installs to ~/Applications
#   ./install-button.sh /some/folder   # installs somewhere else
#
# Written for bash 3.2, the version macOS ships.

set -u
export LC_ALL=C

if [ "$(uname)" != "Darwin" ]; then
  echo "This button is macOS only. The one-line command in the skill works" >&2
  echo "everywhere, and it is the main path anyway." >&2
  exit 2
fi

HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/add-key-to-doppler.applescript"

VERIFY=0
if [ "${1:-}" = "--verify" ]; then VERIFY=1; shift; fi

DEST_DIR="${1:-$HOME/Applications}"
APP="$DEST_DIR/Add Key to Doppler.app"

# --verify answers "is the button I press the button I last edited?" A compiled
# app carries no version and looks identical however old it is, so the only
# honest check is to decompile it and compare. The installed copy sat two hours
# behind the source for two days without anything noticing.
if [ "$VERIFY" = "1" ]; then
  if [ ! -d "$APP" ]; then
    echo "Not installed: $APP" >&2
    exit 1
  fi
  if diff -q <(sed 's/[[:space:]]*$//' "$SRC") \
             <(osadecompile "$APP/Contents/Resources/Scripts/main.scpt" 2>/dev/null | sed 's/[[:space:]]*$//' | sed -e :a -e '/^$/{$d;N;ba' -e '}') >/dev/null 2>&1; then
    echo "up to date: the installed button matches $SRC"
    exit 0
  fi
  echo "STALE: the installed button does not match the source." >&2
  echo "Re-run this script without --verify to rebuild it." >&2
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "Cannot find the source next to this script: $SRC" >&2
  exit 2
fi

if ! command -v osacompile >/dev/null 2>&1; then
  echo "osacompile is missing. It ships with macOS, so something is unusual" >&2
  echo "about this machine." >&2
  exit 2
fi

mkdir -p "$DEST_DIR"

if [ -e "$APP" ]; then
  echo "Replacing the existing app at:"
  echo "  $APP"
  rm -rf "$APP"
fi

if ! osacompile -o "$APP" "$SRC"; then
  echo "osacompile failed. The source is plain text, so you can open it in" >&2
  echo "Script Editor and compile it by hand." >&2
  exit 1
fi

# Keep it out of the Dock and the app switcher. It is a button, not an app.
PLIST="$APP/Contents/Info.plist"
if [ -f "$PLIST" ] && [ -x /usr/libexec/PlistBuddy ]; then
  /usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$PLIST" >/dev/null 2>&1 \
    || /usr/libexec/PlistBuddy -c "Set :LSUIElement true" "$PLIST" >/dev/null 2>&1 \
    || true
fi

echo
echo "Installed:"
echo "  $APP"
echo
cat <<NOTE
Wiring it to a button

Stream Deck: drag a System > Open action onto a key and point it at the app.
Logitech Options or a similar mouse tool: assign a button to Launch Application
and pick the same app. Any launcher works, including Spotlight, since it is an
ordinary app bundle.

First press

macOS asks for permission the first time, because the script sends events to
other apps and reads the clipboard. Approve it in System Settings > Privacy &
Security > Automation. That prompt appears once.

If nothing happens at all, run the script by hand to see the error:

  osascript "$SRC"
NOTE
