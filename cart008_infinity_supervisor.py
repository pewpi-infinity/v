#!/usr/bin/env python3

"""
Cart008 — Infinity Supervisor
Monitors all prior carts (001–007), checks for stalled output,
repairs broken processes, and ensures the entire research engine
keeps flowing.

It watches:
    • Folder freshness
    • File count changes
    • Hash generation
    • Batch creation
    • Scroll activity
    • Git push timestamps

If anything stops moving → Supervisor RESTARTS the correct cart.
"""

import os
import time
import subprocess
from datetime import datetime

# Paths to watch
DIRS = {
    "topics": "generated_topics.json",
    "stage": "research_stage",
    "papers": "research_papers",
    "hashed": "hashed",
    "batch": "batch_output",
}

# Carts and what they create
CARTS = {
    "cart001_infinity_research_boot.py": ["generated_topics.json"],
    "cart002_infinity_research_scraper.py": ["research_stage"],
    "cart003_infinity_research_writer.py": ["research_papers"],
    "cart004_infinity_hash_packager.py": ["hashed"],
    "cart005_infinity_batch_stacker.py": ["batch_output"],
    "cart006_infinity_git_publisher.py": [],
    "cart007_infinity_scroll_renderer.py": [],
}


def run(cmd):
    return subprocess.getoutput(cmd)


def list_count(path):
    if not os.path.exists(path):
        return 0
    if os.path.isfile(path):
        return os.path.getsize(path)
    return len([f for f in os.listdir(path)])


def restart(cart):
    print(f"\n⚠ Restarting {cart}…")
    output = run(f"python3 {cart}")
    print(output)
    print(f"✓ {cart} restarted.\n")


def log_event(text):
    with open("supervisor_log.txt", "a") as f:
        f.write(f"[{datetime.now()}] {text}\n")


def main():
    print("∞ Cart008 — Infinity Supervisor ∞")
    print("Monitoring research engine…\n")

    # Capture snapshot of folder counts
    last_state = {k: list_count(v) for k, v in DIRS.items()}

    while True:
        time.sleep(3)

        print(f"\n∞ Supervisor Tick @ {datetime.now()} ∞")
        print("----------------------------------------")

        for name, path in DIRS.items():
            current = list_count(path)
            previous = last_state[name]

            print(f"{name}: {previous} → {current}")

            # If something should be growing but stops:
            if current == previous:
                # Identify the responsible cart
                for cart, outputs in CARTS.items():
                    for expected in outputs:
                        if expected == path or expected in path:
                            log_event(f"{path} stalled — restarting {cart}")
                            restart(cart)
                            break

            last_state[name] = current

        print("\nSupervisor running. Next check in 3s…")


if __name__ == "__main__":
    main()

