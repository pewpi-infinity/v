#!/usr/bin/env python3

"""
Cart∞ — Infinity Night Runner
The version you leave on while you sleep.

It runs FOREVER:
    • Scrapes topics
    • Writes research
    • Applies color logic
    • Prints live scroll
    • Saves to /v
    • Never stops until YOU stop it
"""

import os
import json
import time
import requests
import hashlib
from datetime import datetime

# Repo output directory
OUT = "/data/data/com.termux/files/home/v/nightstream"
os.makedirs(OUT, exist_ok=True)

# Topics to cycle forever
TOPICS = [
    "hydrogen", "water", "electron", "oscillation",
    "quantum", "gravity", "energy", "field", "portal"
]

# Color rules
def color_of(h):
    last = h[-1]
    if last == "0": return "BLUE"
    if last in "12": return "GREEN"
    if last in "34": return "YELLOW"
    if last in "56": return "ORANGE"
    if last in "78": return "RED"
    if last == "9": return "PINK"
    return "UNKNOWN"

# Simple scraper (fast + safe + stable)
SOURCES = [
    "https://export.arxiv.org/api/query?search_query=all:{}&start=0&max_results=1",
    "https://core.ac.uk/search?q={}",
    "https://ar5iv.org/search/?query={}"
]

def scrape(topic):
    collected = []
    for u in SOURCES:
        url = u.format(topic)
        try:
            r = requests.get(url, timeout=4)
            collected.append((url, r.text[:1200]))
        except Exception as e:
            collected.append((url, f"ERROR: {e}"))
    return collected

# Hash
def make_hash(text):
    return hashlib.sha256(text.encode()).hexdigest()

def main():
    print("∞ Night Runner Online — Running Until You Stop It ∞")
    print("=====================================================\n")

    cycle = 1

    while True:
        print(f"\n∞ Cycle {cycle} @ {datetime.now()} ∞")
        print("------------------------------------------------------")

        for topic in TOPICS:
            print(f"\n--- {topic.upper()} ---")

            data = scrape(topic)
            combined = "\n\n".join([d[1] for d in data])

            h = make_hash(combined)
            c = color_of(h)

            print(f"Color = {c}")
            print(f"Hash  = {h[:28]}…")
            print("Sources:")
            for url, snip in data:
                print(f"  → {url}")

            # Write to output file
            filename = f"{topic}_{cycle}.txt"
            path = os.path.join(OUT, filename)

            with open(path, "w") as f:
                f.write(f"∞ Infinity Cycle: {cycle}\n")
                f.write(f"Topic: {topic}\n")
                f.write(f"Color: {c}\n")
                f.write(f"Hash: {h}\n")
                f.write(f"Time: {datetime.now()}\n\n")
                for url, snip in data:
                    f.write(url + "\n")
                    f.write(snip + "\n\n")

            print(f"Saved → {path}")

        # Sleep a tiny moment between cycles
        time.sleep(2)
        cycle += 1


if __name__ == "__main__":
    main()

