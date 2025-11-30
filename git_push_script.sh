#!/usr/bin/env bash

# Stop on error
set -e

FILEPATH="$1"

# Make sure the file exists
if [ ! -f "$FILEPATH" ]; then
    echo "ERROR: File not found: $FILEPATH"
    exit 1
fi

# Add just this file
git add "$FILEPATH"

# Commit with auto message
git commit -m "Auto Research Push: $(basename "$FILEPATH")" || true

# Push to main
git push origin main || true

