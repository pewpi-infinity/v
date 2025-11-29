#!/usr/bin/env python3
# Infinity Streamer v2 — zip coins (4 artifacts), grand master after 10 masters, loud logs, push-only grand master

import os, sys, json, re, hashlib, zipfile, subprocess, random
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

# ---------------- Config ----------------
INFINITY_TOKENS_DIR = "infinity_tokens"
TOKENS_PER_MASTER = 10              # tokens per master (zip coin)
MASTERS_PER_GRAND = 10              # masters per grand master
MIN_SOURCES_PER_TOKEN = 10
MAX_SOURCES_PER_TOKEN = 30
SNIPPET_MAX_CHARS = 600
HTTP_WORKERS = 8
REQUEST_TIMEOUT = 12
GIT_REMOTE = "origin"
GIT_BRANCH = "HEAD"
GIT_COMMIT_MSG_PREFIX = "[Infinity Grand Master]"

# ---------------- Sources ----------------
DEFAULT_SOURCES = [
    "https://www.wikipedia.org/", "https://www.britannica.com/", "https://www.nature.com/",
    "https://www.sciencedirect.com/", "https://www.theguardian.com/", "https://www.reuters.com/",
    "https://www.bloomberg.com/", "https://www.nytimes.com/", "https://arxiv.org/",
    "https://www.ncbi.nlm.nih.gov/", "https://www.ieee.org/", "https://www.khanacademy.org/",
    "https://www.medium.com/", "https://www.ted.com/", "https://news.ycombinator.com/",
    "https://www.unesco.org/", "https://www.oecd.org/", "https://www.fastcompany.com/",
    "https://www.wired.com/", "https://www.economist.com/", "https://www.worldbank.org/"
]

# ---------------- Color anchors ----------------
COLOR_ANCHORS = {
    "philosophy": {"color": "gold",    "patterns": [r"\bmeaning\b", r"\bethics?\b", r"\bvalue\b", r"\bpurpose\b"]},
    "science":    {"color": "cyan",    "patterns": [r"\bexperiment\b", r"\bdata\b", r"\bresearch\b", r"\bmodel\b"]},
    "technology": {"color": "magenta", "patterns": [r"\balgorithm\b", r"\bcompute\b", r"\bsoftware\b", r"\bsystem\b"]},
    "economy":    {"color": "green",   "patterns": [r"\bmarket\b", r"\bprice\b", r"\bgrowth\b", r"\btrade\b"]},
    "society":    {"color": "blue",    "patterns": [r"\bculture\b", r"\beducation\b", r"\bcommunity\b", r"\bpolicy\b"]},
    "health":     {"color": "red",     "patterns": [r"\bhealth\b", r"\bmedicine\b", r"\btherapy\b", r"\bdisease\b"]},
}

# ---------------- Deps ----------------
try:
    import requests
    from bs4 import BeautifulSoup
except Exception:
    print("Install deps:\n  pip install requests beautifulsoup4 lxml")
    sys.exit(1)

# ---------------- Utils ----------------
def ensure_dir(p): os.makedirs(p, exist_ok=True)
def now_utc(): return datetime.now(timezone.utc).isoformat()
def sha256_string(s): return hashlib.sha256(s.encode("utf-8")).hexdigest()

def truncate_paragraph(text, max_chars):
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars: return text
    cut = text[:max_chars]
    last_period = cut.rfind(".")
    return cut[:last_period+1] if last_period > 200 else cut

def apply_color_logic(paragraph):
    hits = []
    for fam, spec in COLOR_ANCHORS.items():
        for pat in spec["patterns"]:
            if re.search(pat, paragraph, flags=re.IGNORECASE):
                hits.append({"family": fam, "color": spec["color"], "pattern": pat})
                break
    if not hits:
        hits.append({"family":"unspecified","color":"gray","pattern":None})
    return hits

def fetch_url(u, timeout=REQUEST_TIMEOUT):
    try:
        r = requests.get(u, timeout=timeout, headers={"User-Agent":"InfinityStreamer/2.0"})
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")
        node = soup.select_one("article") or soup.select_one("main")
        return (node.get_text(" ", strip=True) if node else soup.get_text(" ", strip=True))
    except Exception:
        return ""

