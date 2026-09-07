"""Abstraction step: eureka fragment -> domain-stripped 问题骨架.

Why this exists: if you retrieve with the raw words, you get the same domain
back ("给医生排班" finds more notes about hospitals). Strip the domain nouns
and you retrieve by *structure* — "在资源冲突下做公平分配" finds your notes on
airline overbooking, on tournament seeding, on splitting rent. That structural
match is the whole product.
"""
from __future__ import annotations

import re

from ..models import Skeleton
from ..providers import get_provider

SYSTEM = """SKELETON EXTRACTOR.
把用户的一句碎念抽象成"问题骨架"，必须剥掉一切领域专有名词（人名、行业、
工具、产品名），只保留结构。
只输出 JSON：
{"object":"被处理的对象（抽象）","constraint":"限制条件","mechanism":"起作用的机制",
 "motivation":"深层动机","keywords":["3-6个抽象词"]}
反例：不要写"医生排班"，要写"在资源冲突下做公平分配"。"""

_STOP = set("的了是在和与我你他它这那有就都很also the a an of to and is are for on with".split())


def _fallback(text: str) -> Skeleton:
    """No key / offline: still produce something usable."""
    words = [w for w in re.split(r"[\s,，。;；、/]+", text) if w and w not in _STOP]
    return Skeleton(object=text[:24], constraint="", mechanism="", motivation="",
                    keywords=words[:6])


async def extract_skeleton(text: str, provider_id: str | None = None) -> Skeleton:
    p = get_provider(provider_id)
    try:
        res = await p.chat(SYSTEM, f"碎念：「{text}」", max_tokens=250,
                           temperature=0.3, json_mode=True)
        d = res.json()
        if not d:
            return _fallback(text)
        return Skeleton(
            object=str(d.get("object", ""))[:80],
            constraint=str(d.get("constraint", ""))[:80],
            mechanism=str(d.get("mechanism", ""))[:80],
            motivation=str(d.get("motivation", ""))[:80],
            keywords=[str(k)[:20] for k in (d.get("keywords") or [])][:6],
        )
    except Exception:  # noqa: BLE001
        return _fallback(text)


def skeleton_query(sk: Skeleton, original: str) -> str:
    """What we actually embed. Skeleton dominates; original keeps a little grounding."""
    parts = [sk.object, sk.constraint, sk.mechanism, sk.motivation, " ".join(sk.keywords)]
    return " ".join([p for p in parts if p]) + " " + original[:40]
