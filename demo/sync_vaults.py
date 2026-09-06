"""Copy Frank's local vaults into demo/seed_notes so the whole team builds the
same library. Run on the machine that has the vaults:

    python3 demo/sync_vaults.py

What it does NOT copy: the 03-人 folder (real people), account/inbox/config
files, and it redacts e-mail addresses and phone numbers everywhere.
"""
from __future__ import annotations
import os, re, shutil
from pathlib import Path

HOME = Path(os.getenv("WEAVE_DEMO_HOME", str(Path.home())))
DEV = HOME / "Developer"
OUT = Path(__file__).resolve().parent / "seed_notes"
SKIP_NAMES = {"CLAUDE.md", "inbox.md", "pending.md", "how-this-works.md", "账号.md", "飞书清单.md",
              "setup-brain-me.sh", "_readme.md", "_standard.md", "交接与复盘指引.md"}
FRONT = re.compile(r"^---\n.*?\n---\n", re.S)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?<!\d)(\+?\d[\d\s-]{8,}\d)(?!\d)")

SOURCES = {
    "我·档案":           [DEV / "brain_me" / "01-我是谁", DEV / "brain_me" / "02-经历"],
    "机会·申请与规划":   [DEV / "brain_me" / "04-机会"],
    "研究·AI 音乐检测":  [DEV / "brain_ai_base"],
    "研究·荣誉论文":     [DEV / "brain_honors-thesis"],
    "写作·Manifesto":    [DEV / "brain_manifesto"],
    "项目·Synesthesia":  [HOME / "seeingmusic" / "docs", HOME / "seeingmusic" / "README.md"],
    "产品·副脑":         [HOME / "Desktop" / "副脑群平台_ProjectStatement_v0.2.md",
                          Path(__file__).resolve().parents[1] / "DEVELOPER_MANUAL.md"],
}

def clean(text: str) -> str:
    text = FRONT.sub("", text, count=1)
    text = EMAIL.sub("[email]", text)
    text = PHONE.sub("[phone]", text)
    return text.strip() + "\n"

def files(src: Path):
    if src.is_file():
        yield src, src.name
        return
    for f in sorted(src.rglob("*.md")):
        if any(p.startswith(".") for p in f.parts) or f.name in SKIP_NAMES or f.name.startswith("怎么记"):
            continue
        yield f, str(f.relative_to(src))

for name, srcs in SOURCES.items():
    dst = OUT / name
    if dst.exists():
        shutil.rmtree(dst)
    n = 0
    for src in srcs:
        if not src.exists():
            print(f"  missing: {src}")
            continue
        for f, rel in files(src):
            text = clean(f.read_text(encoding="utf-8", errors="ignore"))
            if len(text) < 40:
                continue
            target = dst / (rel if len(srcs) == 1 or src.is_file() else f"{src.name}/{rel}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding="utf-8")
            n += 1
    print(f"- {name}: {n} files")
