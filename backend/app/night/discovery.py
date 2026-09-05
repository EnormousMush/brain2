"""夜间发现 —— agent 自己在星图里找题，不等用户提问。

这是整个产品立场的技术落点：如果只有用户开口它才动，那它就只是个搜索框。
所以每晚它自己挑 n 对碎片，理由是可以说清楚的两条：

  2/3 「**没被接通过的中距离对**」(strategy="unconnected")
      跨副脑、相似度落在反相似度带里（§analogy.py 同一条原则：太像 = 同一件事 =
      废话），并且**从来没有在任何一场辩论里同时出现过**。已经接通过的连接不是
      发现，是复读。

  1/3 「**冷区**」(strategy="cold")
      按碎片被辩论用到的次数排序，从最少被碰过的那一端取。前一条只会越挖越深，
      这一条保证笔记里没人管的角落最终一定会被翻到。

两条策略都**不调 LLM**：纯 numpy，毫秒级、可复现、可审计。LLM 只在最后一步出现，
而且只是个记录员 —— 把选出来的这一对写成一句人话的议题（`phrase()`）。

规模：语料超过 SAMPLE_CAP 条就随机抽样，n² 的相似度矩阵不能无上限地涨。
"""
from __future__ import annotations

import logging

import numpy as np

from ..db import brain_map, find, from_blob
from ..indexing import cooccurrence
from ..models import IdeaSource
from ..providers import get_moderator
from ..retrieval.analogy import BAND_HI, BAND_LO, band_centre
from ..debate import prompts

log = logging.getLogger("weave.night")

SAMPLE_CAP = 1500        # above this the corpus is sampled; n² must stay bounded
COLD_SHARE = 1 / 3       # how much of the night comes from neglected corners
RNG = np.random.default_rng(23)


def _corpus() -> tuple[list[dict], np.ndarray]:
    rows = find("chunks", {"embedding": {"$ne": None}},
                fields=["brain_id", "text", "source_path", "embedding"])
    if len(rows) > SAMPLE_CAP:
        rows = [rows[i] for i in RNG.choice(len(rows), SAMPLE_CAP, replace=False)]
    if not rows:
        return [], np.zeros((0, 1), dtype="float32")
    return rows, np.stack([from_blob(r["embedding"]) for r in rows])


def _already_paired() -> set[tuple[str, str]]:
    """Pairs a debate has already connected, plus pairs a previous night already
    proposed. Re-proposing either of those is repetition, not discovery."""
    seen = set(cooccurrence.chunk_pairs())
    for d in find("ideas", {"origin": "agent"}, fields=["source"]):
        ids = sorted((d.get("source") or {}).get("chunk_ids") or [])
        if len(ids) == 2:
            seen.add((ids[0], ids[1]))
    return seen


def _touch_counts() -> dict[str, int]:
    """chunk_id -> how many debates have used it. Absent = never touched."""
    counts: dict[str, int] = {}
    for frags in cooccurrence.debate_fragment_sets().values():
        for cid in frags:
            counts[cid] = counts.get(cid, 0) + 1
    return counts


def _rank_pairs(meta: list[dict], M: np.ndarray, centre: float,
                excluded: set[tuple[str, str]], order: np.ndarray | None = None,
                lo: float = BAND_LO) -> list[tuple[float, int, int]]:
    """(band_distance, i, j) for every cross-brain pair inside the band, best first.
    `order` restricts the left-hand side to a subset of rows (the cold sweep).

    `lo` is the noise floor and is the ONLY part of the band the relaxed pass
    lowers. BAND_HI never moves: proposing two fragments that already say the
    same thing is the one failure this whole mechanism exists to avoid.
    """
    S = M @ M.T
    brains = np.array([m["brain_id"] for m in meta])
    rows = range(len(meta)) if order is None else order
    out: list[tuple[float, int, int]] = []
    for i in rows:
        s = S[i]
        ok = (brains != brains[i]) & (s > lo) & (s < BAND_HI)
        for j in np.flatnonzero(ok):
            if j <= i and order is None:
                continue          # each unordered pair once
            a, b = sorted((meta[i]["id"], meta[int(j)]["id"]))
            if (a, b) in excluded:
                continue
            out.append((abs(float(s[j]) - centre), i, int(j)))
    out.sort(key=lambda t: t[0])
    return out


