#!/usr/bin/env python3

"""
Cart004 — Infinity Hash Packager
Takes written research papers and turns them into multi-layer
Infinity-style hash bundles with ZIP-coin packaging.

Output:
    /hashed/
        topic.txt
        topic.hash1
        topic.hash2
        topic.hash3
        topic.zip
"""

import os
import hashlib
import zipfile
from datetime import datetime

PAPER_DIR = "research_papers"
HASH_DIR = "hashed"

os.makedirs(HASH_DIR, exist_ok=True)

def read_file(path):
    with open(path, "r") as f:
        return f.read()

def hash_text(text, rounds=1):
    h = hashlib.sha256(text.encode())
    for _ in range(rounds - 1):
        h = hashlib.sha256(h.hexdigest().encode())
    return h.hexdigest()

def save_hash(path, content):
    with open(path, "w") as f:
        f.write(content)

def generate_zip(output_path, files):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as z:
        for real_path, arcname in files:
            z.write(real_path, arcname)

def process_paper(path):
    name = os.path.basename(path).replace(".txt", "")
    base = os.path.join(HASH_DIR, name)

    print(f"\n∞ Hashing Paper: {name} ∞")

    # Load text
    text = read_file(path)

    # Hash layers
    hash1 = hash_text(text, 1)
    hash2 = hash_text(text, 2)
    hash3 = hash_text(text, 3)

    print(f" • HASH1 = {hash1}")
    print(f" • HASH2 = {hash2}")
    print(f" • HASH3 = {hash3}")

    # Save each hash file
    h1 = f"{base}.hash1"
    h2 = f"{base}.hash2"
    h3 = f"{base}.hash3"

    save_hash(h1, hash1)
    save_hash(h2, hash2)
    save_hash(h3, hash3)

    # ZIP-coin creation
    zip_path = f"{base}.zip"
    generate_zip(zip_path, [
        (path, name + ".txt"),
        (h1, name + ".hash1"),
        (h2, name + ".hash2"),
        (h3, name + ".hash3")
    ])

    print(f"Created ZIP-coin → {zip_path}")

def main():
    print("∞ Cart004 — Infinity Hash Packager ∞")

    papers = [os.path.join(PAPER_DIR, f) for f in os.listdir(PAPER_DIR) if f.endswith(".txt")]

    print(f"Found {len(papers)} research papers.")

    for p in papers:
        process_paper(p)

    print("\nCart004 complete.")
    print(f"Hashed package output stored in: {HASH_DIR}/")
    print("Ready for Cart005.\n")

if __name__ == "__main__":
    main()

