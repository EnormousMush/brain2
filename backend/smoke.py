"""End-to-end smoke test. Runs with zero keys and zero network.

    WEAVE_OFFLINE=1 python smoke.py

Uses the `weave_smoke` database (never your demo data). If no MongoDB is
reachable it transparently runs on the in-memory store, so this always works.
Exercises: ingest -> cluster -> layout -> idea -> analogical retrieval ->
role binding -> debate rounds -> blackboard compaction -> cards -> REST readers
-> 夜间发现 (both modes, the inbox, and the token guard).
Run this after every merge. If it prints DONE, the demo path is alive.
"""
import asyncio
import os
import sys
from pathlib import Path

os.environ.setdefault("WEAVE_OFFLINE", "1")
os.environ.setdefault("WEAVE_MONGO_DB", "weave_smoke")
os.environ.setdefault("WEAVE_DATA_DIR", str(Path(__file__).parent / "data_smoke"))
sys.path.insert(0, str(Path(__file__).parent))

from app.db import backend, get, init_db, insert, nid, now, wipe_all  # noqa: E402
from app.ingest.pipeline import ingest_documents  # noqa: E402
from app.indexing.layout import layout_all  # noqa: E402
from app.models import Blackboard, DebateConfig  # noqa: E402
from app.api.ideas import enrich  # noqa: E402
from app.debate.engine import run_debate  # noqa: E402
from app.models import NightPrefs  # noqa: E402
from app.night import runner as night  # noqa: E402

SEEDS = {
    "工作·系统设计": """# 排队与调度
2024/03/11 医院门诊排班一直在打架，主任要公平，护士要连休，系统只会按工龄排。
公平分配的本质是：稀缺资源 + 多个互相冲突的偏好 + 一个所有人都能接受的规则。
# 队列
Little's Law 说队列长度 = 到达率 x 停留时间。很多"人手不够"其实是停留时间的问题。
#系统设计 #排队论
# 准入控制
与其让所有请求都排进来慢慢等，不如在门口就拒掉一部分。拒绝比排队更诚实。
# 反压
下游扛不住的时候要让上游知道，而不是默默堆积。沉默的堆积最后一定会炸。
""",
    "兴趣·音乐": """# 爵士的 comping
2023/07/02 钢琴伴奏不是填满，而是留白：你要给独奏者留出他还没想好的空间。
乐队里没有指挥，靠的是一套所有人都默认的规则和眼神。
# 即兴
即兴不是随便弹，是在极强的约束里做选择。约束越明确，自由度反而越高。
#音乐 #即兴
# 段落
一首曲子靠段落长度建立预期，再靠打破预期制造情绪。全是意外等于没有意外。
# 音量
合奏里最难的不是弹得响，是知道什么时候该退到别人后面去。
""",
    "经历·搬家与租房": """# 合租分摊
2022/09/18 三个人分房租，房间大小不一样，朝向也不一样，按面积分谁都不服。
后来用了"密封出价 + 剩余均分"的办法，十分钟就定了，三个人都觉得自己赚了。
# 搬家
搬家最大的成本不是钱，是决定要扔掉什么。
#谈判 #分配
# 家务
定期轮换比一次分好更管用，因为没人能预先知道哪件事最烦。
# 押金
押金真正的作用不是赔偿，是让双方在最后一天之前都还有话可说。
""",
}


