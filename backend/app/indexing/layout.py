"""Stable 3D layout — the single biggest reason our graph beats Obsidian's.

Obsidian re-runs a force simulation every time you open it, so nothing is ever
in the same place twice and the user can never build spatial memory. We compute
coordinates ONCE from the embeddings and pin them:

  * brain centres  -> Fibonacci sphere (deterministic, evenly separated galaxies)
  * chunk position -> per-brain PCA to 3D, sign-normalised, scaled, then offset
  * cluster position -> centroid of its members
  * idea position  -> filed under a 副脑: at the rim of that brain's cloud, next to
                      the fragments it most resembles. Unfiled: floating in the
                      hollow at the very centre of the chart, which is otherwise
                      empty — so "not yet filed" is a place you can see, not a flag.
  * a short repulsion pass only separates coincident points

The frontend passes these as fx/fy/fz to force-graph so the simulation cannot
move them. Same note, same spot, every launch.
"""
from __future__ import annotations

import numpy as np

from ..db import bulk_set, find, from_blob

GALAXY_R = 260.0    # distance of a brain centre from the origin
LOCAL_R = 95.0      # radius of one brain's cloud
HOLLOW_R = 110.0    # radius of the unfiled-idea shell at the origin (grows with count
                    # so the shell never gets denser than its labels are wide)
RIM = 1.45          # how far past its neighbours a filed idea sits (1 = right on top)
MIN_RIM = 1.15      # ...but never closer to the brain centre than this × LOCAL_R,
                    # or the idea's label collides with the 副脑's own name


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
    layout_ideas()


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


# --------------------------------------------------------------------- ideas
def _brain_centres() -> dict[str, np.ndarray]:
    ids = _brain_ids()
    return dict(zip(ids, fibonacci_sphere(max(len(ids), 1)) * GALAXY_R))


def layout_ideas() -> None:
    """Place every kept idea. inbox / trashed ideas get no coordinates at all —
    they are not on the chart until the user has said yes to them."""
    rows = find("ideas", fields=["brain_id", "status", "embedding", "created_at"])
    kept = [r for r in rows if r.get("status") == "kept"]
    bulk_set("ideas", [(r["id"], {"x": None, "y": None, "z": None})
                       for r in rows if r.get("status") != "kept"])
    if not kept:
        return

    centres = _brain_centres()
    updates: list[tuple[str, dict]] = []

    # ---- unfiled: an evenly spread shell in the hollow at the centre
    loose = sorted([r for r in kept if not r.get("brain_id")], key=lambda r: r.get("created_at") or "")
    shell = min(HOLLOW_R + 7.0 * len(loose), GALAXY_R * 0.75)
    for p, r in zip(fibonacci_sphere(max(len(loose), 1)) * shell, loose):
        updates.append((r["id"], {"x": float(p[0]), "y": float(p[1]), "z": float(p[2])}))

    # ---- filed: beside the fragments it most resembles, pushed out to the rim
    by_brain: dict[str, list[dict]] = {}
    for r in kept:
        if r.get("brain_id"):
            by_brain.setdefault(r["brain_id"], []).append(r)
    for bid, ideas in by_brain.items():
        centre = centres.get(bid)
        if centre is None:
            continue
        chunks = find("chunks", {"brain_id": bid, "x": {"$ne": None}},
                      fields=["embedding", "x", "y", "z"])
        C = np.stack([from_blob(c["embedding"]) for c in chunks]) if chunks else None
        P = np.array([[c["x"], c["y"], c["z"]] for c in chunks], dtype="float32") if chunks else None
        for k, r in enumerate(ideas):
            v = from_blob(r.get("embedding"))
            if C is None or v is None or len(v) != C.shape[1]:
                d = np.array([0.0, 1.0, 0.0], dtype="float32")
            else:
                near = np.argsort(-(C @ v))[:3]
                d = (P[near].mean(0) - centre).astype("float32")
            n = float(np.linalg.norm(d))
            if n < 1e-3:                      # its neighbours sit on the centre
                d, n = fibonacci_sphere(max(len(ideas), 1))[k].astype("float32"), 1.0
            # push out to at least MIN_RIM: closer than that and the idea's label
            # lands on top of the 副脑's own name
            pos = centre + d / n * max(n * RIM, LOCAL_R * MIN_RIM)
            updates.append((r["id"], {"x": float(pos[0]), "y": float(pos[1]), "z": float(pos[2])}))

    bulk_set("ideas", updates)
