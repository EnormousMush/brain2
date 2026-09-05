"""Weave / 副脑 — MongoDB collections.

THIS FILE + models.py ARE THE DATA CONTRACT. All three modules read/write here.
Change a field -> change models.py and frontend/src/types.ts in the same commit.

    brains ──1:n── clusters ──1:n── chunks
       │                              ▲
    sparks ──(hits: chunk_id[])───────┘
       │
    debates ──1:n── turns (citations: chunk_id[])
       └──1:n── cards (connection: chunk_id[])

Document shapes (all ids are app-generated strings stored in `_id`, exposed as `id`):

brains    {_id, name, kind: domain|project|reading|spark, color, source: upload|paste|seed,
           provider, model, persona,          # BYOK binding; null => default provider
           chunk_count, created_at}
clusters  {_id, brain_id, label, summary, size, centroid: Binary(float32), x, y, z}
chunks    {_id, brain_id, cluster_id, text, source_path, source_loc, content_date,
           tags: [str], embedding: Binary(float32), x, y, z, created_at}
sparks    {_id, text, kind: phrase|link|reference, status: captured|enriched|debated|failed,
           skeleton: {object, constraint, mechanism, motivation, keywords} | null,
           embedding: Binary(float32) | null, hits: [Hit], created_at}
debates   {_id, spark_id, motion, status: pending|running|converged|stopped|failed,
           config: DebateConfig, blackboard: Blackboard, tokens_used, mode: live|dream,
           created_at, ended_at}
turns     {_id, debate_id, round, seq, role, brain_id, brain_name, stance, claim, body,
           citations: [chunk_id], attacks: [claim_id], novelty, rejected: bool, tokens,
           created_at}
cards     {_id, debate_id, connection: [Connection], idea, why_you, next_action,
           scores: Scores, saved: bool, created_at}
settings  {_id: key, value: {...}}          # key "providers" holds SettingsPayload

Conventions:
  * Vectors are BSON Binary of raw float32 bytes (np.ndarray.astype("float32").tobytes()).
    Similarity is a numpy dot product in process. We do NOT use Atlas Vector Search or
    any vector DB — a few thousand vectors are microseconds in numpy.
  * Nested things (skeleton, hits, config, blackboard, citations, tags, scores...) are
    native sub-documents / arrays, never JSON strings.
  * MongoDB has no foreign keys. Cascades are explicit: db.delete_brain(),
    db.delete_debate(), db.delete_spark(). Use those, never a bare delete on a parent.
  * Always write x/y/z as keys (None until layout runs) so `{"x": {"$ne": None}}` is exact.
"""

COLLECTIONS = ["brains", "clusters", "chunks", "sparks", "debates", "turns", "cards",
               "settings"]

# collection -> list of index key specs (pymongo format)
INDEXES: dict[str, list[list[tuple[str, int]]]] = {
    "brains":   [[("created_at", 1)]],
    "clusters": [[("brain_id", 1)]],
    "chunks":   [[("brain_id", 1)], [("cluster_id", 1)]],
    "sparks":   [[("created_at", -1)]],
    "debates":  [[("created_at", -1)], [("spark_id", 1)]],
    "turns":    [[("debate_id", 1), ("seq", 1)]],
    "cards":    [[("debate_id", 1), ("created_at", 1)], [("created_at", -1)]],
}

# 「删除我的副脑」 wipes these. Provider settings (API keys) are deliberately kept.
USER_DATA_COLLECTIONS = ["cards", "turns", "debates", "sparks", "chunks", "clusters", "brains"]
