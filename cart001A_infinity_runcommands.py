#!/usr/bin/env python3

"""
Cart001A — Infinity Runcommands
Automatically finds every cart in the folder and runs them
one after another, staggered, clean, backgrounded.
"""

import os
import time
import subprocess

def is_cart(filename):
    return (
        filename.startswith("cart")
        and filename.endswith(".py")
        and filename not in ["cart001A_infinity_runcommands.py"]
    )

def main():
    print("∞ Infinity Runcommands Engine ∞")
    print("=================================\n")

    carts = [f for f in os.listdir(".") if is_cart(f)]
    carts.sort()

    print(f"Found {len(carts)} carts to run.\n")

    for cart in carts:
        print(f"Starting {cart}")
        subprocess.Popen(["python3", cart])
        time.sleep(0.15)  # staggering window

    print("\n∞ All carts launched. Engine running. ∞")


if __name__ == "__main__":
    main()

