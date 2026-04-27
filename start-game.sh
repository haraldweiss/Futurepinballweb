#!/bin/bash
# Future Pinball Web — Startup (POSIX shell)
# Usage: ./start-game.sh [1|2|3|auto] [port]
# Default: auto-detect — opens one window, the app spawns the rest.

set -e

SCREENS=${1:-"auto"}
PORT=${2:-5173}
BASE_URL="http://localhost:${PORT}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/.fpw-server.pid"

# ─── Validate args ───
case "$SCREENS" in
  1|2|3|auto) ;;
  *) echo "✗ Invalid screen hint: $SCREENS"; echo "  Usage: $0 [1|2|3|auto] [port]"; exit 1 ;;
esac
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "✗ Invalid port: $PORT (expected integer 1024-65535)"; exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                  Future Pinball Web — Game Startup                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ─── OS-level screen detection (informational) ───
detect_screens() {
  case "$(uname -s)" in
    Darwin)
      system_profiler SPDisplaysDataType 2>/dev/null | grep -c "Resolution:" || echo 1
      ;;
    Linux)
      xrandr 2>/dev/null | grep -c " connected" || echo 1
      ;;
    *) echo 1 ;;
  esac
}
DETECTED=$(detect_screens)
[ -z "$DETECTED" ] && DETECTED=1

if [ "$SCREENS" = "auto" ]; then
  echo "✓ Screen hint: auto (OS reports $DETECTED display(s))"
else
  echo "✓ Screen hint: $SCREENS"
fi
echo "✓ Base URL:    $BASE_URL"
echo "✓ Project:     $PROJECT_DIR"
echo ""

# ─── Port probe ───
is_port_open() { nc -z localhost "$1" 2>/dev/null; }

# ─── Start dev server if needed ───
DEV_PID=""
if ! is_port_open "$PORT"; then
  echo "🚀 Starting Vite dev server on port $PORT..."
  cd "$PROJECT_DIR"
  npm run dev > /tmp/fpw-dev.log 2>&1 &
  DEV_PID=$!
  echo "$DEV_PID" > "$PID_FILE"

  echo "⏳ Waiting for server..."
  for _ in $(seq 1 30); do
    is_port_open "$PORT" && break
    sleep 1
  done
  if ! is_port_open "$PORT"; then
    echo "✗ Server failed to start within 30s. See /tmp/fpw-dev.log"
    exit 1
  fi
  echo "✓ Dev server started (PID: $DEV_PID)"
else
  echo "✓ Dev server already running on port $PORT"
fi
echo ""

# ─── Open primary window — the app spawns child windows itself ───
open_browser() {
  case "$(uname -s)" in
    Darwin) open "$1" ;;
    Linux)
      if   command -v xdg-open  >/dev/null; then xdg-open  "$1" & disown
      elif command -v gnome-open >/dev/null; then gnome-open "$1" & disown
      elif command -v firefox    >/dev/null; then firefox    "$1" & disown
      else echo "⚠ Open manually: $1"; fi
      ;;
    MINGW*|MSYS*|CYGWIN*) start "$1" ;;
    *) echo "⚠ Open manually: $1" ;;
  esac
}

echo "🎮 Opening primary window — the app will spawn role-specific"
echo "   windows (backglass, DMD) onto extra screens automatically."
echo ""
open_browser "${BASE_URL}/?screens=${SCREENS}"

# ─── Footer ───
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ ✓ Startup complete                                                 ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║ Controls                                                           ║"
echo "║   Z / M           Left / Right Flipper                             ║"
echo "║   SPACE           Tilt        ENTER  Launch Ball                   ║"
echo "║   1 / 2 / 3 / 4   Quality presets (Low / Medium / High / Ultra)    ║"
echo "║   P               Performance monitor                              ║"
echo "║   ESC             Exit / Return to Menu                            ║"
echo "║                                                                    ║"
echo "║ Multi-screen                                                       ║"
echo "║   Grant 'Window Management' permission on first run so the app can ║"
echo "║   place backglass / DMD windows on the correct displays.           ║"
echo "║                                                                    ║"
echo "║ To stop the server                                                 ║"
echo "║   Press Ctrl+C in this terminal, or run: ./stop-game.sh            ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Stay attached so Ctrl+C tears down the dev server. If we didn't start
# it, exit immediately and leave whatever's already running alone.
if [ -n "$DEV_PID" ]; then
  cleanup() {
    rm -f "$PID_FILE"
    kill "$DEV_PID" 2>/dev/null || true
    exit 0
  }
  trap cleanup INT TERM
  echo "ℹ Press Ctrl+C to stop the dev server."
  wait "$DEV_PID"
fi
