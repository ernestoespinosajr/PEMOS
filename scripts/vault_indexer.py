#!/usr/bin/env python3
"""
Vault Indexer — Extract, chunk, and optionally embed vault markdown files.

Adapted from PKM/scripts/rag_pipeline.py for Obsidian vault content.

Usage:
    # Index all changed vault files (incremental):
    python scripts/vault_indexer.py --db vault/project.db

    # Force re-index everything:
    python scripts/vault_indexer.py --db vault/project.db --force

    # Index a specific file:
    python scripts/vault_indexer.py --db vault/project.db --file vault/tickets/tckt-001.md

    # Chunk only (no embeddings — FTS5 still works):
    python scripts/vault_indexer.py --db vault/project.db --chunk-only

    # Dry run:
    python scripts/vault_indexer.py --db vault/project.db --dry-run

Requirements:
    pip install tiktoken
    pip install openai numpy  # only for embeddings

Environment:
    OPENAI_API_KEY — only needed if generating embeddings (not for --chunk-only)
"""

import argparse
import glob
import logging
import os
import re
import sqlite3
import struct
import sys
import time
from pathlib import Path

import tiktoken

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072
CHUNK_TARGET_TOKENS = 600
CHUNK_MAX_TOKENS = 800
CHUNK_OVERLAP_TOKENS = 50
EMBEDDING_BATCH_SIZE = 100
COST_PER_MILLION_TOKENS = 0.13

# Directories to index (relative to project root)
VAULT_DIRS = [
    "vault/tickets",
    "vault/context",
    "vault/decisions",
    "vault/tech-debt",
]
# Individual files to index
VAULT_FILES = [
    "vault/Brief.md",
    "vault/dependencies.md",
]
# Directories to skip
SKIP_DIRS = {"vault/templates", "vault/.obsidian", "vault/inbox"}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("vault_indexer")

# ---------------------------------------------------------------------------
# Token counting
# ---------------------------------------------------------------------------

_enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_enc.encode(text))


# ---------------------------------------------------------------------------
# Markdown extraction
# ---------------------------------------------------------------------------

def extract_markdown_sections(file_path: str) -> list[dict]:
    """
    Extract sections from a markdown file, splitting on ## headers.
    Returns list of {section_title, text, section_index}.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if not content.strip():
        return []

    sections = []
    # Split on ## headers (keep the header with its content)
    parts = re.split(r'^(#{1,3}\s+.+)$', content, flags=re.MULTILINE)

    current_title = None
    current_text = ""
    section_idx = 0

    for part in parts:
        if re.match(r'^#{1,3}\s+', part):
            # Save previous section
            if current_text.strip():
                sections.append({
                    "section_index": section_idx,
                    "text": current_text.strip(),
                    "section_title": current_title,
                })
                section_idx += 1
            current_title = part.strip().lstrip("#").strip()
            current_text = ""
        else:
            current_text += part

    # Save last section
    if current_text.strip():
        sections.append({
            "section_index": section_idx,
            "text": current_text.strip(),
            "section_title": current_title,
        })

    return sections


# ---------------------------------------------------------------------------
# Chunking (from PKM rag_pipeline.py)
# ---------------------------------------------------------------------------

def chunk_text(text: str, target_tokens: int = CHUNK_TARGET_TOKENS,
               max_tokens: int = CHUNK_MAX_TOKENS,
               overlap_tokens: int = CHUNK_OVERLAP_TOKENS) -> list[str]:
    """
    Split text into chunks of approximately target_tokens size.
    Uses sentence boundaries when possible, with overlap.
    """
    if not text or not text.strip():
        return []

    sentences = re.split(r'(?<=[.!?。])\s+', text)
    if not sentences:
        return [text]

    chunks = []
    current_chunk = ""
    current_tokens = 0

    for sentence in sentences:
        sentence_tokens = count_tokens(sentence)

        if sentence_tokens > max_tokens:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
                current_tokens = 0
            words = sentence.split()
            word_chunk = ""
            for word in words:
                test = word_chunk + " " + word if word_chunk else word
                if count_tokens(test) > target_tokens:
                    if word_chunk:
                        chunks.append(word_chunk.strip())
                    word_chunk = word
                else:
                    word_chunk = test
            if word_chunk:
                current_chunk = word_chunk
                current_tokens = count_tokens(current_chunk)
            continue

        if current_tokens + sentence_tokens > target_tokens and current_chunk:
            chunks.append(current_chunk.strip())
            if overlap_tokens > 0:
                overlap_text = _get_tail(current_chunk, overlap_tokens)
                current_chunk = overlap_text + " " + sentence
            else:
                current_chunk = sentence
            current_tokens = count_tokens(current_chunk)
        else:
            current_chunk = current_chunk + " " + sentence if current_chunk else sentence
            current_tokens += sentence_tokens

    if current_chunk and current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def _get_tail(text: str, target_tokens: int) -> str:
    words = text.split()
    tail = ""
    for word in reversed(words):
        test = word + " " + tail if tail else word
        if count_tokens(test) >= target_tokens:
            break
        tail = test
    return tail.strip()


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

def discover_vault_files(project_root: Path, specific_file: str | None = None) -> list[str]:
    """Find all markdown files in the vault that should be indexed."""
    if specific_file:
        path = project_root / specific_file
        if path.exists():
            return [specific_file]
        log.error(f"File not found: {path}")
        return []

    files = []

    # Index files in configured directories
    for dir_path in VAULT_DIRS:
        full_dir = project_root / dir_path
        if full_dir.exists():
            for md_file in sorted(full_dir.glob("*.md")):
                rel_path = str(md_file.relative_to(project_root))
                files.append(rel_path)

    # Index specific standalone files
    for file_path in VAULT_FILES:
        full_path = project_root / file_path
        if full_path.exists():
            files.append(file_path)

    return files


# ---------------------------------------------------------------------------
# Database operations
# ---------------------------------------------------------------------------

def get_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def get_file_mtime(conn: sqlite3.Connection, vault_path: str) -> float | None:
    """Get the stored mtime for a vault file."""
    row = conn.execute(
        "SELECT file_mtime FROM vault_chunks WHERE vault_path = ? LIMIT 1",
        (vault_path,)
    ).fetchone()
    return row["file_mtime"] if row else None


def delete_file_chunks(conn: sqlite3.Connection, vault_path: str):
    """Delete all chunks and embeddings for a vault file."""
    conn.execute(
        """DELETE FROM vault_embeddings WHERE source_table = 'vault_chunks'
           AND source_id IN (SELECT id FROM vault_chunks WHERE vault_path = ?)""",
        (vault_path,)
    )
    conn.execute("DELETE FROM vault_chunks WHERE vault_path = ?", (vault_path,))
    conn.commit()


def store_chunks(conn: sqlite3.Connection, vault_path: str, file_mtime: float,
                 chunks: list[dict]) -> list[int]:
    """Store chunks in vault_chunks table."""
    chunk_ids = []
    for chunk in chunks:
        cursor = conn.execute(
            """INSERT INTO vault_chunks (vault_path, chunk_index, content, section_title,
               chunk_type, token_count, file_mtime)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (vault_path, chunk["chunk_index"], chunk["content"],
             chunk.get("section_title"), chunk.get("chunk_type", "text"),
             chunk.get("token_count"), file_mtime)
        )
        chunk_ids.append(cursor.lastrowid)
    conn.commit()
    return chunk_ids


