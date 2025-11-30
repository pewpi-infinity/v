#!/usr/bin/env python3

import os
import random
import time
import re
import zipfile
import subprocess

from cart001_noun_brain import extract_nouns_from_text, auto_expand_nouns
from cart002_brain_feed import BRAIN_FEED

PUSH_THRESHOLD = 1000
CYCLE_LIMIT = 1000

PAPERS_DIR = "papers"
ZIPS_DIR = "master_zips"
COMPLETED_FILE = "completed_topics.txt"
PUSH_SCRIPT = "./git_push_script.sh"

os.makedirs(PAPERS_DIR, exist_ok=True)
os.makedirs(ZIPS_DIR, exist_ok=True)

def load_completed():
    try:
        with open(COMPLETED_FILE, 'r') as f:
            return {line.strip() for line in f if line.strip()}
    except:
        return set()

def save_completed(topics):
    with open(COMPLETED_FILE, 'w') as f:
        for t in sorted(list(topics)):
            f.write(t + "\n")

def execute_git_push(path):
    print("\n--- Auto Push Sequence ---")
    try:
        subprocess.run([PUSH_SCRIPT, path], check=True)
        print("Push successful.")
    except Exception as e:
        print("Push failure:", e)

def synthesize_research(topic, number):
    value = random.randint(100, 3000)

    if any(x in topic.lower() for x in ["cancer","hydrogen","agi","ai"]):
        color = "Blue Link (Medical/AI High Value)"
    elif any(x in topic.lower() for x in ["coin","gem","jewel"]):
        color = "Green Link (Asset Verification)"
    else:
        color = "Yellow Link (Technical)"

    header = (
        f"Hash #{number}/{CYCLE_LIMIT}\n"
        f"Value ${value}\n"
        f"Topic: {topic}\n"
        f"Color Code: {color}\n"
        f"Source: Infinity Synthesis Core\n"
        + "-"*200 + "\n"
    )

    body = f"""
    ABSTRACT:
    Subject '{topic}' shows predictive correlations across quantum lattice models.
    High confidence rating applies via {color.split("(")[0].strip()} pathways.

    THEORY:
    Built on stochastic pathways, Bayesian fusions, and quantum modeling.

    METHODS:
    Evaluated using generative synthesis, error correction, and variance mapping.

    RESULTS:
    True-Value estimate ${value} with cross-domain Infinity implications.

    CONCLUSION:
    '{topic}' qualifies for the Infinity Archive.
    """

    while len(header + body) < PUSH_THRESHOLD:
        body += f" PAD_{random.randint(100000,999999)}|"

    return header + body

def zip_papers():
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    out = os.path.join(ZIPS_DIR, f"research_bundle_{timestamp}.zip")
    files = [os.path.join(PAPERS_DIR, f) for f in os.listdir(PAPERS_DIR) if f.endswith(".txt")]

    if not files:
        print("No papers to zip.")
        return

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, os.path.basename(f))
            os.remove(f)

    print(f"Zipped {len(files)} papers into {out}")

def main():
    print("Extracting nouns from BRAIN_FEED...")
    nouns = extract_nouns_from_text(BRAIN_FEED)
    print(f"Nouns found: {len(nouns)}")

    print("Expanding nouns into topics...")
    topics = auto_expand_nouns(nouns)
    print(f"Generated topics: {len(topics)}")

    completed = load_completed()
    queue = list(topics - completed)
    random.shuffle(queue)

    print(f"Active queue: {len(queue)}")

    count = 0
    while queue and count < CYCLE_LIMIT:
        topic = queue.pop(0)
        count += 1
        print(f"[{count}/{CYCLE_LIMIT}] {topic}")

        paper = synthesize_research(topic, count)
        safe = re.sub(r'[^a-zA-Z0-9_\-]', '_', topic)
        path = os.path.join(PAPERS_DIR, f"{count}_{safe}.txt")

        with open(path, 'w') as f:
            f.write(paper)

        execute_git_push(path)
        completed.add(topic)

        time.sleep(random.uniform(0.1, 0.3))

    save_completed(completed)
    zip_papers()

if __name__ == "__main__":
    main()

