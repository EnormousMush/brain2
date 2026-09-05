"""Stable 3D layout — the single biggest reason our graph beats Obsidian's.

Obsidian re-runs a force simulation every time you open it, so nothing is ever
in the same place twice and the user can never build spatial memory. We compute
coordinates ONCE from the embeddings and pin them:

  * brain centres  -> Fibonacci sphere (deterministic, evenly separated galaxies)
  * chunk position -> per-brain PCA to 3D, sign-normalised, scaled, then offset
  * cluster position -> centroid of its members
  * a short repulsion pass only separates coincident points

The frontend passes these as fx/fy/fz to force-graph so the simulation cannot
move them. Same note, same spot, every launch.
"""
from __future__ import annotations

import numpy as np

from ..db import bulk_set, find, from_blob

GALAXY_R = 260.0    # distance of a brain centre from the origin
LOCAL_R = 95.0      # radius of one brain's cloud


def fibonacci_sphere(n: int) -> np.ndarray:
    if n == 1:
        return np.zeros((1, 3), dtype="float32")
    i = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    theta = np.pi * (1 + 5 ** 0.5) * i
    return np.stack([np.cos(theta) * np.sin(phi), np.sin(theta) * np.sin(phi),
                     np.cos(phi)], axis=1).astype("float32")


def pca3(X: np.ndarray) -> np.ndarray:
    Xc = X - X.mean(0, keepdims=True)
    # economy SVD; deterministic sign fix so the cloud never mirrors between runs
    _, _, Vt = np.linalg.svd(Xc, full_matrices=False)
    V = Vt[:3].T if Vt.shape[0] >= 3 else np.pad(Vt.T, ((0, 0), (0, 3 - Vt.shape[0])))
    for c in range(V.shape[1]):
        if V[np.argmax(np.abs(V[:, c])), c] < 0:
            V[:, c] *= -1
    Y = Xc @ V
    scale = np.percentile(np.abs(Y), 95) or 1.0
    return (Y / scale * LOCAL_R).astype("float32")


def _separate(P: np.ndarray, min_d: float = 6.0, iters: int = 12) -> np.ndarray:
    """Cheap O(n·k) jitter pass: only pushes apart points that visually collide."""
    rng = np.random.default_rng(11)
    for _ in range(iters):
        order = np.argsort(P[:, 0])
        moved = False
        for a, b in zip(order, order[1:]):
            d = P[a] - P[b]
            n = np.linalg.norm(d)
            if n < min_d:
                push = (d / (n + 1e-6)) * (min_d - n) * 0.5 if n > 1e-6 else rng.normal(size=3)
                P[a] += push
                P[b] -= push
                moved = True
        if not moved:
            break
    return P


def _brain_ids() -> list[str]:
    return [b["id"] for b in find("brains", sort=[("created_at", 1)], fields=["created_at"])]


def layout_all() -> None:
    brains = _brain_ids()
    centres = fibonacci_sphere(max(len(brains), 1)) * GALAXY_R
    for c, bid in zip(centres, brains):
        layout_brain(bid, centre=c)


def layout_brain(brain_id: str, centre: np.ndarray | None = None) -> None:
    if centre is None:
        brains = _brain_ids()
        centres = fibonacci_sphere(max(len(brains), 1)) * GALAXY_R
        idx = brains.index(brain_id) if brain_id in brains else 0
        centre = centres[idx]

    rows = find("chunks", {"brain_id": brain_id}, fields=["cluster_id", "embedding"])
    if not rows:
        return
    X = np.stack([from_blob(r["embedding"]) for r in rows])
    P = _separate(pca3(X)) + centre

    bulk_set("chunks", [(r["id"], {"x": float(p[0]), "y": float(p[1]), "z": float(p[2])})
                        for p, r in zip(P, rows)])

    by_cluster: dict[str, list[np.ndarray]] = {}
    for r, p in zip(rows, P):
        if r.get("cluster_id"):
            by_cluster.setdefault(r["cluster_id"], []).append(p)
    bulk_set("clusters", [(k, dict(zip("xyz", np.mean(v, axis=0).astype(float).tolist())))
                          for k, v in by_cluster.items()])
