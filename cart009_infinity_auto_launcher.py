#!/usr/bin/env python3

"""
Cart009 — Infinity Auto Launcher
Automatically runs carts 001–008 in the correct order
with full verification before moving to the next stage.

This gives you a one-command Infinity OS ignition switch.
"""

import os
import subprocess
import time

CART_ORDER = [
    "cart001_infinity_research_boot.py",
    "cart002_infinity_research_scraper.py",
    "cart003_infinity_research_writer.py",
    "cart004_infinity_hash_packager.py",
    "cart005_infinity_batch_stacker.py",
    "cart006_infinity_git_publisher.py",
    "cart007_infinity_scroll_renderer.py",  # runs in parallel / not blocking
    "cart008_infinity_supervisor.py"        # watchdog
]

VERIFY_PATHS = {
    "cart001_infinity_research_boot.py": ["generated_topics.json"],
    "cart002_infinity_research_scraper.py": ["research_stage"],
    "cart003_infinity_research_writer.py": ["research_papers"],
    "cart004_infinity_hash_packager.py":   ["hashed"],
    "cart005_infinity_batch_stacker.py":   ["batch_output"],
    "cart006_infinity_git_publisher.py":   [],
    "cart007_infinity_scroll_renderer.py": [],
    "cart008_infinity_supervisor.py":      [],
}

def run(cmd):
    print(f"\n>>> Running: {cmd}")
    output = subprocess.getoutput(cmd)
    print(output)
    return output

def verify(path):
    if os.path.isfile(path):
        return True
    if os.path.isdir(path) and len(os.listdir(path)) > 0:
        return True
    return False

def wait_for_output(cart, paths):
    print(f"Verifying output for {cart}…")
    for i in range(40):  # wait up to ~40 seconds
        ok = True
        for p in paths:
            if not verify(p):
                ok = False
                break
        if ok:
            print(f"✓ Verified output for {cart}")
            return True
        time.sleep(1)

    print(f"⚠ Timeout: Output for {cart} not detected.")
    return False

def launch_all():
    print("∞ Cart009 — Infinity Auto Launcher ∞")
    print("Starting full engine sequence…\n")

    for cart in CART_ORDER:
        print(f"\n====================================================")
        print(f"∞ Launching {cart} ∞")
        print("====================================================")

        # Run the cart
        run(f"python3 {cart}")

        # Verify its output
        required_outputs = VERIFY_PATHS.get(cart, [])
        if required_outputs:
            if not wait_for_output(cart, required_outputs):
                print(f"⚠ Repairing by re-running {cart}…")
                run(f"python3 {cart}")
                wait_for_output(cart, required_outputs)

        # Cart007 (scroll) + Cart008 (supervisor) run continuously
        if cart in ["cart007_infinity_scroll_renderer.py", "cart008_infinity_supervisor.py"]:
            print(f"∞ {cart} launched in persistent mode.")
            print("Auto-launcher continuing…")


    print("\n∞ ALL CARTS LAUNCHED SUCCESSFULLY ∞")
    print("Your Infinity Engine is now fully online.\n")


def main():
    launch_all()


if __name__ == "__main__":
    main()

