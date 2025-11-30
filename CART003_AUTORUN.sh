#!/bin/bash
echo "CART003 Light & Smart Edition → phone-friendly forever engine"

# Auto-install missing tools (only once)
pkg install -y screen python inotify-tools 2>/dev/null || true

# If inotifywait exists → smart instant wake-up when BRAIN_FEED changes
if command -v inotifywait >/dev/null 2>&1; then
    echo "Smart mode activated → wakes instantly when new stuff drops"
    while true; do
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Waiting for new signals in BRAIN_FEED..."
        python3 cart003_research_engine.py
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Done. Watching BRAIN_FEED for changes..."
        inotifywait -q -e modify -e create -e delete BRAIN_FEED >/dev/null 2>&1 || sleep 90
    done
else
    # Fallback for phones without inotify (most Termux) → polite 90-second sleep
    echo "Light mode → checks every 90 seconds to save your battery"
    while true; do
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] → Running research pass..."
        python3 cart003_research_engine.py
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Nothing new → sleeping 90 sec (battery saver)"
        sleep 90
    done
fi
