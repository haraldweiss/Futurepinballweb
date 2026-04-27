#!/bin/bash
# Future Pinball Web — Stop dev server (POSIX shell)
# Usage: ./stop-game.sh [--force] [--port 5173]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$PROJECT_DIR/.fpw-server.pid"
PORT=5173
FORCE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE="-9"; shift ;;
    --port)  PORT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

stopped=0

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null | tr -d '[:space:]')"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill $FORCE "$PID" 2>/dev/null && {
      echo "✓ Stopped server (PID: $PID)"
      stopped=1
    } || true
  fi
  rm -f "$PID_FILE"
fi

if [ "$stopped" = "0" ]; then
  PORT_PID="$(lsof -t -i :"$PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  if [ -n "$PORT_PID" ]; then
    kill $FORCE "$PORT_PID" 2>/dev/null && {
      echo "✓ Stopped process on :$PORT (PID: $PORT_PID)"
      stopped=1
    } || true
  fi
fi

if [ "$stopped" = "0" ]; then
  echo "ℹ No Future Pinball dev server running."
  exit 0
fi

echo "✓ Browser windows are not closed automatically — close them manually."
