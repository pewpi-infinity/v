#!/usr/bin/env python3

"""
Cart007 — Infinity Scroll Renderer
Reads all research outputs and renders a real-time "Flying Scroll"
view in the terminal. This simulates Infinity OS stream mode.

It displays:
    • Topics
    • Color states
    • Hash triples
    • File paths
    • Batch numbers
    • Git push timestamps
"""

import os
import json
import time
from datetime import datetime

STAGE_DIR = "research_stage"
PAPER_DIR = "research_papers"
HASH_DIR = "hashed"
BATCH_DIR = "batch_output"


def load_manifest():
    manifest_path = os.path.join(BATCH_DIR, "batch_manifest.json")
    if not os.path.exists(manifest_path):
        return []
    with open(manifest_path, "r") as f:
        return json.load(f)


def colorize(color, text):
    COLORS = {
        "BLUE":   "\033[94m",
        "GREEN":  "\033[92m",
        "YELLOW": "\033[93m",
        "ORANGE": "\033[33m",
        "RED":    "\033[91m",
        "PINK":   "\033[95m",
        "RESET":  "\033[0m"
    }
    return f"{COLORS.get(color, COLORS['RESET'])}{text}{COLORS['RESET']}"


def render_entry(entry):
    topic = entry["topic"]
    c = entry["color"]
    h1 = entry["hash1"]
    h2 = entry["hash2"]
    h3 = entry["hash3"]
    ts = entry["timestamp"]

    print(colorize(c, f"∞ Topic: {topic}"))
    print(f"   HASH1: {h1[:24]}…")
    print(f"   HASH2: {h2[:24]}…")
    print(f"   HASH3: {h3[:24]}…")
    print(f"   COLOR: {c}")
    print(f"   TIME:  {ts}")
    print("--------------------------------------------")


def render_counter():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n∞ Infinity Scroll Update @ {now} ∞")
    print("============================================")


def main():
    while True:
        os.system("clear")
        render_counter()

        manifest = load_manifest()
        count = len(manifest)
        print(f"Loaded {count} manifest entries.\n")

        for entry in manifest:
            render_entry(entry)
            time.sleep(0.15)

        print("\n<< Scroll cycling again in 3 seconds >>")
        time.sleep(3)


if __name__ == "__main__":
    main()

