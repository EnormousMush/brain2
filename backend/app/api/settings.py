"""BYOK settings + the privacy surface.

Keys live in the local MongoDB `settings` collection and are used only against
the base_url the user typed. `GET` never returns a key — it returns whether one
is set. The delete endpoint is real: it drops every user-data collection.
Demo it live.
"""
from __future__ import annotations

from fastapi import APIRouter

from ..config import MONGO_DB, MONGO_URI, OFFLINE
from ..db import backend, wipe_all
from ..models import SettingsPayload
from ..providers import load_settings, save_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings():
    s = load_settings()
    return {
        "offline": OFFLINE,
        "default_chat": s.default_chat,
        "default_embed": s.default_embed,
        "moderator_provider": s.moderator_provider,
        "providers": [
            {**p.model_dump(exclude={"api_key"}), "has_key": bool(p.api_key)}
            for p in s.providers
        ],
    }


@router.put("")
def put_settings(payload: SettingsPayload):
    """Blank api_key on an existing provider id = keep the stored key."""
    old = {p.id: p for p in load_settings().providers}
    for p in payload.providers:
        if not p.api_key and p.id in old:
            p.api_key = old[p.id].api_key
    save_settings(payload)
    return get_settings()


privacy = APIRouter(prefix="/api/privacy", tags=["privacy"])


@privacy.get("")
def privacy_info():
    be = backend()
    return {
        "storage": f"MongoDB · {MONGO_URI} · db={MONGO_DB}" if be == "mongodb"
                   else "内存（MongoDB 未连接，重启即清空）",
        "backend": be,
        "statements": [
            "所有笔记、向量、辩论记录只写在你本机（或你自己指定）的 MongoDB 里。",
            "我们没有服务器，没有账号，不上传，不训练。",
            "模型调用用的是你自己填的 API Key，直连你指定的 base_url。",
            "离线模式 (WEAVE_OFFLINE=1) 下全程不联网。",
            "「删除我的副脑」= 删除全部笔记 / 向量 / 辩论 / 卡片集合，不可恢复。",
        ],
    }


@privacy.delete("/all")
def delete_everything():
    return {"ok": True, "deleted": wipe_all()}
