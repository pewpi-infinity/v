#!/usr/bin/env python3

import os
import time
import zipfile
import subprocess
from cart001_colors import *
from cart002_sources import SCIENCE_SITES
from cart003_wordengine import expand_words
from cart004_scraper import fetch_page
from cart005_paperbuilder import build_paper

OUTPUT = "papers"
ZIPS = "master_zips"
PUSH_SCRIPT = "./git_push_script.sh"

os.makedirs(OUTPUT, exist_ok=True)
os.makedirs(ZIPS, exist_ok=True)

WORDS = [
    "hydrogen","water","sound","vapor","teg","quantum",
    "gravity","plasma","resonance","oxide","mercury"
]

def zip_if_needed():
    files = [f for f in os.listdir(OUTPUT) if f.endswith(".txt")]
    if len(files) >= 1000:
        ts = str(int(time.time()))
        zfile = os.path.join(ZIPS, f"GRAND_MASTER_{ts}.zip")
        with zipfile.ZipFile(zfile, 'w') as z:
            for f in files:
                z.write(os.path.join(OUTPUT,f), f)
                os.remove(os.path.join(OUTPUT,f))
        print(colorize(f"ZIPPED 1000 PAPERS → {zfile}", GREEN))

def push_git(path):
    try:
        subprocess.run([PUSH_SCRIPT, path], check=True)
    except:
        pass

def main():
    topics = expand_words(WORDS)
    print(colorize(f"TOTAL TOPICS: {len(topics)}", CYAN))

    for i, topic in enumerate(topics):
        print(colorize(f"[{i+1}] {topic}", YELLOW))

        scraped = []
        for site in SCIENCE_SITES:
            block = fetch_page(site)
            if block:
                scraped.append(block)

        if not scraped:
            print(colorize("No content scraped, skipping", RED))
            continue

        paper = build_paper(topic, scraped)

        safe = topic.replace(" ","_").replace("&","AND")
        path = os.path.join(OUTPUT, f"{safe}.txt")

        with open(path,"w") as f:
            f.write(paper)

        push_git(path)
        zip_if_needed()

        time.sleep(1)

if __name__ == "__main__":
    main()
