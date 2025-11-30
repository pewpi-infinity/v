#!/usr/bin/env python3

"""
Cart005 — Infinity Batch Stacker
Takes hashed ZIP-coins from Cart004, assigns Infinity Color States,
and stacks them into larger batch ZIPs.

COLOR LOGIC:
    BLUE   (ends with 0)
    GREEN  (ends with 1,2)
    YELLOW (ends with 3,4)
    ORANGE (ends with 5,6)
    RED    (ends with 7,8)
    PINK   (ends with 9)
"""

import os
import json
import zipfile
from datetime import datetime

HASH_DIR = "hashed"
BATCH_DIR = "batch_output"

os.makedirs(BATCH_DIR, exist_ok=True)

def detect_color(hash_value: str) -> str:
    last = hash_value[-1]
    if last == "0":
        return "BLUE"
    if last in "12":
        return "GREEN"
    if last in "34":
        return "YELLOW"
    if last in "56":
        return "ORANGE"
    if last in "78":
        return "RED"
    if last == "9":
        return "PINK"
    return "UNKNOWN"

def build_manifest(topic_name, h1, h2, h3):
    return {
        "topic": topic_name,
        "hash1": h1,
        "hash2": h2,
        "hash3": h3,
        "color": detect_color(h3),
        "timestamp": str(datetime.now())
    }

def stack_batches():
    zips = [f for f in os.listdir(HASH_DIR) if f.endswith(".zip")]

    print(f"Found {len(zips)} ZIP-coins for batching.")

    batch_number = 1
    batch_manifest = []

    for z in zips:
        topic_name = z.replace(".zip", "")
        base = os.path.join(HASH_DIR, topic_name)

        # load hashes
        with open(base + ".hash1", "r") as f:
            h1 = f.read().strip()
        with open(base + ".hash2", "r") as f:
            h2 = f.read().strip()
        with open(base + ".hash3", "r") as f:
            h3 = f.read().strip()

        entry = build_manifest(topic_name, h1, h2, h3)
        batch_manifest.append(entry)

    # Write manifest JSON
    manifest_path = os.path.join(BATCH_DIR, "batch_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(batch_manifest, f, indent=2)

    # Create batch ZIP
    batch_zip_path = os.path.join(BATCH_DIR, f"research_batch_{batch_number:04}.zip")

    with zipfile.ZipFile(batch_zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for entry in batch_manifest:
            topic = entry["topic"]
            z.write(
                os.path.join(HASH_DIR, topic + ".zip"),
                arcname=topic + ".zip"
            )
        z.write(manifest_path, arcname="batch_manifest.json")

    print(f"\n∞ Created Batch ZIP → {batch_zip_path}")
    print(f"∞ Manifest: {manifest_path}")

def main():
    print("∞ Cart005 — Infinity Batch Stacker (with COLOR LOGIC) ∞")
    stack_batches()
    print("\nCart005 complete.")
    print("Ready for Cart006.\n")

if __name__ == "__main__":
    main()

