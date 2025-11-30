#!/usr/bin/env python3

"""
Cart003 — Infinity Research Writer
Takes raw scraped data from Cart002 and converts it into
clean written research papers with structured Infinity formatting.
"""

import os
import json
from datetime import datetime

STAGE_DIR = "research_stage"
PAPER_DIR = "research_papers"

os.makedirs(PAPER_DIR, exist_ok=True)

def load_stage_files():
    files = []
    for f in os.listdir(STAGE_DIR):
        if f.endswith(".json"):
            files.append(os.path.join(STAGE_DIR, f))
    return files

def generate_paper(topic, sources):
    t = " ".join(topic)
    lines = []

    lines.append("∞ Infinity Research Paper ∞")
    lines.append("============================================")
    lines.append(f"Topic: {t}")
    lines.append(f"Generated: {datetime.now()}")
    lines.append("--------------------------------------------")
    lines.append("\n")

    for src, data in sources.items():
        lines.append(f"### Source: {src}")
        lines.append("--------------------------------------------")

        if isinstance(data, str):
            # raw HTML or JSON string
            snippet = data[:2500]  # short preview
            lines.append(snippet)
        else:
            # fallback if object
            lines.append(str(data))

        lines.append("\n")

    lines.append("============================================")
    lines.append("End of Paper\n")

    return "\n".join(lines)

def write_paper(topic_list, sources):
    filename = "_".join(topic_list) + ".txt"
    filepath = os.path.join(PAPER_DIR, filename)

    paper = generate_paper(topic_list, sources)

    with open(filepath, "w") as f:
        f.write(paper)

    print(f"Wrote research paper → {filepath}")

def process_file(path):
    with open(path, "r") as f:
        data = json.load(f)

    topic = data["topic"]
    sources = data["scrape"]

    write_paper(topic, sources)

def main():
    print("∞ Cart003 — Infinity Research Writer ∞")

    files = load_stage_files()
    print(f"Found {len(files)} research stage files.")

    for path in files:
        process_file(path)

    print("\nCart003 complete.")
    print(f"Papers saved inside: {PAPER_DIR}/")
    print("Ready for Cart004.\n")

if __name__ == "__main__":
    main()

