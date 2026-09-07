"""Resolves a provider id -> live Provider instance, with graceful degradation.

Rules (they matter on stage):
  * WEAVE_OFFLINE=1            -> everything is MockProvider, no network at all.
  * unknown / unconfigured id  -> MockProvider, and we log it. Never a 500.
  * a brain with provider=None -> default_chat provider.
"""
from __future__ import annotations

import logging

from ..config import OFFLINE
from ..db import get, upsert_id
from ..models import ProviderConfig, SettingsPayload
from .base import MockProvider, Provider
from .remote import AnthropicProvider, OpenAICompatProvider

log = logging.getLogger("weave.providers")
_CACHE: dict[str, Provider] = {}
_MOCK = MockProvider()

_SETTINGS_KEY = "providers"


def load_settings() -> SettingsPayload:
    row = get("settings", _SETTINGS_KEY)
    if not row:
        return SettingsPayload()
    return SettingsPayload(**(row.get("value") or {}))


def save_settings(p: SettingsPayload) -> None:
    upsert_id("settings", _SETTINGS_KEY, {"value": p.model_dump()})
    _CACHE.clear()


def _build(cfg: ProviderConfig) -> Provider:
    if cfg.kind == "anthropic":
        return AnthropicProvider(cfg)
    if cfg.kind == "mock":
        return _MOCK
    return OpenAICompatProvider(cfg)


def get_provider(pid: str | None = None) -> Provider:
    if OFFLINE:
        return _MOCK
    s = load_settings()
    pid = pid or s.default_chat
    if not pid:
        return _MOCK
    if pid in _CACHE:
        return _CACHE[pid]
    cfg = next((c for c in s.providers if c.id == pid), None)
    if cfg is None:
        log.warning("provider %s not configured — falling back to mock", pid)
        return _MOCK
    _CACHE[pid] = _build(cfg)
    return _CACHE[pid]


def get_embedder() -> Provider:
    if OFFLINE:
        return _MOCK
    s = load_settings()
    return get_provider(s.default_embed or s.default_chat)


def get_moderator() -> Provider:
    """Cheap tier. Compaction runs every round; do not burn the good model on it."""
    if OFFLINE:
        return _MOCK
    s = load_settings()
    return get_provider(s.moderator_provider or s.default_chat)


def is_mock(p: Provider) -> bool:
    return isinstance(p, MockProvider)
