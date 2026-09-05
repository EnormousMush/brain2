from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..db import brain_map, find, get, insert, nid, now, update_id
from ..debate.engine import run_debate
from ..models import (Blackboard, Card, Connection, Debate, DebateConfig,
                      DebateCreate, Scores, Turn)

router = APIRouter(prefix="/api/debates", tags=["debates"])


def _to_debate(d: dict) -> Debate:
    return Debate(
        id=d["id"], idea_id=d.get("idea_id"), motion=d.get("motion") or "",
        status=d["status"], mode=d.get("mode", "live"),
        config=DebateConfig(**(d.get("config") or {})),
        blackboard=Blackboard(**(d.get("blackboard") or {})),
        tokens_used=int(d.get("tokens_used") or 0), created_at=d["created_at"],
        ended_at=d.get("ended_at"),
    )


@router.post("", response_model=Debate, status_code=201)
def create_debate(body: DebateCreate):
    did = nid("dbt")
    insert("debates", dict(
        id=did, idea_id=body.idea_id, motion=body.motion, status="pending",
        config=body.config.model_dump(),
        blackboard=Blackboard(motion=body.motion or "").model_dump(),
        tokens_used=0, mode=body.config.mode, created_at=now(), ended_at=None,
    ))
    if body.idea_id:
        update_id("ideas", body.idea_id, {"debate_id": did})
    return _to_debate(get("debates", did))


@router.get("", response_model=list[Debate])
def list_debates(limit: int = 20):
    return [_to_debate(d) for d in find("debates", sort=[("created_at", -1)], limit=limit)]


@router.get("/{debate_id}", response_model=Debate)
def get_debate(debate_id: str):
    d = get("debates", debate_id)
    if not d:
        raise HTTPException(404, "no such debate")
    return _to_debate(d)


@router.get("/{debate_id}/stream")
async def stream(debate_id: str):
    """SSE. One event per line-pair: `event: <type>` then `data: <json>`.

    The frontend renders turns as they arrive — the debate IS the demo, so it
    must never appear as a spinner followed by a wall of text.
    """
    async def gen():
        yield "retry: 3000\n\n"
        try:
            async for ev in run_debate(debate_id):
                yield f"event: {ev.type}\ndata: {json.dumps(ev.data, ensure_ascii=False)}\n\n"
        except asyncio.CancelledError:
            update_id("debates", debate_id, {"status": "stopped"})
            raise
        except Exception as e:  # noqa: BLE001
            update_id("debates", debate_id, {"status": "failed"})
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })


@router.get("/{debate_id}/turns", response_model=list[Turn])
def turns(debate_id: str, include_rejected: bool = False):
    flt: dict = {"debate_id": debate_id}
    if not include_rejected:
        flt["rejected"] = False
    bm = brain_map()
    out = []
    for r in find("turns", flt, sort=[("seq", 1)]):
        base = {k: r.get(k) for k in Turn.model_fields if k in r}
        base["citations"] = r.get("citations") or []
        base["attacks"] = r.get("attacks") or []
        base["rejected"] = bool(r.get("rejected"))
        base["body"] = r.get("body") or ""
        # live JOIN: brain may have been renamed since the turn was spoken
        base["brain_name"] = bm.get(r.get("brain_id") or "", {}).get("name", r.get("brain_name"))
        out.append(Turn(**base))
    return out


@router.get("/{debate_id}/cards", response_model=list[Card])
def cards(debate_id: str):
    return [_to_card(d) for d in
            find("cards", {"debate_id": debate_id}, sort=[("created_at", 1)])]


def _to_card(d: dict) -> Card:
    return Card(id=d["id"], debate_id=d.get("debate_id"),
                connection=[Connection(**c) for c in (d.get("connection") or [])],
                idea=d.get("idea") or "", why_you=d.get("why_you") or "",
                next_action=d.get("next_action") or "",
                scores=Scores(**(d.get("scores") or {})), saved=bool(d.get("saved")),
                created_at=d["created_at"])


cards_router = APIRouter(prefix="/api/cards", tags=["cards"])


@cards_router.get("", response_model=list[Card])
def all_cards(limit: int = 50):
    return [_to_card(d) for d in find("cards", sort=[("created_at", -1)], limit=limit)]


@cards_router.post("/{card_id}/save", response_model=Card)
def save_card(card_id: str, saved: bool = True):
    """采纳率 — the one honest quality metric we can quote to the judges."""
    d = get("cards", card_id)
    if not d:
        raise HTTPException(404, "no such card")
    update_id("cards", card_id, {"saved": bool(saved)})
    return _to_card(get("cards", card_id))