async def main():
    init_db()
    print(f"  db backend: {backend()}")
    wipe_all()
    for i, (name, text) in enumerate(SEEDS.items()):
        bid = nid("brn")
        insert("brains", dict(id=bid, name=name, kind="domain",
                              color=["#7aa2f7", "#f7768e", "#9ece6a"][i], source="seed",
                              provider=None, model=None, persona=None, chunk_count=0,
                              created_at=now()))
        stats = await ingest_documents(bid, [(f"{name}.md", text)])
        print(f"  ingest {name}: {stats}")
    layout_all()

    sid = nid("ida")
    insert("ideas", dict(id=sid, text="想做一个帮小团队分活儿的工具", origin="user",
                         kind="motion", status="kept", brain_id=None, image=None,
                         enrichment="pending", skeleton=None, embedding=None, hits=[],
                         x=None, y=None, z=None, debate_id=None, created_at=now(),
                         decided_at=None))
    await enrich(sid)
    sp = get("ideas", sid)
    print(f"  idea enrichment={sp['enrichment']} hits={len(sp['hits'])}")
    assert sp["enrichment"] == "ready", "enrich failed"
    assert len({h["brain_id"] for h in sp["hits"]}) >= 2, "hits must span >= 2 brains"
    assert sp.get("x") is not None, "kept idea has no chart position"

    did = nid("dbt")
    cfg = DebateConfig(max_rounds=3, token_budget=40000)
    insert("debates", dict(id=did, idea_id=sid, motion=None, status="pending",
                           config=cfg.model_dump(), blackboard=Blackboard().model_dump(),
                           tokens_used=0, mode="live", created_at=now(), ended_at=None))

    counts = {}
    async for ev in run_debate(did):
        counts[ev.type] = counts.get(ev.type, 0) + 1
        if ev.type == "turn.done":
            print(f"    [{ev.data['role']:<11}] {ev.data['body'][:60]}")
        if ev.type == "debate.ended":
            print(f"  ended: {ev.data}")
    print("  events:", counts)
    assert counts.get("turn.done", 0) >= 4, "no turns produced"

    # ---- the REST readers must agree with what the engine persisted
    from fastapi import BackgroundTasks
    from app.api import debates as dapi, graph as gapi, ideas as iapi, night as napi
    from app.models import IdeaPatch
    d = dapi.get_debate(did)
    assert d.status in ("stopped", "converged") and d.tokens_used > 0
    turns = dapi.turns(did, include_rejected=True)
    assert len(turns) >= counts.get("turn.done", 0), "persisted turns < emitted turns"
    assert len(dapi.turns(did)) == counts.get("turn.done", 0), "accepted turns mismatch"
    assert all(t.brain_name for t in turns if t.brain_id), "turn.brain_name missing"
    g = gapi.get_graph(level="chunk")
    assert g.nodes and all(n.x is not None for n in g.nodes), "layout coords missing"
    gb = gapi.get_graph(level="brain")
    assert gb.nodes, "brain level empty"
    # a finished debate must show up as 共现边 on both levels — that IS the output
    assert any(l.kind == "cooccur" for l in g.links), "no co-occurrence edges at chunk level"
    assert any(l.kind == "cooccur" for l in gb.links), "no co-occurrence edges at brain level"
    assert iapi.get_idea(sid).hits, "idea hits not readable"
    print(f"  readers ok: {len(turns)} turns, {len(g.nodes)} chunk nodes, "
          f"{len(dapi.cards(did))} cards, "
          f"{sum(l.kind == 'cooccur' for l in g.links)} 共现边")

    # ---- 夜间发现: it must find its own questions without anyone asking
    from app.db import find
    print("  night:", await night.run_once(NightPrefs(mode="suggest", ideas_per_night=3)))
    inbox = find("ideas", {"status": "inbox"})
    assert len(inbox) == 3, f"suggest mode made {len(inbox)} proposals, wanted 3"
    assert all(i["x"] is None for i in inbox), "an unaccepted proposal is on the chart"
    assert all(not i.get("debate_id") for i in inbox), "「只递给我」 held court anyway"
    assert all(len(set(i["source"]["brain_ids"])) == 2 for i in inbox), "proposal not cross-brain"
    # accepting one puts it on the chart; the rest stay invisible
    iapi.patch_idea(inbox[0]["id"], IdeaPatch(status="kept"), BackgroundTasks())
    await iapi.enrich(inbox[0]["id"])
    assert get("ideas", inbox[0]["id"])["x"] is not None, "accepted idea never got a place"
    assert any(n.level == "idea" for n in gapi.get_graph(level="brain").nodes), \
        "accepted idea missing from the star chart"
    # 换一种说法 must keep the same two 碎片 — re-rolling them would be a new idea
    same = await napi.rephrase(inbox[1]["id"])
    assert same.source.chunk_ids == inbox[1]["source"]["chunk_ids"], "rephrase changed the pair"
    print("  night: 自动开庭 ->", await night.run_once(NightPrefs(mode="auto", ideas_per_night=1)))
    assert any(i.get("debate_id") for i in find("ideas", {"origin": "agent"})), \
        "「自动开庭」 produced no debate"
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
