#!/usr/bin/env python3

import requests
import re

def fetch_page(url):
    try:
        r = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0"
        })
        if r.status_code == 200:
            text = re.sub(r"<[^>]+>", " ", r.text)
            return text
        return ""
    except:
        return ""
