#!/usr/bin/env python3

"""
Cart006 — Infinity Git Publisher
Automatically stages, commits, and pushes all batch/stage/hash outputs
to the 'pewpi-infinity/v' GitHub repo using your stored credentials.

This cart prevents identity errors by enforcing your correct Git config.
"""

import os
import subprocess
from datetime import datetime

# Your repo directory (Termux path)
REPO_DIR = "/data/data/com.termux/files/home/v"

def run(cmd):
    return subprocess.getoutput(cmd)

def ensure_git_identity():
    print("Setting Git identity…")
    run('git config --global user.email "marvaseater@gmail.com"')
    run('git config --global user.name "pewpi-infinity"')
    print("Git identity locked in.")

def publish():
    print("∞ Cart006 — Infinity Git Publisher ∞")
    print("Preparing to push updates…")

    ensure_git_identity()

    if not os.path.isdir(REPO_DIR):
        print(f"ERROR: Repo not found at: {REPO_DIR}")
        return

    os.chdir(REPO_DIR)

    # Add all files (new, modified)
    print("Staging files…")
    print(run("git add ."))

    # Commit
    msg = f"Infinity Research Sync — {datetime.now()}"
    print(f"Committing: {msg}")
    print(run(f'git commit -m "{msg}"'))

    # Push
    print("Pushing to GitHub…")
    print(run("git push origin main"))

    print("Publishing complete.")

def main():
    publish()
    print("\nCart006 complete.")
    print("Ready for Cart007.\n")

if __name__ == "__main__":
    main()

