#!/usr/bin/env python3

"""
Cart002 — Infinity Research Scraper
Takes topics from Cart001 and scrapes real research sources.
Outputs raw research into /research_stage before hashing.
Fully Termux safe.
"""

import os
import json
import requests
import time

TOPIC_FILE = "generated_topics.json"
STAGE_DIR = "research_stage"

# Make sure folder exists
os.makedirs(STAGE_DIR, exist_ok=True)

# --- Research Source Endpoints ---
SOURCES = {
    "arxiv":       "https://export.arxiv.org/api/query?search_query=all:{}&start=0&max_results=3",
    "mit_ocw":     "https://ocw.mit.edu/search/?q={}",
    "harvard_dash":"https://dash.harvard.edu/server/api/search?q={}",
    "nasa_ads":    "https://ui.adsabs.harvard.edu/v1/search/query?q={}&rows=3",
    "ibm_research":"https://research.ibm.com/search?q={}",
    "nature":      "https://www.nature.com/search?q={}"
}

def load_topics():
    with open(TOPIC_FILE, "r") as f:
        return json.load(f)

def fetch_url(url):
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "InfinityResearchBot"})
        if r.status_code == 200:
            return r.text
        return f"HTTP {r.status_code}"
    except Exception as e:
        return f"ERROR: {e}"

def scrape_topic(topic_list):
    topic_string = " ".join(topic_list)
    safe_name = "_".join(topic_list).replace("/", "_")

    print(f"\n--- Scraping Topic: {topic_string} ---")

    collected = {}

    for name, url_pattern in SOURCES.items():
        url = url_pattern.format(topic_string.replace(" ", "+"))
        print(f"[{name}] → {url}")
        data = fetch_url(url)
        collected[name] = data
        time.sleep(0.4)

    # save raw data
    output_file = os.path.join(STAGE_DIR, f"{safe_name}.json")
    with open(output_file, "w") as f:
        json.dump({"topic": topic_list, "scrape": collected}, f, indent=2)

    print(f"Saved research → {output_file}")
    return output_file

def main():
    print("∞ Cart002 — Infinity Research Scraper ∞")

    topics = load_topics()
    print(f"Loaded {len(topics)} topics.")

    for topic in topics:
        scrape_topic(topic)

    print("\nCart002 complete.")
    print(f"Research saved inside: {STAGE_DIR}/")
    print("Ready for Cart003.\n")

if __name__ == "__main__":
    main()

