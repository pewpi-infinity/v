#!/usr/bin/env python3

"""
Cart001 — Infinity Research Bootloader
Loads BRAIN_FEED nouns, expands them into search topics,
hands them off to downstream carts via queue files.
This version fixes the EOF cutoff and broken expansion logic.
"""

import os
import json
import itertools

BRAIN_FEED = """
hydrogen
water
vapor
quantum
portal
energy
oscillation
electron
field
time
frequency
harmonic
gravity
fusion
"""

# Where all carts pass work to each other
QUEUE_FILE = "active_queue.json"
TOPIC_FILE = "generated_topics.json"

def extract_nouns(text):
    nouns = [w.strip() for w in text.split() if w.strip()]
    return nouns

def expand_topics(words):
    topics = []

    # 1-word topics
    for w in words:
        topics.append([w])

    # 2-word combinations
    for combo in itertools.combinations(words, 2):
        topics.append(list(combo))

    # 3-word combinations
    for combo in itertools.combinations(words, 3):
        topics.append(list(combo))

    return topics

def save_topics(topics):
    with open(TOPIC_FILE, "w") as f:
        json.dump(topics, f, indent=2)

    # create initial queue for downstream carts
    with open(QUEUE_FILE, "w") as f:
        json.dump({"queue": topics}, f, indent=2)

def main():
    print("∞ Cart001 — Infinity Research Bootloader ∞")
    print("Extracting nouns from BRAIN_FEED...")

    nouns = extract_nouns(BRAIN_FEED)
    print(f"Nouns found: {len(nouns)}")
    print(nouns)

    print("Expanding nouns into topics...")
    topics = expand_topics(nouns)
    print(f"Generated topics: {len(topics)}")

    save_topics(topics)

    print("\nCart001 complete.")
    print(f"Saved → {TOPIC_FILE} and {QUEUE_FILE}")
    print("Ready for Cart002.\n")

if __name__ == "__main__":
    main()

