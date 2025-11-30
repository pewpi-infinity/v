#!/usr/bin/env python3
import os, json, time, random, datetime, hashlib, subprocess, re
import requests

# ------------------------------------------------------
# PATHS + SETUP
# ------------------------------------------------------
REPO_DIR = "/data/data/com.termux/files/home/z"
TOKENS_DIR = os.path.join(REPO_DIR, "infinity_tokens")
RAW_DIR    = os.path.join(REPO_DIR, "raw_research")
ZIPS_DIR   = os.path.join(REPO_DIR, "zipcoins")
COUNTER    = os.path.join(REPO_DIR, "infinity_token_counter.json")

os.makedirs(TOKENS_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(ZIPS_DIR, exist_ok=True)

# ------------------------------------------------------
# COUNTER INIT
# ------------------------------------------------------
if not os.path.exists(COUNTER):
    with open(COUNTER, "w") as f:
        json.dump({"count": 0}, f)

try:
    with open(COUNTER) as f:
        counter = json.load(f)
    if not isinstance(counter, dict) or "count" not in counter:
        counter = {"count": 0}
except:
    counter = {"count": 0}

def save_counter():
    with open(COUNTER, "w") as f:
        json.dump(counter, f)

def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def sha256(text):
    return hashlib.sha256(text.encode()).hexdigest()

def color(t,c): return f"\033[{c}m{t}\033[0m"

# ------------------------------------------------------
# SAFE REQUEST ENGINE
# ------------------------------------------------------
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "InfinityResearchBot/2.0"})
TIMEOUT = 20
BACKOFF = [1,2,4,8]

