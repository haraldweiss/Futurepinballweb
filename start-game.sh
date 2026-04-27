#!/bin/bash

# Future Pinball Web - Startup Script
# Usage: ./start-game.sh [1|2|3]
# Default: Auto-detect screens

set -e

SCREENS=${1:-"auto"}
PORT=${2:-5173}
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "✗ Invalid port: $PORT (expected integer 1024-65535)"
  exit 1
fi
BASE_URL="http://localhost:${PORT}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                  Future Pinball Web - Game Startup                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ─── Validate screen count ───
case "$SCREENS" in
  1|2|3)
    echo "✓ Screen mode: $SCREENS screen(s) (explicit)"
    ;;
  auto)
    echo "ℹ Screen mode: AUTO-DETECT on first launch"
    ;;
  *)
    echo "✗ Invalid screen count: $SCREENS"
    echo "  Usage: $0 [1|2|3|auto]"
    exit 1
    ;;
esac

echo "✓ Base URL: $BASE_URL"
echo "✓ Project: $PROJECT_DIR"
echo ""

# ─── Check if dev server is already running ───
is_port_open() {
  nc -z localhost "$1" 2>/dev/null && return 0 || return 1
}

# ─── Start dev server if needed ───
if ! is_port_open "$PORT"; then
  echo "🚀 Starting Vite dev server on port $PORT..."
  cd "$PROJECT_DIR"
  npm run dev > /tmp/fpw-dev.log 2>&1 &
  DEV_PID=$!

  # Wait for server to start
  echo "⏳ Waiting for server to start..."
  max_attempts=30
  attempt=0
  while ! is_port_open "$PORT" && [ $attempt -lt $max_attempts ]; do
    sleep 1
    attempt=$((attempt + 1))
  done

  if ! is_port_open "$PORT"; then
    echo "✗ Failed to start dev server. Check /tmp/fpw-dev.log"
    exit 1
  fi
  echo "✓ Dev server started (PID: $DEV_PID)"
else
  echo "✓ Dev server already running on port $PORT"
fi

echo ""

# ─── Open browser windows ───
open_browser() {
  local url="$1"
  local title="$2"

  case "$(uname -s)" in
    Darwin)  # macOS
      open "$url"
      ;;
    Linux)
      if command -v xdg-open &> /dev/null; then
        xdg-open "$url" &
      elif command -v gnome-open &> /dev/null; then
        gnome-open "$url" &
      elif command -v firefox &> /dev/null; then
        firefox "$url" &
      else
        echo "⚠ Could not open browser. Open manually: $url"
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)  # Windows
      start "$url"
      ;;
  esac
}

case "$SCREENS" in
  1)
    echo "🎮 Launching single-screen mode..."
    echo "   → Main playfield window opening..."
    URL="${BASE_URL}/?screens=1"
    open_browser "$URL" "Future Pinball - Main Screen"
    ;;

  2)
    echo "🎮 Launching dual-screen mode..."
    echo "   → Screen 1 (Playfield) opening..."
    echo "   → Screen 2 (Backglass) opening..."

    # Wait for browser to be ready
    sleep 2

    # Open primary window
    URL_PLAYFIELD="${BASE_URL}/?screens=2&screen=1"
    open_browser "$URL_PLAYFIELD" "Future Pinball - Screen 1 (Playfield)"

    sleep 1

    # Open backglass window
    URL_BACKGLASS="${BASE_URL}/?screens=2&screen=2"
    open_browser "$URL_BACKGLASS" "Future Pinball - Screen 2 (Backglass)"
    ;;

  3)
    echo "🎮 Launching triple-screen mode..."
    echo "   → Screen 1 (Left playfield) opening..."
    echo "   → Screen 2 (Center playfield) opening..."
    echo "   → Screen 3 (Backglass) opening..."

    # Wait for browser to be ready
    sleep 2

    # Open left screen
    URL_LEFT="${BASE_URL}/?screens=3&screen=1"
    open_browser "$URL_LEFT" "Future Pinball - Screen 1 (Left)"

    sleep 1

    # Open center screen
    URL_CENTER="${BASE_URL}/?screens=3&screen=2"
    open_browser "$URL_CENTER" "Future Pinball - Screen 2 (Center)"

    sleep 1

    # Open backglass screen
    URL_BACKGLASS="${BASE_URL}/?screens=3&screen=3"
    open_browser "$URL_BACKGLASS" "Future Pinball - Screen 3 (Backglass)"
    ;;

  auto)
    echo "🎮 Launching with auto-detect..."
    echo "   → Main window opening (screen count will auto-detect)..."
    URL="${BASE_URL}/?screens=auto"
    open_browser "$URL" "Future Pinball - Auto-Detect"
    ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║ ✓ Game startup complete!                                           ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║                                                                    ║"
echo "║ Controls:                                                          ║"
echo "║   Z / M         - Left / Right Flipper                             ║"
echo "║   SPACE         - Tilt                                             ║"
echo "║   ENTER         - Launch Ball                                      ║"
echo "║   P             - Performance Monitor                              ║"
echo "║   1, 2, 3       - Quality Presets (Low, Medium, High, Ultra)       ║"
echo "║   ESC           - Exit / Return to Menu                            ║"
echo "║                                                                    ║"
echo "║ Multi-Screen Tips:                                                 ║"
echo "║   • Use for arcade cabinet setup with multiple displays            ║"
echo "║   • Each screen runs in separate browser window                    ║"
echo "║   • Sync via BroadcastChannel API (same-origin only)               ║"
echo "║   • Full-screen each window for best cabinet experience            ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Keep script running to show logs (optional)
if [ ! -z "$DEV_PID" ]; then
  echo "ℹ Press Ctrl+C to stop the dev server..."
  wait $DEV_PID
fi
