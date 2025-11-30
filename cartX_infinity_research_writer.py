#!/usr/bin/env python3

"""
CartX — Infinity Research Writer (Unified Engine)

This single script:
    • Reads topics
    • Scrapes research (fast, safe)
    • Prints it to Termux immediately
    • Applies Infinity color logic
    • Writes a research paper directly into /v
No multi-cart chain. Everything in one shot.
"""

import os
import json
import requests
from datetime import datetime

# ===== CONFIG =====
REPO_PATH = "/data/data/com.termux/files/home/v/research_output"
os.makedirs(REPO_PATH, exist_ok=True)

TOPICS = [
    "hydrogen",
    "water",
    "electron",
    "oscillation",
    "quantum",
    "gravity",
]

# ===== COLOR LOGIC =====
def color_of(hash_value):
    last = hash_value[-1]
    if last == "0": return "BLUE"
    if last in "12": return "GREEN"
    if last in "34": return "YELLOW"
    if last in "56": return "ORANGE"
    if last in "78": return "RED"
    if last == "9": return "PINK"
    return "UNKNOWN"

# ===== HASH =====
import hashlib
def make_hash(text):
    return hashlib.sha256(text.encode()).hexdigest()

# ===== SCRAPER =====
BASE_SOURCES = [
    "https://export.arxiv.org/api/query?search_query=all:{}&start=0&max_results=1",
    "https://core.ac.uk/search?q={}",
    "https://ar5iv.org/search/?query={}"
]

def scrape(topic):
    collected = []
    for u in BASE_SOURCES:
        url = u.format(topic.replace(" ", "+"))
        try:
            r = requests.get(url, timeout=4)
            collected.append((url, r.text[:1500]))
        except Exception as e:
            collected.append((url, f"ERROR: {e}"))
    return collected

# ===== MAIN =====
def main():
    print("∞ Infinity Research Writer (CartX) ∞")
    print("====================================\n")

    for topic in TOPICS:
        print(f"\n--- Topic: {topic} ---")

        # scrape
        data = scrape(topic)

        # assemble all text
        combined = "\n\n".join([d[1] for d in data])

        # hash + color
        h = make_hash(combined)
        c = color_of(h)

        print(f"COLOR = {c}")
        print(f"HASH  = {h[:24]}…")

        # build paper
        paper_lines = []
        paper_lines.append("∞ Infinity Research Paper ∞")
        paper_lines.append(f"Topic: {topic}")
        paper_lines.append(f"Generated: {datetime.now()}")
        paper_lines.append(f"Color: {c}")
        paper_lines.append(f"Hash: {h}")
        paper_lines.append("-----------------------------------------")
        paper_lines.append("Sources:\n")

        for url, snippet in data:
            paper_lines.append(f"[{url}]")
            paper_lines.append(snippet)
            paper_lines.append("\n")

        paper = "\n".join(paper_lines)

        # write to repo
        filename = f"{topic}_infinity.txt"
        filepath = os.path.join(REPO_PATH, filename)
        with open(filepath, "w") as f:
            f.write(paper)

        print(f"Saved → {filepath}")

    print("\n∞ CartX complete. Everything written to your repo. ∞")

if __name__ == "__main__":
    main()

