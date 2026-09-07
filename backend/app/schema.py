"""Weave / 副脑 — MongoDB collections.

THIS FILE + models.py ARE THE DATA CONTRACT. All three modules read/write here.
Change a field -> change models.py and frontend/src/types.ts in the same commit.

    brains ──1:n── clusters ──1:n── chunks
       │                              ▲
    ideas ──(hits: chunk_id[])────────┘
       │      (brain_id 可为 null = 未归档)
    debates ──1:n── turns (citations: chunk_id[])
       └──1:n── cards (connection: chunk_id[])

碎片 vs 想法 —— 这条线是产品的核心约束，不要合并这两个集合：
  chunks 来自用户的笔记，是 agent **唯一**可以引用的东西。
  ideas  是用户或 agent 自己想出来的，永远不进检索语料，所以 agent 不可能
         把用户自己的想法当成"证据"引用回给用户。agent 可以**读**想法
         （作为辩题、作为夜间素材）并重组，但引用不到。

Document shapes (all ids are app-generated strings stored in `_id`, exposed as `id`):

brains    {_id, name, kind: domain|project|reading|spark, color, source: upload|paste|seed,
           provider, model, persona,          # BYOK binding; null => default provider
           chunk_count, created_at}
clusters  {_id, brain_id, label, summary, size, centroid: Binary(float32), x, y, z}
chunks    {_id, brain_id, cluster_id, text, source_path, source_loc, content_date,
           tags: [str], embedding: Binary(float32), x, y, z, created_at}
ideas     {_id, text, origin: user|agent, kind: eureka|motion|proposal,
           status: inbox|kept|trashed,      # inbox 只用于 agent 提案，不进星图
           brain_id: str | null,            # null = 未归档，浮在星图正中
           image: {path, caption} | null,   # path 相对 DATA_DIR
           enrichment: pending|ready|failed,
           skeleton: {object, constraint, mechanism, motivation, keywords} | null,
           embedding: Binary(float32) | null, hits: [Hit],
           x, y, z,                          # 只有 status=kept 才有坐标
           debate_id: str | null, created_at, decided_at}
debates   {_id, idea_id, motion, status: pending|running|converged|stopped|failed,
           config: DebateConfig, blackboard: Blackboard, tokens_used, mode: live|dream,
           created_at, ended_at}
turns     {_id, debate_id, round, seq, role, brain_id, brain_name, stance, claim, body,
           citations: [chunk_id], attacks: [claim_id], novelty, rejected: bool, tokens,
           created_at}
cards     {_id, debate_id, connection: [Connection], idea, why_you, next_action,
           scores: Scores, saved: bool, created_at}
settings  {_id: key, value: {...}}          # key "providers" holds SettingsPayload

Derived, never stored:
  * 共现边 (indexing/cooccurrence.py) — which two chunks were used in the same
    debate. Recomputed from turns+cards on every /api/graph call. If you ever
    cache it, invalidate on turn insert AND card insert.

Conventions:
  * Vectors are BSON Binary of raw float32 bytes (np.ndarray.astype("float32").tobytes()).
    Similarity is a numpy dot product in process. We do NOT use Atlas Vector Search or
    any vector DB — a few thousand vectors are microseconds in numpy.
  * Nested things (skeleton, hits, config, blackboard, citations, tags, scores...) are
    native sub-documents / arrays, never JSON strings.
  * MongoDB has no foreign keys. Cascades are explicit: db.delete_brain(),
    db.delete_debate(), db.delete_idea(). Use those, never a bare delete on a parent.
  * Always write x/y/z as keys (None until layout runs) so `{"x": {"$ne": None}}` is exact.
"""

COLLECTIONS = ["brains", "clusters", "chunks", "ideas", "debates", "turns", "cards",
               "settings"]

# collection -> list of index key specs (pymongo format)
INDEXES: dict[str, list[list[tuple[str, int]]]] = {
    "brains":   [[("created_at", 1)]],
    "clusters": [[("brain_id", 1)]],
    "chunks":   [[("brain_id", 1)], [("cluster_id", 1)]],
    "ideas":    [[("created_at", -1)], [("status", 1)], [("brain_id", 1)]],
    "debates":  [[("created_at", -1)], [("idea_id", 1)]],
    "turns":    [[("debate_id", 1), ("seq", 1)]],
    "cards":    [[("debate_id", 1), ("created_at", 1)], [("created_at", -1)]],
}

# 「删除我的副脑」 wipes these. Provider settings (API keys) are deliberately kept.
USER_DATA_COLLECTIONS = ["cards", "turns", "debates", "ideas", "chunks", "clusters", "brains"]
