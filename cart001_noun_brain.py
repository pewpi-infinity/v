#!/usr/bin/env python3

import re
import random

def extract_nouns_from_text(text):
    """
    Lightweight noun extractor with zero dependencies.
    It treats any capitalized word or any long lowercase word as a noun candidate.
    Then it filters out common words.
    """
    words = re.findall(r"[A-Za-z][A-Za-z0-9_-]+", text)

    common = {
        "the","and","for","with","this","from","that","are","was","were","have","has",
        "had","but","about","into","over","under","between","within","without","their",
        "them","they","you","your","yours","our","ours","its","his","her","him","she",
        "all","any","can","could","should","would","might","must","will","just",
        "then","than","when","where","which","what","who","how","why"
    }

    nouns = set()

    for w in words:
        lw = w.lower()

        # Filter common words
        if lw in common:
            continue

        # Rules:
        # 1. Capitalized -> treat as noun
        # 2. Long technical-looking words -> noun candidate
        if w[0].isupper() or len(w) > 6:
            nouns.add(w)

    return nouns

def auto_expand_nouns(nouns):
    """
    Expand each noun to multiple research topic variants.
    """
    expanded = set()
    for noun in nouns:
        for i in range(random.randint(3, 7)):
            expanded.add(f"{noun} — Deep Technical Analysis {i+1}")
    return expanded