def get_unembedded_chunks(conn: sqlite3.Connection, vault_path: str | None = None) -> list[dict]:
    """Get chunks without embeddings."""
    if vault_path:
        rows = conn.execute(
            """SELECT id, content FROM vault_chunks
               WHERE vault_path = ?
               AND id NOT IN (SELECT source_id FROM vault_embeddings WHERE source_table = 'vault_chunks')""",
            (vault_path,)
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT id, content FROM vault_chunks
               WHERE id NOT IN (SELECT source_id FROM vault_embeddings WHERE source_table = 'vault_chunks')"""
        ).fetchall()
    return [dict(r) for r in rows]


def store_embeddings(conn: sqlite3.Connection, chunk_embeddings: list[dict]):
    """Store embeddings in vault_embeddings table."""
    for item in chunk_embeddings:
        embedding_blob = struct.pack(f"{len(item['embedding'])}f", *item["embedding"])
        conn.execute(
            """INSERT INTO vault_embeddings (source_table, source_id, content_text, embedding, model)
               VALUES ('vault_chunks', ?, ?, ?, ?)""",
            (item["chunk_id"], item["content_text"], embedding_blob, EMBEDDING_MODEL)
        )
    conn.commit()


# ---------------------------------------------------------------------------
# OpenAI Embeddings
# ---------------------------------------------------------------------------

def generate_embeddings_batch(texts: list[str], api_key: str) -> list[list[float]]:
    import openai
    client = openai.OpenAI(api_key=api_key)
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]


def estimate_cost(total_tokens: int) -> float:
    return (total_tokens / 1_000_000) * COST_PER_MILLION_TOKENS


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def process_file(conn: sqlite3.Connection, project_root: Path, vault_path: str,
                 force: bool = False, chunk_only: bool = False,
                 dry_run: bool = False, api_key: str | None = None) -> dict:
    """Process a single vault file through the pipeline."""
    full_path = project_root / vault_path
    if not full_path.exists():
        return {"vault_path": vault_path, "error": "File not found"}

    current_mtime = full_path.stat().st_mtime
    stored_mtime = get_file_mtime(conn, vault_path)

    stats = {
        "vault_path": vault_path,
        "chunks_created": 0,
        "skipped": False,
        "embeddings_created": 0,
        "total_tokens": 0,
    }

    # Check if file changed
    if stored_mtime is not None and stored_mtime == current_mtime and not force:
        log.info(f"  Unchanged: {vault_path}")
        stats["skipped"] = True
        return stats

    log.info(f"  Indexing: {vault_path}")

    # Delete old chunks if re-indexing
    if stored_mtime is not None:
        delete_file_chunks(conn, vault_path)

    # Extract sections
    sections = extract_markdown_sections(str(full_path))
    if not sections:
        log.warning(f"  No content extracted from {vault_path}")
        return stats

    # Chunk each section
    all_chunks = []
    chunk_idx = 0
    for section in sections:
        text_chunks = chunk_text(section["text"])
        for chunk_str in text_chunks:
            token_count = count_tokens(chunk_str)
            all_chunks.append({
                "chunk_index": chunk_idx,
                "content": chunk_str,
                "section_title": section.get("section_title"),
                "chunk_type": "text",
                "token_count": token_count,
            })
            chunk_idx += 1

    total_tokens = sum(c["token_count"] for c in all_chunks)
    stats["total_tokens"] = total_tokens
    stats["chunks_created"] = len(all_chunks)

    if dry_run:
        log.info(f"  [DRY RUN] Would create {len(all_chunks)} chunks (~{total_tokens:,} tokens)")
        return stats

    # Store chunks (FTS5 auto-populated via triggers)
    store_chunks(conn, vault_path, current_mtime, all_chunks)
    log.info(f"  Stored {len(all_chunks)} chunks (~{total_tokens:,} tokens)")

    # Embeddings (optional)
    if not chunk_only and api_key:
        unembedded = get_unembedded_chunks(conn, vault_path)
        if unembedded:
            log.info(f"  Embedding {len(unembedded)} chunks...")
            for i in range(0, len(unembedded), EMBEDDING_BATCH_SIZE):
                batch = unembedded[i:i + EMBEDDING_BATCH_SIZE]
                texts = [c["content"] for c in batch]
                vectors = generate_embeddings_batch(texts, api_key)
                items = [{"chunk_id": c["id"], "content_text": c["content"], "embedding": v}
                         for c, v in zip(batch, vectors)]
                store_embeddings(conn, items)
                stats["embeddings_created"] += len(items)
                if i + EMBEDDING_BATCH_SIZE < len(unembedded):
                    time.sleep(0.5)

    return stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Vault Indexer: chunk and index vault markdown for search.")
    parser.add_argument("--db", type=str, required=True, help="Path to SQLite database (vault/project.db)")
    parser.add_argument("--file", type=str, help="Index a specific file")
    parser.add_argument("--force", action="store_true", help="Re-index all files regardless of mtime")
    parser.add_argument("--chunk-only", action="store_true", help="Only chunk (no embeddings). FTS5 still works.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    args = parser.parse_args()

    project_root = Path(args.db).resolve().parent.parent
    if not Path(args.db).exists():
        log.error(f"Database not found: {args.db}")
        sys.exit(1)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.chunk_only and not args.dry_run:
        log.warning("OPENAI_API_KEY not set. Running in chunk-only mode (FTS5 search will work).")
        args.chunk_only = True

    conn = get_db(args.db)
    files = discover_vault_files(project_root, args.file)

    log.info(f"Vault indexer starting. Files to process: {len(files)}")
    log.info(f"Database: {args.db}")
    log.info("")

    all_stats = []
    for f in files:
        stats = process_file(conn, project_root, f,
                             force=args.force, chunk_only=args.chunk_only,
                             dry_run=args.dry_run, api_key=api_key)
        all_stats.append(stats)

    # Summary
    indexed = [s for s in all_stats if not s.get("skipped") and not s.get("error")]
    skipped = [s for s in all_stats if s.get("skipped")]
    errors = [s for s in all_stats if s.get("error")]
    total_chunks = sum(s.get("chunks_created", 0) for s in indexed)
    total_tokens = sum(s.get("total_tokens", 0) for s in indexed)
    total_embeddings = sum(s.get("embeddings_created", 0) for s in indexed)

    log.info("")
    log.info("=" * 50)
    log.info("INDEXING SUMMARY")
    log.info("=" * 50)
    log.info(f"  Files indexed:  {len(indexed)}")
    log.info(f"  Files skipped:  {len(skipped)} (unchanged)")
    log.info(f"  Files errored:  {len(errors)}")
    log.info(f"  Chunks created: {total_chunks}")
    log.info(f"  Tokens total:   {total_tokens:,}")
    if total_embeddings:
        log.info(f"  Embeddings:     {total_embeddings}")
        log.info(f"  Est. cost:      ${estimate_cost(total_tokens):.4f}")
    log.info("=" * 50)

    conn.close()


if __name__ == "__main__":
    main()
