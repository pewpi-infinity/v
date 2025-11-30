#!/bin/bash
while true; do
    echo "[$(date)] Starting cart003_research_engine.py ..."
    python3 cart003_research_engine.py
    echo "[$(date)] Script stopped or crashed → restarting in 5 seconds..."
    sleep 5
done