# ---------------- Token build (one paragraph per source) ----------------
def build_token(sources):
    count = random.randint(MIN_SOURCES_PER_TOKEN, MAX_SOURCES_PER_TOKEN)
    chosen = random.sample(sources, k=min(count, len(sources)))
    snippets = []
    links = []
    with ThreadPoolExecutor(max_workers=HTTP_WORKERS) as ex:
        futures = {ex.submit(fetch_url, u): u for u in chosen}
        for fut in as_completed(futures):
            url = futures[fut]
            raw = fut.result()
            if not raw: continue
            para = truncate_paragraph(raw, SNIPPET_MAX_CHARS)
            colors = apply_color_logic(para)
            snippets.append({"url": url, "snippet": para, "colors": colors})
            links.append({"url": url, "excerpt": truncate_paragraph(raw, 280)})
    payload = {
        "created_at_utc": now_utc(),
        "source_count_requested": count,
        "source_count_actual": len(snippets),
        "snippets": snippets,
        "links": links
    }
    # token hash equals value of full payload for deterministic provenance
    payload_str = json.dumps(payload, ensure_ascii=False)
    token_hash = sha256_string(payload_str)
    payload["token_hash"] = token_hash
    payload["value"] = token_hash
    return payload

# ---------------- Zip coin (master with 4 artifacts) ----------------
def package_zip_coin(master_index, tokens_payloads, out_zip_path):
    """
    tokens_payloads: list of token payload dicts (length TOKENS_PER_MASTER)
    Produces a zip with:
      - research.md (synthesized)
      - research_plus_data.json (full payloads)
      - data_only.json (links only)
      - valued_master.json (combined + master value)
      - hashes.json (per-artifact hashes + master hash)
    """
    # Artifact 1: Research (markdown synthesis)
    research_lines = [f"# Infinity Research — Master {master_index}", f"Created: {now_utc()}", ""]
    for i, tp in enumerate(tokens_payloads, 1):
        research_lines.append(f"## Token {i} (hash: {tp['token_hash']})")
        for j, sn in enumerate(tp["snippets"], 1):
            colors = ", ".join([f"{c['family']}:{c['color']}" for c in sn["colors"]])
            research_lines.append(f"- Source {j}: {sn['url']} | Colors: {colors}")
            research_lines.append(f"  {sn['snippet']}")
        research_lines.append("")
    research_md = "\n".join(research_lines)
    hash_research_md = sha256_string(research_md)

    # Artifact 2: Research + data (full payloads)
    research_plus_data = {"master_index": master_index, "created_at_utc": now_utc(), "tokens": tokens_payloads}
    research_plus_data_str = json.dumps(research_plus_data, ensure_ascii=False, indent=2)
    hash_research_plus_data = sha256_string(research_plus_data_str)

    # Artifact 3: Data-only (links only)
    data_only = {"master_index": master_index, "created_at_utc": now_utc(),
                 "links": [{"token_hash": tp["token_hash"], "links": tp["links"]} for tp in tokens_payloads]}
    data_only_str = json.dumps(data_only, ensure_ascii=False, indent=2)
    hash_data_only = sha256_string(data_only_str)

    # Artifact 4: Valued master (combined + master value)
    valued_master = {
        "master_index": master_index,
        "created_at_utc": now_utc(),
        "artifact_hashes": {
            "research_md": hash_research_md,
            "research_plus_data_json": hash_research_plus_data,
            "data_only_json": hash_data_only
        },
        "token_hashes": [tp["token_hash"] for tp in tokens_payloads]
    }
    valued_master_str = json.dumps(valued_master, ensure_ascii=False, indent=2)
    hash_valued_master = sha256_string(valued_master_str)

    # Master hash from artifacts (semantic bundle)
    master_concat = "\n".join([hash_research_md, hash_research_plus_data, hash_data_only, hash_valued_master])
    master_hash = sha256_string(master_concat)

    # Package zip coin (overwrite allowed)
    with zipfile.ZipFile(out_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("research.md", research_md)
        z.writestr("research_plus_data.json", research_plus_data_str)
        z.writestr("data_only.json", data_only_str)
        z.writestr("valued_master.json", valued_master_str)
        z.writestr("hashes.json", json.dumps({
            "master_index": master_index,
            "created_at_utc": now_utc(),
            "artifact_hashes": {
                "research_md": hash_research_md,
                "research_plus_data_json": hash_research_plus_data,
                "data_only_json": hash_data_only,
                "valued_master_json": hash_valued_master
            },
            "master_hash": master_hash
        }, ensure_ascii=False, indent=2))
        z.writestr(f"master_{master_index:04d}.txt", master_hash)

    return {
        "master_index": master_index,
        "master_hash": master_hash,
        "artifact_hashes": {
            "research_md": hash_research_md,
            "research_plus_data_json": hash_research_plus_data,
            "data_only_json": hash_data_only,
            "valued_master_json": hash_valued_master
        },
        "zip_path": out_zip_path
    }

# ---------------- Grand master (aggregates 10 zip coins) ----------------
def package_grand_master(grand_index, zip_coin_summaries, out_zip_path):
    """
    zip_coin_summaries: list of dicts returned by package_zip_coin (length MASTERS_PER_GRAND)
    Produces one grand master zip with:
      - index.json (listing master hashes + artifact hashes)
      - grand_master.txt (grand master hash)
    """
    index_payload = {
        "grand_index": grand_index,
        "created_at_utc": now_utc(),
        "masters": [{
            "master_index": s["master_index"],
            "master_hash": s["master_hash"],
            "artifact_hashes": s["artifact_hashes"]
        } for s in zip_coin_summaries]
    }
    index_str = json.dumps(index_payload, ensure_ascii=False, indent=2)
    # Grand hash = hash of concatenated master hashes in order
    concat = "\n".join([s["master_hash"] for s in zip_coin_summaries])
    grand_hash = sha256_string(concat)

    with zipfile.ZipFile(out_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.json", index_str)
        z.writestr("grand_master.txt", grand_hash)

    return {"grand_index": grand_index, "grand_hash": grand_hash, "zip_path": out_zip_path}

# ---------------- Git ----------------
def git(*args, check=True):
    return subprocess.run(["git", *args], check=check, capture_output=True, text=True)

def push_grand(zip_path, grand_index, grand_hash):
    add = git("add", "-f", os.path.join(INFINITY_TOKENS_DIR, "*"), check=False)
    print("[Git] add -f infinity_tokens/*:", add.stderr.strip() or add.stdout.strip() or "OK")
    msg = f"{GIT_COMMIT_MSG_PREFIX} grand_{grand_index:04d} hash={grand_hash}"
    commit = git("commit", "-m", msg, check=False)
    if commit.returncode != 0:
        print("[Git] Nothing to commit.")
    else:
        print("[Git] Commit:", commit.stdout.strip())
    push = git("push", GIT_REMOTE, GIT_BRANCH, check=False)
    if push.returncode == 0:
        print("[Git] Push OK.")
    else:
        print("[Git] Push failed:", push.stderr.strip())

# ---------------- Main flow ----------------
def main():
    ensure_dir(INFINITY_TOKENS_DIR)
    sources = DEFAULT_SOURCES

    # Build 10 masters (zip coins), then 1 grand master
    zip_coin_summaries = []
    for m in range(1, MASTERS_PER_GRAND + 1):
        print(f"[Master] Building zip coin {m} (tokens={TOKENS_PER_MASTER})")
        tokens_payloads = []
        for t in range(1, TOKENS_PER_MASTER + 1):
            tp = build_token(sources)
            tokens_payloads.append(tp)
            # Print the research live (Termux visible)
            print(f"[Research][M{m} T{t}] hash={tp['token_hash']} value={tp['value']} sources={tp['source_count_actual']}")
            for sn in tp["snippets"][:3]:  # show first 3 to keep output readable
                colors = ", ".join([f"{c['family']}:{c['color']}" for c in sn["colors"]])
                print(f"  - {sn['url']} | {colors}")
                print(f"    {sn['snippet'][:200]}...")
        # Rolling overwrite zip coin name
        zip_path = os.path.join(INFINITY_TOKENS_DIR, f"zipcoin_{m:04d}_{TOKENS_PER_MASTER}.zip")
        summary = package_zip_coin(master_index=m, tokens_payloads=tokens_payloads, out_zip_path=zip_path)
        print(f"[Master] Done zip coin {m}: {zip_path} | master_hash={summary['master_hash']}")
        zip_coin_summaries.append(summary)

    # Package grand master (only artifact pushed)
    grand_index = 1
    grand_zip = os.path.join(INFINITY_TOKENS_DIR, f"grand_master_{grand_index:04d}_{MASTERS_PER_GRAND}.zip")
    grand = package_grand_master(grand_index=grand_index, zip_coin_summaries=zip_coin_summaries, out_zip_path=grand_zip)
    print(f"[Grand] Built {grand_zip} | grand_hash={grand['grand_hash']}")

    # Push only grand master (and index/hashes alongside)
    push_grand(zip_path=grand_zip, grand_index=grand_index, grand_hash=grand["grand_hash"])

    # Final summary
    print("[Summary]")
    for s in zip_coin_summaries:
        print(f"  zipcoin {s['master_index']:04d} | master_hash={s['master_hash']}")
    print(f"  GRAND {grand['grand_index']:04d} | grand_hash={grand['grand_hash']} | file={grand['zip_path']}")

if __name__ == "__main__":
    main()
