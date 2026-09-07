"""Auto-partition a 副脑 into 簇 (constellations) and let an LLM name them.

k-means, hand-rolled on numpy. A few thousand vectors: this is milliseconds.
Do NOT add faiss/sklearn — the install cost is bigger than the win.
"""
from __future__ import annotations

import numpy as np

from ..db import bulk_set, delete, find, from_blob, insert_many, nid, to_blob
from ..providers import get_moderator

RNG = np.random.default_rng(7)   # fixed seed => same layout every launch


def kmeans(X: np.ndarray, k: int, iters: int = 40) -> tuple[np.ndarray, np.ndarray]:
    n = len(X)
    k = max(1, min(k, n))
    # k-means++ init
    centres = [X[RNG.integers(n)]]
    for _ in range(k - 1):
        d = np.min(((X[:, None, :] - np.array(centres)[None]) ** 2).sum(-1), axis=1)
        p = d / max(d.sum(), 1e-9)
        centres.append(X[RNG.choice(n, p=p)])
    C = np.array(centres, dtype="float32")
    labels = np.zeros(n, dtype=int)
    for _ in range(iters):
        labels = np.argmax(X @ C.T, axis=1)          # unit vectors -> cosine
        new = np.stack([X[labels == j].mean(0) if (labels == j).any() else C[j]
                        for j in range(k)])
        new /= np.clip(np.linalg.norm(new, axis=1, keepdims=True), 1e-6, None)
        if np.allclose(new, C, atol=1e-5):
            C = new
            break
        C = new
    return labels, C


def suggest_k(n: int) -> int:
    return int(np.clip(round(np.sqrt(n / 2)), 2, 12))


async def cluster_brain(brain_id: str) -> int:
    rows = find("chunks", {"brain_id": brain_id}, fields=["text", "embedding"])
    if len(rows) < 3:
        return 0
    X = np.stack([from_blob(r["embedding"]) for r in rows])
    labels, C = kmeans(X, suggest_k(len(rows)))

    delete("clusters", {"brain_id": brain_id})
    mod = get_moderator()
    updates: list[tuple[str, dict]] = []
    inserts: list[dict] = []
    for j in range(len(C)):
        members = [rows[i] for i in np.where(labels == j)[0]]
        if not members:
            continue
        cid = nid("clu")
        sample = "\n---\n".join(m["text"][:200] for m in members[:6])
        try:
            res = await mod.chat(
                system="LABEL。你是知识整理助手。为一组笔记片段起一个 2-6 字的中文主题标签。"
                       "只输出 JSON：{\"label\":\"...\",\"summary\":\"一句话\"}",
                user=sample, max_tokens=120, temperature=0.3, json_mode=True,
            )
            d = res.json()
            label = (d.get("label") or "").strip()[:16] or f"主题 {j + 1}"
            summary = (d.get("summary") or "")[:120]
        except Exception:  # noqa: BLE001 — naming must never fail ingest
            label, summary = f"主题 {j + 1}", ""
        inserts.append(dict(id=cid, brain_id=brain_id, label=label, summary=summary,
                            size=len(members), centroid=to_blob(C[j]), x=None, y=None, z=None))
        updates += [(m["id"], {"cluster_id": cid}) for m in members]

    insert_many("clusters", inserts)
    bulk_set("chunks", updates)
    return len(inserts)
