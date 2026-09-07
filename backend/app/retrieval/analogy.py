"""类比检索 (analogical retrieval) — the mechanism that makes this not-a-wrapper.

Standard RAG takes top-k by similarity. Top-k is, by construction, the stuff you
already associate with the query: same domain, same words, zero surprise. We do
three things differently:

  1. ANTI-SIMILARITY BAND. Rank by |cos - band_centre| instead of by cos, and
     hard-drop everything above `band_hi`. Remote association lives in the middle
     band; the top of the ranking is where cliché lives.
  2. WILDNESS SLIDER. band_centre = lerp(0.55, 0.30, wildness). One float, exposed
     in the UI as 保守 <-> 疯狂. The judges can drag it and watch the output change.
  3. CROSS-BRAIN QUOTA + MMR. Round-robin across 副脑 so a result set can never be
     one brain talking to itself, then MMR-rerank for internal diversity.

Everything here is deterministic given the same embeddings — no LLM in the loop,
so it is fast, free, auditable, and reproducible on stage.
"""
from __future__ import annotations

import numpy as np

from ..db import brain_map, find, from_blob
from ..models import Hit

BAND_LO, BAND_HI = 0.18, 0.62      # anything above BAND_HI is "同一件事", drop it
MMR_LAMBDA = 0.55


def band_centre(wildness: float) -> float:
    w = float(np.clip(wildness, 0.0, 1.0))
    return 0.55 * (1 - w) + 0.30 * w


def _load_corpus() -> tuple[list[dict], np.ndarray]:
    rows = find("chunks", {"embedding": {"$ne": None}},
                fields=["brain_id", "text", "source_path", "embedding"])
    if not rows:
        return [], np.zeros((0, 1), dtype="float32")
    bm = brain_map()
    meta = [{"id": r["id"], "brain_id": r["brain_id"], "text": r["text"],
             "source_path": r.get("source_path"),
             "brain_name": bm.get(r["brain_id"], {}).get("name", "?")} for r in rows]
    M = np.stack([from_blob(r["embedding"]) for r in rows])
    return meta, M


def analogical_search(
    qvec: np.ndarray,
    *,
    wildness: float = 0.5,
    k: int = 12,
    min_brains: int = 2,
    exclude_chunk_ids: set[str] | None = None,
    only_brain: str | None = None,
) -> list[Hit]:
    meta, M = _load_corpus()
    if not meta:
        return []
    q = np.asarray(qvec, dtype="float32").ravel()
    q = q / max(float(np.linalg.norm(q)), 1e-6)
    sims = M @ q

    centre = band_centre(wildness)
    excl = exclude_chunk_ids or set()

    cand: list[tuple[float, float, int]] = []
    for i, s in enumerate(sims):
        m = meta[i]
        if m["id"] in excl:
            continue
        if only_brain and m["brain_id"] != only_brain:
            continue
        if s > BAND_HI or s < BAND_LO:      # too obvious / pure noise
            continue
        cand.append((abs(float(s) - centre), float(s), i))
    if not cand:                            # band empty (tiny corpus) -> relax once
        cand = [(abs(float(s) - centre), float(s), i) for i, s in enumerate(sims)
                if meta[i]["id"] not in excl
                and (not only_brain or meta[i]["brain_id"] == only_brain)]
    cand.sort(key=lambda t: t[0])

    # ---- cross-brain round-robin over the band-ranked candidates
    by_brain: dict[str, list[tuple[float, float, int]]] = {}
    for c in cand:
        by_brain.setdefault(meta[c[2]]["brain_id"], []).append(c)
    order = sorted(by_brain, key=lambda b: by_brain[b][0][0])
    pool: list[tuple[float, float, int]] = []
    depth = 0
    while len(pool) < k * 3 and any(len(v) > depth for v in by_brain.values()):
        for b in order:
            if len(by_brain[b]) > depth:
                pool.append(by_brain[b][depth])
        depth += 1

    # ---- MMR rerank for internal diversity
    selected: list[int] = []
    remaining = [c[2] for c in pool]
    band_of = {c[2]: c[0] for c in pool}
    while remaining and len(selected) < k:
        best, best_score = None, -1e9
        for i in remaining:
            relevance = 1.0 - band_of[i]
            redundancy = max((float(M[i] @ M[j]) for j in selected), default=0.0)
            score = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * redundancy
            if score > best_score:
                best, best_score = i, score
        selected.append(best)
        remaining.remove(best)

    hits = [
        Hit(chunk_id=meta[i]["id"], brain_id=meta[i]["brain_id"],
            brain_name=meta[i]["brain_name"], score=float(sims[i]),
            band_score=float(band_of.get(i, 0.0)), text=meta[i]["text"],
            source_path=meta[i]["source_path"])
        for i in selected
    ]

    # ---- hard constraint: a result set must span >= min_brains 副脑
    if len({h.brain_id for h in hits}) < min_brains:
        seen = {h.brain_id for h in hits}
        for c in cand:
            bid = meta[c[2]]["brain_id"]
            if bid not in seen:
                m = meta[c[2]]
                hits.append(Hit(chunk_id=m["id"], brain_id=bid, brain_name=m["brain_name"],
                                score=float(sims[c[2]]), band_score=c[0], text=m["text"],
                                source_path=m["source_path"]))
                seen.add(bid)
            if len(seen) >= min_brains:
                break
    return hits


def surprise(a_id: str, b_id: str) -> float:
    """1 - cos between two chunks. Feeds the card's 惊喜度 score."""
    rows = find("chunks", {"_id": {"$in": [a_id, b_id]}}, fields=["embedding"])
    if len(rows) < 2:
        return 0.0
    v = [from_blob(r["embedding"]) for r in rows]
    return float(np.clip(1.0 - float(v[0] @ v[1]), 0.0, 1.0))
