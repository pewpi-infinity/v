#!/usr/bin/env python3

import random
import datetime
from cart001_colors import BLUE, GREEN, YELLOW, CYAN, RESET, colorize

def classify(topic):
    t = topic.lower()
    if any(x in t for x in ["cancer","hydrogen","fusion","ai","quantum","oxide"]):
        return "BLUE"
    elif any(x in t for x in ["coin","gem","asset","value"]):
        return "GREEN"
    else:
        return "YELLOW"

def build_paper(topic, scraped_blocks):
    color = classify(topic)
    links = random.sample(scraped_blocks, min(30, len(scraped_blocks)))

    header = f"""
{colorize("INFINITY RESEARCH PAPER", CYAN)}
Topic: {topic}
Date: {datetime.datetime.utcnow().isoformat()} UTC
Color Code: {color}

--------------------------------------------------------------------
"""

    body = "\n".join([
        f"{colorize('SECTION '+str(i+1), CYAN)}\n{block[:800]}"
        for i, block in enumerate(links)
    ])

    citations = "\n".join([
        f"- {link[:120]}..."
        for link in links
    ])

    return header + body + "\n\nCITATIONS:\n" + citations
