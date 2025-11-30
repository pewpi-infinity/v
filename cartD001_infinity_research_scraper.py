#!/usr/bin/env python3

import os
import time
import random
import requests
import zipfile
from datetime import datetime

# ========== CONFIG ==========
WORDS = [
    "hydrogen","water","vapor","sound","teg","quantum","fusion","gravity","plasma",
    "helium","ionization","nanotube","signal","algorithm","entropy","resonance",
    "compressive","oxide","mercury","energy","fractal"
]

API_ENDPOINTS = {
    "semantic": "https://api.semanticscholar.org/graph/v1/paper/search",
    "arxiv": "http://export.arxiv.org/api/query"
}

OUT_DIR = "infinity_papers"
ZIP_DIR = "infinity_zips"
MASTER_LIMIT = 1000

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ZIP_DIR, exist_ok=True)

# ========== COLOR LOGIC ==========
def colorize(text, color):
    codes = {
        "blue": "\033[94m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "reset": "\033[0m"
    }
    return codes.get(color,"") + text + codes["reset"]

def classify(topic):
    t = topic.lower()
    if any(x in t for x in ["cancer","hydrogen","agi","ai","medical"]):
        return "blue"
    if any(x in t for x in ["coin","gem","jewel","asset"]):
        return "green"
    return "yellow"

# ========== RESEARCH GATHERING ==========
def semantic_search(query):
    params = {"query": query, "limit": 5, "fields": "title,url,year"}
    try:
        r = requests.get(API_ENDPOINTS["semantic"], params=params, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return [f"{p.get('title')} — {p.get('url')}" for p in data.get("data",[])]
    except:
        return []
    return []

def arxiv_search(query):
    params = {"search_query": f"all:{query}", "start":0, "max_results":5}
    try:
        r = requests.get(API_ENDPOINTS["arxiv"], params=params, timeout=10)
        return r.text.split("<entry>")[1:6]  # crude but effective
    except:
        return []

def collect_research(term):
    links = []
    links.extend(semantic_search(term))
    links.extend(arxiv_search(term))
    return links[:30]

# ========== PAPER GENERATOR ==========
def generate_paper(topic, links, count):
    color = classify(topic)
    colored_topic = colorize(topic, color)
    timestamp = datetime.utcnow().isoformat()

    header = (
        f"{colored_topic}\n"
        f"Hash #{count}/{MASTER_LIMIT}\n"
        f"Generated: {timestamp}\n"
        f"Value Estimate: ${random.randint(500,50000)}\n"
        f"Color Tier: {color.upper()}\n"
        + "-"*150 + "\n"
    )

    body = f"""
ABSTRACT:
This research paper explores the topic '{topic}', synthesizing results from
high-tier scientific repositories including Semantic Scholar and arXiv.
The inquiry focuses on establishing cross-domain relationships and 
Infinity-OS-level technical interpretations.

SECTION 1 — Conceptual Framework
The subject '{topic}' is examined using principles from quantum decision modeling,
oxide-layer microelectronics, hydrogen-doorway event physics, and generative
causality systems. The research highlights structural resonance patterns 
and feedback loops inherent to Infinity OS logic.

SECTION 2 — External Research Links
The following 10–30 research items were used as scientific anchors:
"""
    for link in links:
        body += f"• {link}\n"

    body += f"""

SECTION 3 — Infinity Interpretation
Using your oxide-based microprocessor logic and energy-free compression system,
the topic '{topic}' can be extended into full Infinity OS hardware pathways.
This includes no-energy oxide-driven computation, mercury-phase compression 
conceptualization, and Infinity-grade archival tokenization.

CONCLUSION:
The topic '{topic}' produces a high-value Infinity research node suitable 
for tokenization, archival placement, and recursive synthesis.

--- END OF REPORT ---
"""

    return header + body

# ========== SAVE / ZIP ==========
def save_paper(text, count, topic):
    safe = "".join([c if c.isalnum() else "_" for c in topic])
    path = os.path.join(OUT_DIR, f"{count}_{safe}.txt")
    with open(path,'w') as f:
        f.write(text)
    return path

def zip_if_ready(count):
    if count % MASTER_LIMIT != 0:
        return
    zip_path = os.path.join(ZIP_DIR, f"bundle_{int(time.time())}.zip")
    with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
        for f in os.listdir(OUT_DIR):
            z.write(os.path.join(OUT_DIR,f), f)
    for f in os.listdir(OUT_DIR):
        os.remove(os.path.join(OUT_DIR,f))

# ========== MAIN LOOP ==========
def main():
    count = 0

    for w in WORDS:
        terms = [w]
        # two-word combinations
        for other in WORDS:
            if other != w:
                terms.append(f"{w} & {other}")

        for term in terms:
            links = collect_research(term)
            paper = generate_paper(term, links, count)
            save_paper(paper, count, term)
            zip_if_ready(count)
            print(colorize(f"[{count}] {term}", classify(term)))
            time.sleep(1)
            count += 1

if __name__ == "__main__":
    main()

