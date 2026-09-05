"""End-to-end smoke test. Runs with zero keys and zero network.

    WEAVE_OFFLINE=1 python smoke.py

Uses the `weave_smoke` database (never your demo data). If no MongoDB is
reachable it transparently runs on the in-memory store, so this always works.
Exercises: ingest -> cluster -> layout -> spark -> analogical retrieval ->
role binding -> debate rounds -> blackboard compaction -> cards -> REST readers.
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
from app.api.sparks import enrich  # noqa: E402
from app.debate.engine import run_debate  # noqa: E402

SEEDS = {
    "工作·系统设计": """# 排队与调度
2024/03/11 医院门诊排班一直在打架，主任要公平，护士要连休，系统只会按工龄排。
公平分配的本质是：稀缺资源 + 多个互相冲突的偏好 + 一个所有人都能接受的规则。
# 队列
Little's Law 说队列长度 = 到达率 x 停留时间。很多"人手不够"其实是停留时间的问题。
#系统设计 #排队论
""",
    "兴趣·音乐": """# 爵士的 comping
2023/07/02 钢琴伴奏不是填满，而是留白：你要给独奏者留出他还没想好的空间。
乐队里没有指挥，靠的是一套所有人都默认的规则和眼神。
# 即兴
即兴不是随便弹，是在极强的约束里做选择。约束越明确，自由度反而越高。
#音乐 #即兴
""",
    "经历·搬家与租房": """# 合租分摊
2022/09/18 三个人分房租，房间大小不一样，朝向也不一样，按面积分谁都不服。
后来用了"密封出价 + 剩余均分"的办法，十分钟就定了，三个人都觉得自己赚了。
# 搬家
搬家最大的成本不是钱，是决定要扔掉什么。
#谈判 #分配
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

    sid = nid("spk")
    insert("sparks", dict(id=sid, text="想做一个帮小团队分活儿的工具", kind="phrase",
                          status="captured", skeleton=None, embedding=None, hits=[],
                          created_at=now()))
    await enrich(sid)
    sp = get("sparks", sid)
    print(f"  spark status={sp['status']} hits={len(sp['hits'])}")
    assert sp["status"] == "enriched", "enrich failed"
    assert len({h["brain_id"] for h in sp["hits"]}) >= 2, "hits must span >= 2 brains"

    did = nid("dbt")
    cfg = DebateConfig(max_rounds=3, token_budget=40000)
    insert("debates", dict(id=did, spark_id=sid, motion=None, status="pending",
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
    from app.api import debates as dapi, graph as gapi, sparks as sapi
    d = dapi.get_debate(did)
    assert d.status in ("stopped", "converged") and d.tokens_used > 0
    turns = dapi.turns(did, include_rejected=True)
    assert len(turns) >= counts.get("turn.done", 0), "persisted turns < emitted turns"
    assert len(dapi.turns(did)) == counts.get("turn.done", 0), "accepted turns mismatch"
    assert all(t.brain_name for t in turns if t.brain_id), "turn.brain_name missing"
    g = gapi.get_graph(level="chunk")
    assert g.nodes and all(n.x is not None for n in g.nodes), "layout coords missing"
    assert gapi.get_graph(level="brain").nodes, "brain level empty"
    assert sapi.get_spark(sid).hits, "spark hits not readable"
    print(f"  readers ok: {len(turns)} turns, {len(g.nodes)} chunk nodes, "
          f"{len(dapi.cards(did))} cards")
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