def fetch_json(url, params=None):
    for d in BACKOFF:
        try:
            r = SESSION.get(url, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.json()
        except:
            time.sleep(d)
    return None

def fetch_text(url, params=None):
    for d in BACKOFF:
        try:
            r = SESSION.get(url, params=params, timeout=TIMEOUT)
            if r.status_code == 200:
                return r.text
        except:
            time.sleep(d)
    return None

# ------------------------------------------------------
# SOURCES
# ------------------------------------------------------
def wiki(t):
    return fetch_json("https://en.wikipedia.org/api/rest_v1/page/summary/" + requests.utils.quote(t))

def wikidata(t):
    return fetch_json("https://www.wikidata.org/w/api.php", {
        "action":"wbsearchentities","search":t,"language":"en","format":"json","limit":5
    })

def arxiv(t):
    return fetch_text("http://export.arxiv.org/api/query", {
        "search_query":f"all:{t}","start":0,"max_results":10
    })

def openalex(t):
    return fetch_json("https://api.openalex.org/works", {
        "search":t,"per_page":10
    })

def crossref(t):
    return fetch_json("https://api.crossref.org/works", {
        "query":t,"rows":10
    })

# ------------------------------------------------------
# CLEANER
# ------------------------------------------------------
def clean(txt):
    if not txt: return ""
    txt = str(txt)
    txt = re.sub(r"<.*?>"," ",txt)
    txt = re.sub(r"\s+"," ",txt)
    return txt.strip()

# ------------------------------------------------------
# ARTICLE BUILDER (THE FIX)
# ------------------------------------------------------
def build_research_article(term, raw, token_number, token_value, color_state):

    out = []
    out.append(f"# ∞ Infinity Research Article — {term.capitalize()}\n")
    out.append(f"### Token #{token_number}")
    out.append(f"### Infinity Value: {token_value}")
    out.append(f"### Color State: {color_state}")
    out.append(f"### Generated: {utc()}")
    out.append("---\n")

    # SUMMARY
    out.append("## Executive Summary")
    wiki_data = raw.get("wiki")
    if wiki_data and wiki_data.get("extract"):
        out.append(clean(wiki_data["extract"]))
    else:
        out.append("No summary available.")
    out.append("\n---\n")

    # MAIN FINDINGS
    out.append("## Main Scientific Findings")

    # arXiv
    if raw.get("arxiv"):
        out.append("### arXiv Papers")
        entries = re.split(r"<entry>", raw["arxiv"])[1:]
        for e in entries[:3]:
            title = re.search(r"<title>(.*?)</title>", e, re.S)
            summ  = re.search(r"<summary>(.*?)</summary>", e, re.S)
            if title:
                out.append(f"**{clean(title.group(1))}**")
            if summ:
                out.append(clean(summ.group(1)))
            out.append("")
    # Crossref
    if raw.get("crossref") and raw["crossref"].get("message"):
        out.append("### Crossref Literature")
        for item in raw["crossref"]["message"].get("items",[])[:3]:
            if item.get("title"):
                out.append(f"**{clean(item['title'])}**")
            if item.get("container-title"):
                out.append(f"Published In: {clean(item['container-title'])}")
            yr = item.get("issued",{}).get("date-parts",[["?"]])[0][0]
            out.append(f"Year: {yr}")
            out.append("")

    # OpenAlex
    if raw.get("openalex") and raw["openalex"].get("results"):
        out.append("### OpenAlex Research")
        for w in raw["openalex"]["results"][:3]:
            if w.get("title"):
                out.append(f"**{clean(w['title'])}**")
            if w.get("concepts"):
                names = [c['display_name'] for c in w['concepts'][:3]]
                out.append(f"Concepts: {', '.join(names)}")
            out.append("")

    out.append("\n---\n")

    # INFINITY LAYER
    out.append("## Infinity Interpretation Layer")
    out.append(
        f"The topic **{term}** aligns with Infinity physics through hydrogen-electron "
        "temporal gate effects, oxide-transition resonance, lattice-field interactions, "
        "and quantum harmonic structures that match Infinity OS theory."
    )

    out.append("\n---\n## Conclusion")
    out.append("Structured scientific evidence combined with Infinity interpretation yields a high-value Infinity Token.\n")

    return "\n".join(out)

# ------------------------------------------------------
# HARVEST
# ------------------------------------------------------
def harvest(term):
    raw = {
        "wiki": wiki(term),
        "wikidata": wikidata(term),
        "arxiv": arxiv(term),
        "openalex": openalex(term),
        "crossref": crossref(term)
    }

    # raw stored
    raw_file = os.path.join(RAW_DIR, f"{term.replace(' ','_')}_{utc()}.json")
    with open(raw_file,"w") as f:
        json.dump(raw,f,indent=2)

    token_number = counter["count"]
    token_value  = random.randint(1500,3500)
    color_state  = random.choice(["BLUE","GREEN","YELLOW","PURPLE","RED"])

    article = build_research_article(term, raw, token_number, token_value, color_state)
    h = sha256(article)

    token_path = os.path.join(TOKENS_DIR, f"{h}.txt")
    with open(token_path,"w") as f: f.write(article)

    counter["count"] += 1
    save_counter()

    print(color("\n∞ NEW INFINITY RESEARCH TOKEN","96"))
    print(color(f"HASH: {h}","92"))
    print(color(f"VALUE: {token_value}","93"))
    print(color(f"COLOR: {color_state}","95"))
    print(color("---------------------------------------------------------","94"))
    print(color(article[:500]+"\n... (continues) ...","97"))
    print(color("=========================================================\n","94"))

# ------------------------------------------------------
# ZIP + PUSH
# ------------------------------------------------------
def zip_and_push():
    batch = counter["count"]//1000
    zpath = os.path.join(ZIPS_DIR, f"batch_{batch:05}.zip")
    subprocess.run(["zip","-qr",zpath,RAW_DIR])
    subprocess.run(["git","-C",REPO_DIR,"add","."],check=False)
    subprocess.run(["git","-C",REPO_DIR,"commit","-m",f"∞ Batch {batch}"],check=False)
    subprocess.run(["git","-C",REPO_DIR,"push","origin","main"],check=False)

# ------------------------------------------------------
# TERMS
# ------------------------------------------------------
TERMS = [
    "hydrogen","quantum computing","oxide materials",
    "electron structure","fusion","nanotechnology",
    "materials science","signal processing",
]

# ------------------------------------------------------
# MAIN
# ------------------------------------------------------
def main():
    print(color("\n∞ Infinity Research Article Engine — Online ∞\n","94"))
    i=0
    while True:
        term = TERMS[i % len(TERMS)]
        harvest(term)
        if counter["count"] % 1000 == 0:
            zip_and_push()
        i+=1
        time.sleep(1)

if __name__ == "__main__":
    main()
