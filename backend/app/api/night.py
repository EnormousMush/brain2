"""夜间发现 API —— 偏好、手动触发、以及收件箱里那一个「换一种说法」。

收件箱本身没有独立端点：提案就是 `ideas`，所以
    收下  = PATCH /api/ideas/{id} {status:"kept", brain_id:"..."}
    不要  = PATCH /api/ideas/{id} {status:"trashed"}
    捞回  = PATCH /api/ideas/{id} {status:"inbox"}
一套 CRUD 管两种来源，前端不需要记第二套动词。
"""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..db import count, get, update_id
from ..models import Idea, IdeaSource, NightPrefs, NightStatus
from ..night import discovery, runner
from .ideas import _to_idea

router = APIRouter(prefix="/api/night", tags=["night"])


def _status(p: NightPrefs) -> NightStatus:
    return NightStatus(prefs=p, running=runner.is_running(),
                       inbox=count("ideas", {"status": "inbox"}),
                       trashed=count("ideas", {"status": "trashed"}),
                       next_run=runner.next_run(p))


@router.get("", response_model=NightStatus)
def get_night():
    return _status(runner.load_prefs())


@router.put("", response_model=NightStatus)
def put_night(prefs: NightPrefs):
    """last_run / last_summary are ours, not the client's — never let a settings
    save reset them, or a saved preference would re-trigger the same night."""
    cur = runner.load_prefs()
    prefs.last_run, prefs.last_summary = cur.last_run, cur.last_summary
    return _status(runner.save_prefs(prefs))


@router.post("/run", response_model=NightStatus)
def run_now(bg: BackgroundTasks):
    """「立即运行」. Returns at once; poll GET /api/night for `running` + summary.
    Ignores `last_run`, so you can demo it twice in one day."""
    if runner.is_running():
        raise HTTPException(409, "上一次运行尚未结束")
    bg.add_task(runner.run_once)
    return _status(runner.load_prefs())


@router.post("/ideas/{idea_id}/rephrase", response_model=Idea)
async def rephrase(idea_id: str):
    """换一种说法：同样这两条碎片，重新写一遍句子。

    刻意**不换碎片** —— 换碎片就是另一个想法了，而这个按钮的意思是「这个连接
    是对的，只是话说得不好」。要换连接，跑下一轮。
    """
    d = get("ideas", idea_id)
    if not d:
        raise HTTPException(404, "no such idea")
    if not d.get("source"):
        raise HTTPException(400, "只有系统提议可以改写")
    src = IdeaSource(**d["source"])
    motion, why, _ = await discovery.phrase(src, temperature=1.0)
    src.why = why
    update_id("ideas", idea_id, {"text": motion, "source": src.model_dump()})
    return _to_idea(get("ideas", idea_id))
