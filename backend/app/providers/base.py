"""Provider abstraction — BYOK.

The app ships with NO keys. The user pastes their own into Settings; they are
stored in the local MongoDB `settings` collection and used only to call the endpoint they name.
Every provider implements the same two calls, so a 副脑 can be bound to any
vendor and the debate engine does not care which.
"""
from __future__ import annotations

import hashlib
import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np

from ..config import EMBED_DIM


@dataclass
class ChatResult:
    text: str
    tokens: int = 0

    def json(self) -> dict:
        """Tolerant JSON extraction — models wrap JSON in prose or fences."""
        s = self.text.strip()
        m = re.search(r"```(?:json)?\s*(.*?)```", s, re.S)
        if m:
            s = m.group(1).strip()
        start, end = s.find("{"), s.rfind("}")
        if start != -1 and end > start:
            s = s[start : end + 1]
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            return {}


class Provider(ABC):
    id: str = "base"

    @abstractmethod
    async def chat(
        self, system: str, user: str, *, max_tokens: int = 900,
        temperature: float = 0.9, json_mode: bool = False,
    ) -> ChatResult: ...

    @abstractmethod
    async def embed(self, texts: list[str]) -> np.ndarray: ...

    async def close(self) -> None:  # pragma: no cover
        return None


# --------------------------------------------------------------------- mock
_ROLE_LINES = {
    "proposer": ("support", "把 {a} 里那套做法直接搬到 {b} 上，先做最小的一版。"),
    "analogist": ("reframe", "{a} 和 {b} 其实是同一个结构问题，只是换了名词。"),
    "skeptic": ("attack", "这个做法在 {b} 上会崩，因为 {a} 的前提在这里不成立。"),
    "pragmatist": ("support", "你手上已经有 {a} 的材料，两天能搭出 {b} 的原型。"),
    "moderator": ("summary", "本轮争议集中在 {a} 与 {b} 是否可迁移。"),
}


class MockProvider(Provider):
    """Deterministic, offline, free. Powers WEAVE_OFFLINE=1 stage fallback
    and every unit test. Embeddings are hashed char-trigrams — not semantic,
    but stable and similarity-shaped enough to exercise the whole pipeline."""

    id = "mock"

    async def chat(self, system, user, *, max_tokens=900, temperature=0.9,
                   json_mode=False) -> ChatResult:
        role = "moderator"
        for r in _ROLE_LINES:
            if f"role={r}" in system or r in system[:80]:
                role = r
                break
        seed = int(hashlib.sha1((system + user).encode()).hexdigest()[:8], 16)
        # prefer the [副脑] labels the prompts attach; fall back to quoted fragments
        labels = []
        for lb in re.findall(r"\[([^\[\]\n]{1,24})\] 「", user):
            if lb not in labels and not re.fullmatch(r"[A-Za-z]{0,3}F\d+", lb):   # [F1] is a fragment tag, not a brain
                labels.append(lb)
        frags = re.findall(r"「(.+?)」", user)[:2] or ["这段笔记", "另一段笔记"]
        if len(labels) >= 2:
            a, b = labels[0][:18], labels[1][:18]
        else:
            a, b = frags[0][:18], (frags[1] if len(frags) > 1 else frags[0])[:18]
        tags = re.findall(r"\[([A-Za-z]{0,3}F\d+)\]", user)
        stance, tmpl = _ROLE_LINES[role]
        claim = tmpl.format(a=a, b=b)
        # an attacker names a claim that is really on the blackboard, so the
        # transcript can draw who refuted whom even offline
        claims = re.findall(r"\[(clm_[0-9a-f]+)\]", user)
        attacks = [claims[-1]] if stance in ("attack", "reframe") and claims else []
        payload = {
            "stance": stance,
            "claim": f"{claim}#{seed % 997}",
            "body": claim + f"（mock#{seed % 997}）具体说：这条路径的关键在于把约束而不是名词对齐。",
            "citations": tags[:1],
            "attacks": attacks,
        }
        if "LABEL" in system:
            payload = {"label": (a or "主题")[:6], "summary": f"关于{a}的一组笔记"}
        elif "SKELETON" in system:
            payload = {"object": a, "constraint": "资源有限", "mechanism": "重新分配",
                       "motivation": "省时间", "keywords": [a, b]}
        elif "PROPOSAL" in system:
            # 夜间发现的离线版本。要的是"每一对看起来都不一样"，否则 WEAVE_OFFLINE=1
            # 的演示里 n 条提案会长得一模一样，机制就看不出来了。
            shape = ["把「{a}」的做法搬到「{b}」的约束上是值得的",
                     "「{a}」和「{b}」其实在解同一个分配问题",
                     "「{b}」缺的那一步，「{a}」里已经有现成的了",
                     "如果把「{a}」当成一种约束设计，「{b}」应该照抄"][seed % 4]
            payload = {"motion": shape.format(a=a, b=b),
                       "why": f"两边都在处理「{a[:8]}」这类结构，但从没被放在一起看过"}
        elif "CARD" in system:
            pair = tags[:1] + [t for t in tags if t[:2] != tags[0][:2]][:1] if tags else []
            payload = {"cards": [{
                "connection": pair,
                "idea": f"用 {a} 的机制去做 {b}",
                "why_you": f"你已经写过 {a}，也收藏过 {b}",
                "next_action": "本周把两段笔记并排读一遍，写 200 字草案",
            }]}
        return ChatResult(json.dumps(payload, ensure_ascii=False), tokens=len(user) // 3)

    async def embed(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), EMBED_DIM), dtype="float32")
        for i, t in enumerate(texts):
            t = (t or "").lower()
            for j in range(max(len(t) - 2, 1)):
                g = t[j : j + 3]
                h = int(hashlib.md5(g.encode()).hexdigest()[:8], 16)
                out[i, h % EMBED_DIM] += 1.0
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        return out / np.clip(norms, 1e-6, None)
