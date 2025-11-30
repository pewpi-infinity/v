#!/usr/bin/env python3

def expand_words(words):
    topics = []
    # Singles
    for w in words:
        topics.append(w)
    # Pairs
    for w in words:
        for k in words:
            if w != k:
                topics.append(f"{w} & {k}")
    return topics