def _take(ranked: list[tuple[float, int, int]], k: int, used: set[str],
          meta: list[dict], strategy: str, *, allow_reuse: bool = False) -> list[IdeaSource]:
    """Greedy, with a no-reuse rule: one 碎片 may anchor at most one proposal a
    night, or all n ideas end up being the same idea wearing different hats.
    `allow_reuse` is the backfill pass — on a small corpus, one repeated fragment
    beats handing the user fewer ideas than they asked for."""
    bm = brain_map()
    out: list[IdeaSource] = []
    for dist, i, j in ranked:
        if len(out) >= k:
            break
        a, b = meta[i], meta[j]
        if not allow_reuse and (a["id"] in used or b["id"] in used):
            continue
        used.add(a["id"]); used.add(b["id"])
        out.append(IdeaSource(
            strategy=strategy, chunk_ids=[a["id"], b["id"]],
            brain_ids=[a["brain_id"], b["brain_id"]],
            brain_names=[bm.get(a["brain_id"], {}).get("name", "?"),
                         bm.get(b["brain_id"], {}).get("name", "?")],
            quotes=[a["text"][:220], b["text"][:220]],
            score=round(1.0 - dist, 3)))
    return out


def find_pairs(n: int, wildness: float = 0.55) -> list[IdeaSource]:
    """The whole nightly search, LLM-free. Returns at most n sources."""
    meta, M = _corpus()
    if len(meta) < 2:
        return []
    centre = band_centre(wildness)
    excluded = _already_paired()
    used: set[str] = set()

    n_cold = max(1, round(n * COLD_SHARE)) if n > 1 else 0
    picks: list[IdeaSource] = []

    def keep(new: list[IdeaSource]) -> None:
        """Record what we just took so the next ranking pass cannot re-offer it —
        `excluded` is what _rank_pairs filters on, and it is rebuilt each call."""
        picks.extend(new)
        for s in new:
            a, b = sorted(s.chunk_ids)
            excluded.add((a, b))

    # ---- 1/3 first: the cold sweep is the constrained one. If the open-field pass
    # ran first it would eat the good fragments and the neglected corners would
    # never get their share — which is the one thing this strategy exists to fix.
    if n_cold:
        touch = _touch_counts()
        cold = np.argsort([touch.get(m["id"], 0) for m in meta], kind="stable")
        keep(_take(_rank_pairs(meta, M, centre, excluded, order=cold[:60]),
                   n_cold, used, meta, "cold"))

    # ---- 2/3: never-connected mid-band pairs, anywhere in the corpus
    keep(_take(_rank_pairs(meta, M, centre, excluded), n - len(picks), used,
               meta, "unconnected"))

    # ---- still short? Two escape hatches, in order of how much they give up.
    # 1. drop the noise floor (a small corpus can leave the band nearly empty —
    #    analogical_search relaxes the same way for the same reason)
    if len(picks) < n:
        keep(_take(_rank_pairs(meta, M, centre, excluded, lo=0.0), n - len(picks),
                   used, meta, "unconnected"))
    # 2. drop the one-proposal-per-碎片 rule, rather than hand back fewer than asked
    if len(picks) < n:
        keep(_take(_rank_pairs(meta, M, centre, excluded, lo=0.0), n - len(picks),
                   used, meta, "unconnected", allow_reuse=True))
    return picks[:n]


async def phrase(src: IdeaSource, *, temperature: float = 0.85) -> tuple[str, str, int]:
    """Turn one pair into a sentence a debate can be about. -> (motion, why, tokens)

    The LLM is a scribe here, exactly as in cards.py: it may only state the
    connection between the two fragments it was handed. It does not get to pick
    the fragments — that already happened, deterministically, above.
    """
    mod = get_moderator()
    try:
        res = await mod.chat(prompts.PROPOSAL_SYSTEM, prompts.proposal_user(src),
                             max_tokens=260, temperature=temperature, json_mode=True)
        d = res.json()
        motion = str(d.get("motion") or "").strip()[:160]
        why = str(d.get("why") or "").strip()[:200]
        if motion:
            return motion, why, res.tokens
    except Exception as e:  # noqa: BLE001 — a bad night must never crash the app
        log.warning("proposal phrasing failed: %s", e)
    a, b = (src.brain_names + ["?", "?"])[:2]
    return (f"把「{a}」里的那个做法搬到「{b}」上，说得通吗", "", 0)
