"""All prompts live here. One file, so tuning is one agent's job and one diff.

Style rules baked into every role prompt (they are what make the transcript
watchable on stage rather than LLM oatmeal):
  * 每次发言 <= 90 字，一个观点，说人话
  * 必须引用原文碎片编号 [F1] 形式
  * 禁止「我同意」「很好的观点」「总的来说」等空转句式
"""
from __future__ import annotations

from ..models import Blackboard, Skeleton
from .roles import ROLES

_STYLE = """输出纪律：
- 只输出 JSON，不要任何解释文字。
- body 不超过 90 个字，一次只说一个观点，口语化，像真人在会上讲话。
- 禁止出现："我同意"、"很好的观点"、"总的来说"、"综上所述"、"作为一个AI"。
- citations 里放你引用的碎片编号（如 ["F1","F3"]），没引用就不要编。
JSON 格式：
{"stance":"support|attack|reframe","claim":"一句话主张(<=40字)",
 "body":"你的发言","citations":["F1"],"attacks":["clm_xxx"]}"""


def role_system(role: str, brain_name: str | None, persona: str | None = None) -> str:
    r = ROLES[role]
    who = f"你代理用户的一个副脑：「{brain_name}」。" if brain_name else ""
    extra = f"\n补充人设：{persona}" if persona else ""
    return (
        f"role={role}\n你是一场「个人副脑圆桌」里的【{r['cn']}】。{who}\n"
        f"职责：{r['duty']}\n"
        f"硬约束（违反则本次发言作废）：{r['hard']}\n"
        f"你只代表这个副脑里的材料说话，不要泛泛而谈通用知识。{extra}\n\n{_STYLE}"
    )


def role_user(bb: Blackboard, fragments: list[tuple[str, str]], recent: list[str],
              notes: str, force_attack: bool = False, retry_reason: str = "") -> str:
    frag_block = "\n".join(f"[{tag}] 「{txt[:220]}」" for tag, txt in fragments) or "（无）"
    recent_block = "\n".join(recent[-2:]) or "（这是第一次发言）"
    parts = [
        "=== 黑板（共享状态，只读）===",
        bb_render(bb),
        "\n=== 你自己副脑里检索到的碎片（只有你能看到）===",
        frag_block,
        "\n=== 最近两次发言原文 ===",
        recent_block,
    ]
    if notes:
        parts += ["\n=== 你上一轮给自己的备忘 ===", notes]
    if force_attack:
        parts.append("\n【强制指令】本轮已经太和谐了。你必须 stance=attack，"
                     "指名攻击黑板上某一条 claim，并给出一个具体的失败场景。")
    if retry_reason:
        parts.append(f"\n【重来】你上一次的发言被判无效：{retry_reason}。换一个角度，别重复。")
    return "\n".join(parts)


def bb_render(bb: Blackboard) -> str:
    from .blackboard import render
    return render(bb)


# ------------------------------------------------------------------ motion
MOTION_SYSTEM = """你是圆桌主持人。给定用户的一句碎念、它的问题骨架，以及从用户不同
副脑里检索到的几条远距离碎片，请拟一个"可被证伪的辩题"。
好的辩题形如：「把 A 领域的<机制> 搬到 B 领域的<约束> 上，是可行/值得的」。
坏的辩题：太空泛、无法反对、只是一个问句。
只输出 JSON：{"motion":"辩题(<=45字)","why":"为什么这两个副脑值得碰(<=40字)"}"""


def motion_user(spark_text: str, sk: Skeleton, hits) -> str:
    frags = "\n".join(
        f"[{h.brain_name}] 「{h.text[:180]}」(相似度 {h.score:.2f})" for h in hits[:6]
    )
    return (f"碎念：「{spark_text}」\n"
            f"骨架：对象={sk.object} 约束={sk.constraint} 机制={sk.mechanism} 动机={sk.motivation}\n"
            f"跨副脑碎片：\n{frags}")


# ------------------------------------------------------------------- cards
CARD_SYSTEM = """CARD WRITER。你是记录员，不是创作者。
你只能把辩论中已经出现的材料写成 1-3 张"想法卡片"，不得引入任何新点子。
每张卡片必须至少连接 2 个不同副脑的碎片。
"why_you" 是灵魂：写清楚为什么这件事只有这个用户能做——引用他自己的经历/资源，
不要写"你有热情""你很擅长"这种空话。
"next_action" 必须是本周内、2 小时以内能做完的一件具体的事。
只输出 JSON：
{"cards":[{"connection":["F1","F4"],"idea":"一句话","why_you":"...","next_action":"..."}]}"""


def card_user(bb: Blackboard, fragments: list[tuple[str, str]], transcript: str) -> str:
    frag_block = "\n".join(f"[{t}] 「{x[:200]}」" for t, x in fragments)
    return (f"辩题：{bb.motion}\n\n黑板终态：\n{bb_render(bb)}\n\n"
            f"可用碎片：\n{frag_block}\n\n辩论要点：\n{transcript[:2500]}")
