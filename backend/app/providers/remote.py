"""Real providers. Two shapes cover everything we need:

  openai_compat — OpenAI, DeepSeek, Moonshot/Kimi, 通义 DashScope-compat,
                  SiliconFlow, ModelScope inference, vLLM, Ollama (/v1), ...
  anthropic     — Claude Messages API

Both take base_url + api_key from the user's own settings.
"""
from __future__ import annotations

import numpy as np
import httpx

from .base import ChatResult, Provider


class OpenAICompatProvider(Provider):
    def __init__(self, cfg):
        self.id = cfg.id
        self.base = (cfg.base_url or "https://api.openai.com/v1").rstrip("/")
        self.key = cfg.api_key or ""
        self.chat_model = cfg.chat_model
        self.embed_model = cfg.embed_model or "text-embedding-3-small"
        self._c = httpx.AsyncClient(timeout=90)

    @property
    def _h(self):
        return {"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}

    async def chat(self, system, user, *, max_tokens=900, temperature=0.9,
                   json_mode=False) -> ChatResult:
        body = {
            "model": self.chat_model,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        r = await self._c.post(f"{self.base}/chat/completions", headers=self._h, json=body)
        r.raise_for_status()
        d = r.json()
        return ChatResult(
            d["choices"][0]["message"]["content"] or "",
            tokens=(d.get("usage") or {}).get("total_tokens", 0),
        )

    async def embed(self, texts: list[str]) -> np.ndarray:
        vecs: list[list[float]] = []
        for i in range(0, len(texts), 64):        # batch — most endpoints cap ~2048
            r = await self._c.post(
                f"{self.base}/embeddings", headers=self._h,
                json={"model": self.embed_model, "input": texts[i : i + 64]},
            )
            r.raise_for_status()
            vecs += [d["embedding"] for d in r.json()["data"]]
        a = np.asarray(vecs, dtype="float32")
        return a / np.clip(np.linalg.norm(a, axis=1, keepdims=True), 1e-6, None)

    async def close(self):
        await self._c.aclose()


class AnthropicProvider(Provider):
    """Chat only. Anthropic has no embeddings endpoint — bind embeddings to an
    openai_compat provider (bge-m3 / Qwen3-Embedding on ModelScope works)."""

    def __init__(self, cfg):
        self.id = cfg.id
        self.base = (cfg.base_url or "https://api.anthropic.com/v1").rstrip("/")
        self.key = cfg.api_key or ""
        self.chat_model = cfg.chat_model or "claude-sonnet-4-20250514"
        self._c = httpx.AsyncClient(timeout=90)

    async def chat(self, system, user, *, max_tokens=900, temperature=0.9,
                   json_mode=False) -> ChatResult:
        r = await self._c.post(
            f"{self.base}/messages",
            headers={"x-api-key": self.key, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={"model": self.chat_model, "system": system, "max_tokens": max_tokens,
                  "temperature": temperature,
                  "messages": [{"role": "user", "content": user}]},
        )
        r.raise_for_status()
        d = r.json()
        text = "".join(b.get("text", "") for b in d.get("content", []))
        u = d.get("usage") or {}
        return ChatResult(text, tokens=u.get("input_tokens", 0) + u.get("output_tokens", 0))

    async def embed(self, texts):
        raise NotImplementedError("bind an openai_compat provider for embeddings")

    async def close(self):
        await self._c.aclose()
