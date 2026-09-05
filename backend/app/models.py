"""Pydantic DTOs. THIS FILE IS THE INTERFACE CONTRACT between the three modules.

Frontend types in `frontend/src/types.ts` mirror these one-for-one.
If you change a field here, change it there in the same commit.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

Role = Literal["moderator", "proposer", "analogist", "skeptic", "pragmatist"]
Stance = Literal["support", "attack", "reframe", "summary"]


# ----------------------------------------------------------------- brains
class Brain(BaseModel):
    id: str
    name: str
    kind: str = "domain"
    color: str = "#7aa2f7"
    source: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    persona: Optional[str] = None
    chunk_count: int = 0
    created_at: str


class IngestRequest(BaseModel):
    name: str
    text: Optional[str] = None          # paste box
    kind: str = "domain"
    color: Optional[str] = None


class IngestResult(BaseModel):
    brain: Brain
    chunks: int
    clusters: int
    seconds: float


# ------------------------------------------------------------------ graph
class GraphNode(BaseModel):
    id: str
    # `idea` is a first-class node type, NOT a chunk. Agents cannot cite it —
    # that separation is the whole reason it lives in its own collection.
    level: Literal["brain", "cluster", "chunk", "idea"]
    label: str
    brain_id: str
    color: str
    x: float
    y: float
    z: float
    size: float = 1.0
    preview: Optional[str] = None       # hover card text
    source_path: Optional[str] = None


class GraphLink(BaseModel):
    source: str
    target: str
    # cooccur = 这两个点在同一场辩论里被一起用过，weight 是场次数
    # seed    = 这个想法开出了那场辩论
    kind: Literal["contains", "similar", "hit", "citation", "cooccur", "seed"] = "contains"
    weight: float = 1.0


class GraphResponse(BaseModel):
    level: Literal["brain", "cluster", "chunk"]
    nodes: list[GraphNode]
    links: list[GraphLink]
    total_chunks: int


# ------------------------------------------------------------------- idea
class Skeleton(BaseModel):
    """The domain-stripped problem skeleton. This is what we retrieve WITH."""
    object: str = ""
    constraint: str = ""
    mechanism: str = ""
    motivation: str = ""
    keywords: list[str] = Field(default_factory=list)


class Hit(BaseModel):
    chunk_id: str
    brain_id: str
    brain_name: str
    score: float           # raw cosine similarity
    band_score: float      # closeness to the target band centre (ranking key)
    text: str
    source_path: Optional[str] = None


# An idea is a NODE TYPE OF ITS OWN, deliberately not a chunk:
#   * 碎片 (chunks) come from the user's notes and are the ONLY thing an agent may
#     cite. Ideas are never in the retrieval corpus, so an agent can never quote a
#     user's own idea back at them as if it were evidence.
#   * Agents may still READ ideas as raw material (a seed motion, or overnight
#     material) and recombine them into something new — they just cannot cite one.
IdeaOrigin = Literal["user", "agent"]
IdeaKind = Literal["eureka", "motion", "proposal"]
# inbox  = 等用户裁决（只有 agent 提案会停在这里，不进星图）
# kept   = 用户认可，进星图
# trashed = 弃稿箱，可恢复
IdeaStatus = Literal["inbox", "kept", "trashed"]


class IdeaImage(BaseModel):
    path: str                 # relative to DATA_DIR; served by GET /api/ideas/{id}/image
    caption: str = ""


class IdeaSource(BaseModel):
    """Only on agent proposals: exactly which two 碎片 the night pulled together.
    Keeping it lets 「换一种说法」 rephrase the SAME pairing instead of re-rolling."""
    strategy: Literal["unconnected", "cold"] = "unconnected"
    chunk_ids: list[str] = Field(default_factory=list)
    brain_ids: list[str] = Field(default_factory=list)
    quotes: list[str] = Field(default_factory=list)
    brain_names: list[str] = Field(default_factory=list)
    why: str = ""             # one line: why the night thought this was worth asking
    score: float = 0.0


class IdeaCreate(BaseModel):
    text: str = ""
    kind: IdeaKind = "eureka"
    brain_id: Optional[str] = None       # None = 未归档，浮在星图中心
    image_data_url: Optional[str] = None  # data:image/...;base64,... (client downscales)
    image_caption: str = ""


class IdeaPatch(BaseModel):
    text: Optional[str] = None
    brain_id: Optional[str] = None
    status: Optional[IdeaStatus] = None
    image_caption: Optional[str] = None


class Idea(BaseModel):
    id: str
    text: str
    origin: IdeaOrigin = "user"
    kind: IdeaKind = "eureka"
    status: IdeaStatus = "kept"
    brain_id: Optional[str] = None
    brain_name: Optional[str] = None      # live JOIN, not stored
    image: Optional[IdeaImage] = None
    enrichment: str = "pending"           # pending | ready | failed (skeleton + hits)
    skeleton: Optional[Skeleton] = None
    hits: list[Hit] = Field(default_factory=list)
    source: Optional[IdeaSource] = None   # agent proposals only
    debate_id: Optional[str] = None       # set once this idea has been to court
    created_at: str


# ----------------------------------------------------------------- debate
class DebateConfig(BaseModel):
    wildness: float = 0.5          # 0=保守 1=疯狂 — moves the similarity band centre
    max_rounds: int = 6
    token_budget: int = 60_000     # hard stop
    min_brains: int = 2            # a card must span >= this many brains
    novelty_threshold: float = 0.15  # reject a claim if novelty < this (i.e. 复读)
    require_attack_per_round: bool = True
    mode: Literal["live", "dream"] = "live"


class Claim(BaseModel):
    id: str
    role: Role
    brain_id: Optional[str] = None
    text: str
    stance: Stance
    status: Literal["live", "refuted", "accepted"] = "live"
    citations: list[str] = Field(default_factory=list)
    round: int = 0


class Blackboard(BaseModel):
    """The ONLY shared state. Agents never see the raw transcript.

    Keeping this bounded is what makes per-turn context O(1) in round count.
    """
    motion: str = ""
    round: int = 0
    claims: list[Claim] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    agreements: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    digest: str = ""               # moderator's compaction of everything older


class Turn(BaseModel):
    id: str
    debate_id: str
    round: int
    seq: int
    role: Role
    brain_id: Optional[str] = None
    brain_name: Optional[str] = None
    stance: Optional[Stance] = None
    claim: Optional[str] = None
    body: str = ""
    citations: list[str] = Field(default_factory=list)
    attacks: list[str] = Field(default_factory=list)
    novelty: Optional[float] = None
    rejected: bool = False
    tokens: int = 0
    created_at: str


class DebateCreate(BaseModel):
    idea_id: Optional[str] = None
    motion: Optional[str] = None      # skip seed selection and force a motion
    config: DebateConfig = Field(default_factory=DebateConfig)


class Debate(BaseModel):
    id: str
    idea_id: Optional[str]
    motion: str
    status: str
    mode: str
    config: DebateConfig
    blackboard: Blackboard
    tokens_used: int
    created_at: str
    ended_at: Optional[str] = None


# ------------------------------------------------------------------- card
class Connection(BaseModel):
    chunk_id: str
    brain_id: str
    brain_name: str
    quote: str
    source_path: Optional[str] = None


class Scores(BaseModel):
    surprise: float = 0.0      # embedding distance between the connected fragments
    credibility: float = 0.0   # number of supporting citations, normalised
    feasibility: float = 0.0   # overlap with the user's own skill/resource tags
    total: float = 0.0


class Card(BaseModel):
    id: str
    debate_id: Optional[str]
    connection: list[Connection]
    idea: str
    why_you: str
    next_action: str
    scores: Scores
    saved: bool = False
    created_at: str


# ------------------------------------------------------------------ night
class NightPrefs(BaseModel):
    """夜间发现的偏好。存在 settings 集合的 "night" 键下。

    mode 是这个产品的立场开关：
      auto    「自动开庭」—— 它们自己找题、自己吵完，早上你看结果。
      suggest 「只递给我」—— 它们照样想 n 个，但一场都不开，等你点头。
    """
    mode: Literal["auto", "suggest"] = "suggest"
    ideas_per_night: int = Field(default=3, ge=1, le=10)
    hour: int = Field(default=3, ge=0, le=23)      # local hour
    enabled: bool = True
    token_budget: int = 200_000     # hard cap across the WHOLE night, not per debate
    wildness: float = 0.55
    last_run: Optional[str] = None          # ISO date, so a day runs at most once
    last_summary: Optional[str] = None


class NightStatus(BaseModel):
    prefs: NightPrefs
    running: bool = False
    inbox: int = 0
    trashed: int = 0
    next_run: Optional[str] = None


# --------------------------------------------------------------- settings
class ProviderConfig(BaseModel):
    """BYOK. Stored in the local MongoDB `settings` collection; never leaves the machine."""
    id: str                     # user-chosen label, e.g. "my-openai"
    kind: Literal["openai_compat", "anthropic", "ollama", "mock"] = "openai_compat"
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    chat_model: str = "gpt-4o-mini"
    embed_model: Optional[str] = None
    note: Optional[str] = None


class SettingsPayload(BaseModel):
    providers: list[ProviderConfig] = Field(default_factory=list)
    default_chat: Optional[str] = None
    default_embed: Optional[str] = None
    moderator_provider: Optional[str] = None   # cheap tier for compaction


# ------------------------------------------------------------ SSE events
class Event(BaseModel):
    """Everything the frontend needs arrives through this one envelope."""
    type: Literal[
        "debate.started", "round.started", "turn.streaming", "turn.done",
        "turn.rejected", "blackboard.updated", "card.created",
        "debate.ended", "error", "ping",
    ]
    data: dict[str, Any] = Field(default_factory=dict)
