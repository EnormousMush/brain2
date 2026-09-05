"""夜间跑批 —— 把发现变成收件箱里的东西，或者直接变成一场已经吵完的辩论。

两种模式（`NightPrefs.mode`）：

  suggest 「只递给我」 = Be My Mind
      照样想 n 个，一场都不开。早上你在收件箱里挑。零 token 花在辩论上。

  auto 「自动开庭」
      同样的 n 个，接着**真的把它们吵完**。早上你看到的是结果，不是待办。

不管哪种模式，提案都停在 `status="inbox"`，**不进星图** —— 星图上只有你点过头的
东西。你收下它（归到某个副脑）它才成为一颗星，你不要它就进弃稿箱（可恢复）。

花钱的地方只有 auto。`token_budget` 是**整晚**的硬上限，不是每场的：跑到没预算就
干净地停下，并在 summary 里说清楚停在第几个。这样"睡觉的时候它在干活"不会变成
"睡觉的时候它在刷卡"。
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime

from ..db import get, insert, nid, now, read_setting, update_id, write_setting
from ..models import Blackboard, DebateConfig, IdeaSource, NightPrefs
from . import discovery

log = logging.getLogger("weave.night")

KEY = "night"
_running = False          # module-level: one night at a time, per process


def is_running() -> bool:
    return _running


def load_prefs() -> NightPrefs:
    return NightPrefs(**(read_setting(KEY) or {}))


def save_prefs(p: NightPrefs) -> NightPrefs:
    write_setting(KEY, p.model_dump())
    return p


def _create_idea(src: IdeaSource, motion: str, why: str) -> str:
    iid = nid("ida")
    src.why = why
    insert("ideas", dict(
        id=iid, text=motion, origin="agent", kind="proposal", status="inbox",
        brain_id=None, image=None, enrichment="pending", skeleton=None,
        embedding=None, hits=[], x=None, y=None, z=None,
        source=src.model_dump(), debate_id=None, created_at=now(), decided_at=None,
    ))
    return iid


async def _hold_court(idea_id: str, motion: str, wildness: float,
                      budget_left: int) -> tuple[int, bool]:
    """Run one debate to the end. -> (tokens spent, produced anything)."""
    from ..debate.engine import run_debate          # local: avoids an import cycle

    did = nid("dbt")
    cfg = DebateConfig(wildness=wildness, max_rounds=4,
                       token_budget=max(4_000, min(60_000, budget_left)))
    insert("debates", dict(
        id=did, idea_id=idea_id, motion=motion, status="pending",
        config=cfg.model_dump(), blackboard=Blackboard(motion=motion).model_dump(),
        tokens_used=0, mode="dream", created_at=now(), ended_at=None,
    ))
    update_id("ideas", idea_id, {"debate_id": did})
    cards = 0
    async for ev in run_debate(did):
        cards += ev.type == "card.created"
    spent = int((get("debates", did) or {}).get("tokens_used") or 0)
    return spent, cards > 0


async def run_once(prefs: NightPrefs | None = None) -> str:
    """One night. Safe to call by hand (「立即运行」) and by the scheduler."""
    global _running
    if _running:
        return "上一轮还在跑"
    p = prefs or load_prefs()
    _running = True
    spent = 0
    made: list[str] = []
    stopped_early = ""
    try:
        pairs = discovery.find_pairs(p.ideas_per_night, p.wildness)
        if not pairs:
            return _finish(p, "没找到新的连接可提 —— 要么笔记还太少，要么能连的都连过了。")

        for src in pairs:
            if spent >= p.token_budget:
                stopped_early = f"（token 预算用完，只做了 {len(made)} 个）"
                break
            motion, why, tok = await discovery.phrase(src)
            spent += tok
            iid = _create_idea(src, motion, why)
            made.append(iid)

            if p.mode == "auto":
                if spent >= p.token_budget:
                    stopped_early = f"（token 预算用完，后 {len(pairs) - len(made)} 个没开庭）"
                    break
                used, _ = await _hold_court(iid, motion, p.wildness, p.token_budget - spent)
                spent += used

        verb = "开了庭" if p.mode == "auto" else "记在收件箱"
        return _finish(p, f"想了 {len(made)} 个新连接，{verb}。花了 {spent:,} tokens。{stopped_early}")
    except Exception as e:  # noqa: BLE001 — a failed night must not kill the server
        log.exception("night run failed")
        return _finish(p, f"这一轮失败了：{e}")
    finally:
        _running = False


def _finish(p: NightPrefs, summary: str) -> str:
    p.last_run = date.today().isoformat()
    p.last_summary = summary
    save_prefs(p)
    log.info("night: %s", summary)
    return summary


# ------------------------------------------------------------------ schedule
async def scheduler() -> None:
    """A minute-resolution loop in the FastAPI lifespan. No new dependency, and
    nothing runs while the backend is down — which is the honest behaviour for
    something that lives entirely on the user's own machine."""
    while True:
        try:
            p = load_prefs()
            today = date.today().isoformat()
            if p.enabled and p.last_run != today and datetime.now().hour == p.hour:
                await run_once(p)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            log.exception("night scheduler tick failed")
        await asyncio.sleep(60)


def next_run(p: NightPrefs) -> str | None:
    if not p.enabled:
        return None
    d = date.today().isoformat()
    return f"{'明天' if (p.last_run == d or datetime.now().hour >= p.hour) else '今天'} {p.hour:02d}:00"
