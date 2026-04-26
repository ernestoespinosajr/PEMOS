#!/usr/bin/env python3
"""
Vault Search — FTS5 keyword + semantic + hybrid search over vault chunks.

Adapted from PKM/scripts/rag_search.py for Obsidian vault content.

Usage:
    # FTS5 keyword search (no API key needed):
    python scripts/vault_search.py "login bug" --fts-only --db vault/project.db

    # Semantic search:
    python scripts/vault_search.py "authentication issues" --db vault/project.db

    # Hybrid search:
    python scripts/vault_search.py "dark mode" --hybrid --db vault/project.db

    # JSON output for skill consumption:
    python scripts/vault_search.py "login" --fts-only --json --db vault/project.db --top-k 3

Requirements:
    pip install numpy        # for semantic search
    pip install openai       # for semantic search

Environment:
    OPENAI_API_KEY — only needed for semantic search (not for --fts-only)
"""

import argparse
import json
import os
import sqlite3
import struct
import sys
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


# ---------------------------------------------------------------------------
# Embedding helpers
# ---------------------------------------------------------------------------

def get_query_embedding(query: str, api_key: str) -> list[float]:
    import openai
    client = openai.OpenAI(api_key=api_key)
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=[query])
    return response.data[0].embedding


def blob_to_vector(blob: bytes) -> np.ndarray:
    n = len(blob) // 4
    return np.array(struct.unpack(f"{n}f", blob), dtype=np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# Semantic search
# ---------------------------------------------------------------------------

def semantic_search(conn: sqlite3.Connection, query: str, api_key: str,
                    top_k: int = 5) -> list[dict]:
    query_vector = get_query_embedding(query, api_key)
    query_vec = np.array(query_vector, dtype=np.float32)

    rows = conn.execute(
        """SELECT e.source_id, e.content_text, e.embedding,
                  vc.vault_path, vc.chunk_index, vc.section_title, vc.chunk_type, vc.token_count
           FROM vault_embeddings e
           JOIN vault_chunks vc ON e.source_id = vc.id AND e.source_table = 'vault_chunks'"""
    ).fetchall()

    if not rows:
        return []

    results = []
    for row in rows:
        d = dict(row)
        vec = blob_to_vector(d["embedding"])
        sim = cosine_similarity(query_vec, vec)
        results.append({
            "score": round(sim, 4),
            "content": d["content_text"],
            "vault_path": d["vault_path"],
            "chunk_index": d["chunk_index"],
            "section_title": d["section_title"],
            "chunk_type": d["chunk_type"],
            "token_count": d["token_count"],
            "search_type": "semantic",
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


# ---------------------------------------------------------------------------
# FTS5 keyword search
# ---------------------------------------------------------------------------

def fts_search(conn: sqlite3.Connection, query: str, top_k: int = 5) -> list[dict]:
    fts_query = query

    try:
        rows = conn.execute(
            """SELECT vc.id, vc.content, vc.vault_path, vc.chunk_index,
                      vc.section_title, vc.chunk_type, vc.token_count, rank
               FROM vault_chunks_fts fts
               JOIN vault_chunks vc ON fts.rowid = vc.id
               WHERE vault_chunks_fts MATCH ?
               ORDER BY rank
               LIMIT ?""",
            (fts_query, top_k)
        ).fetchall()
    except sqlite3.OperationalError:
        words = query.split()
        fts_query = " OR ".join(f'"{w}"' for w in words)
        rows = conn.execute(
            """SELECT vc.id, vc.content, vc.vault_path, vc.chunk_index,
                      vc.section_title, vc.chunk_type, vc.token_count, rank
               FROM vault_chunks_fts fts
               JOIN vault_chunks vc ON fts.rowid = vc.id
               WHERE vault_chunks_fts MATCH ?
               ORDER BY rank
               LIMIT ?""",
            (fts_query, top_k)
        ).fetchall()

    results = []
    for row in rows:
        d = dict(row)
        results.append({
            "score": round(-d["rank"], 4),
            "content": d["content"],
            "vault_path": d["vault_path"],
            "chunk_index": d["chunk_index"],
            "section_title": d["section_title"],
            "chunk_type": d["chunk_type"],
            "token_count": d["token_count"],
            "search_type": "fts5",
        })
    return results


# ---------------------------------------------------------------------------
# Hybrid search
# ---------------------------------------------------------------------------

def hybrid_search(conn: sqlite3.Connection, query: str, api_key: str,
                  top_k: int = 5) -> list[dict]:
    sem_results = semantic_search(conn, query, api_key, top_k=top_k * 2)
    fts_results = fts_search(conn, query, top_k=top_k * 2)

    K = 60
    scores = {}

    for rank, r in enumerate(sem_results):
        key = (r["vault_path"], r["chunk_index"])
        if key not in scores:
            scores[key] = {"rrf_score": 0, "result": r}
        scores[key]["rrf_score"] += 1.0 / (K + rank + 1)

    for rank, r in enumerate(fts_results):
        key = (r["vault_path"], r["chunk_index"])
        if key not in scores:
            scores[key] = {"rrf_score": 0, "result": r}
        scores[key]["rrf_score"] += 1.0 / (K + rank + 1)

    merged = sorted(scores.values(), key=lambda x: x["rrf_score"], reverse=True)
    results = []
    for item in merged[:top_k]:
        r = item["result"].copy()
        r["score"] = round(item["rrf_score"], 4)
        r["search_type"] = "hybrid"
        results.append(r)

    return results


# ---------------------------------------------------------------------------
# Display
# ---------------------------------------------------------------------------

def display_results(results: list[dict], query: str, as_json: bool = False):
    if as_json:
        print(json.dumps(results, indent=2, ensure_ascii=False, default=str))
        return

    if not results:
        print(f'\nNo results found for: "{query}"\n')
        return

    print(f"\n{'=' * 60}")
    print(f'  Search: "{query}" | Mode: {results[0]["search_type"]} | Results: {len(results)}')
    print(f"{'=' * 60}\n")

    for i, r in enumerate(results, 1):
        section = f" | {r['section_title']}" if r.get("section_title") else ""
        print(f"  [{i}] Score: {r['score']}{section}")
        print(f"      File: {r['vault_path']}")

        content = r["content"]
        if len(content) > 300:
            content = content[:300] + "..."
        for line in content.split("\n"):
            print(f"      {line}")
        print()

    print(f"{'=' * 60}\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Vault Search: FTS5 + semantic search over vault content.")
    parser.add_argument("query", type=str, help="Search query")
    parser.add_argument("--db", type=str, required=True, help="Path to SQLite database")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results (default 5)")
    parser.add_argument("--fts-only", action="store_true", help="FTS5 keyword search only (no API call)")
    parser.add_argument("--hybrid", action="store_true", help="Hybrid search (semantic + FTS5)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.fts_only:
        print("Error: OPENAI_API_KEY not set. Use --fts-only for keyword search.", file=sys.stderr)
        sys.exit(1)

    conn = get_db(args.db)

    if args.fts_only:
        results = fts_search(conn, args.query, args.top_k)
    elif args.hybrid:
        results = hybrid_search(conn, args.query, api_key, args.top_k)
    else:
        results = semantic_search(conn, args.query, api_key, args.top_k)

    display_results(results, args.query, as_json=args.json)
    conn.close()


if __name__ == "__main__":
    main()
