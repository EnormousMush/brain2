# Weave · 副脑 — Developer Manual

> 一站式搭建、管理、维护、Agent 化「副脑群」的平台。
> 本手册是三个开发 agent 的共同契约。**改接口 = 改这份文档 + 通知另外两人**。

**代号**：Weave（对外）/ 副脑（内部）
**赛道**：织域·Weave 全域（开放）赛道
**提交**：9/6 上午 · 路演：9/6 下午 → **实际开发窗口 ≤ 16 小时**
**一句话定位**：*我们不让 AI 想点子，我们让 AI 只能用你自己的碎片拼点子。*

---

## 0. 三十秒读懂这个系统

```
                    ┌──────────────────────────────────────────┐
   你的笔记 ──导入──▶│  副脑群 (brains × clusters × chunks)      │
                    │  每个副脑 = 一个可检索知识库 + 一个代理它的 agent │
                    └───────────────┬──────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  【M1 Eureka】               【M2 副脑辩论】              【M3 知识群可视化】
  随手一句话                  抽骨架 → 反相似度检索          三级语义缩放星图
  ↓ 不阻塞                    → 绑定 4 个固定 role          坐标钉死、可空间记忆
  抽"问题骨架"                 → 黑板式多轮辩论              激活态高亮：命中/引用
  （剥掉领域名词）              → 结算成想法卡片               点击回放一条连接
```

**三个模块的分工就是三个 agent 的分工**（§8）。三者通过 `backend/app/models.py`
和 `frontend/src/types.ts` 这一对镜像文件对齐，其他一律不许跨模块直接读写。
数据库是 **MongoDB**（集合定义在 `backend/app/schema.py`），所有读写只经过 `backend/app/db.py`。

---

## 1. 立论：五句话，背下来

1. AI 不缺创意，缺的是**你**。通用模型给的点子和任何人都能做的点子没区别。
2. 值钱的 idea 是「只有你能做的那一个」——它长在你的经历、收藏、三年前写过
   又忘了的那句话上面。
3. 所以我们做的不是"生成"，是**受约束的重组**：每张卡片必须由你自己 ≥2 个不同
   副脑的原文碎片拼成，可点击溯源。
4. Notion AI / Mem 做的是「找到你要找的」；我们做的是「**找到你不知道该找的**」——
   机制上我们**主动排除最相似的结果**（§3.2）。
5. 一个人的脑子里本来就有好几个互相不服的声音。我们把它们分开、命名、
   让它们**当着你的面吵一架**。

---

## 2. 【M1】Eureka 模块 — 瞬时捕捉

### 2.0 捕捉和出题是两件事，不许合并

早期版本把「记一句话」和「开一场辩论」放在同一个顶栏输入框里。那是个产品级的
错误：**一个常驻的输入框会让整个产品读起来像"你问我答"**，而这套东西的全部意义
在于它自己会在星图里找题（§9）。所以：

| 界面 | 干什么 | 组件 |
|---|---|---|
| 灵光（右下角按钮） | 只负责记想法：文字 / 图片+说明 / 归到哪个副脑 | `Eureka.tsx` |
| 议题台（左侧导航） | 「我偏要它们吵这个」的入口，是例外不是主路径 | `DebateConsole.tsx` |

顶栏**没有输入框**。这是有意的，不要加回去。

### 2.1 它必须满足的唯一硬指标

**从按下快捷键到输入框获得焦点 < 100ms；从回车到窗口关闭 < 16ms 的感知。**
捕捉一旦有延迟，用户就不记了，整个产品的数据源就干涸了。所有 LLM 工作
一律异步。

### 2.2 三种想法（`ideas.kind`）

| kind | 来自 | 例子 | 归属 |
|---|---|---|---|
| `eureka` | 灵光窗口 | "排队论里的提前告知，其实是在卖确定感" | 用户当场选副脑，或不归档 |
| `motion` | 议题台「我来出题」 | "把乐队的默认规则搬到合租分工上" | 默认不归档，同样进星图 |
| `proposal` | 夜间 agent（§9） | agent 自己在星图里找到的题 | 停在收件箱，用户点头才进星图 |

图片：客户端先缩到长边 ≤1400 的 JPEG，`data:` URL 提交，后端解码写到
`DATA_DIR/idea_images/`，文档里只存相对路径（不要把 base64 塞进 Mongo 文档）。

### 2.3 数据流（见 `api/ideas.py`）

```
POST /api/ideas {text, kind, brain_id?, image_data_url?, image_caption?}
  └─ 201 立即返回 (enrichment=pending)     ← 前端乐观渲染，不等
  └─ layout_ideas()                        ← 立刻拿到星图坐标，先上图
  └─ BackgroundTask enrich(idea_id):
       1. extract_skeleton(text)           LLM，剥领域名词
       2. embed(skeleton_query(sk, text))  骨架为主 + 原话 40 字兜底
       3. analogical_search(...)           §3.[phone]. UPDATE enrichment='ready', skeleton, embedding, hits
       5. layout_ideas()                   ← 有了向量，挪到最像它的碎片旁边
前端 400ms 轮询 GET /api/ideas/{id} 直到 ready → 点亮星图
```

失败一律降级不报错：没有 key → `_fallback()` 用正则分词出关键词，照样能检索。

### 2.4 问题骨架（这是 M1 的技术核心，不是花架子）

```json
{"object":"抽象后的对象","constraint":"限制条件","mechanism":"起作用的机制",
 "motivation":"深层动机","keywords":["3-6个抽象词"]}
```

**为什么必须剥领域名词**：用原话检索"给医生排班"，命中的还是医院。抽成
"在资源冲突下做公平分配"，才会命中你笔记里的合租分房租、爵士乐队的默认规则。
**结构匹配才是跨界，词面匹配只是搜索。**

前端要把骨架显示出来（已实现）。这是路演时解释机制最省时间的一屏。

### 2.5 M1 验收清单

- [ ] `⌘K` / `Ctrl+K` 全局唤起灵光窗口，文本框已聚焦
- [ ] `⌘⏎` 提交后窗口立刻关闭，星图上立刻多一颗金色星
- [ ] 不归档的想法浮在星图正中的空处；归档的落在那个副脑外缘
- [ ] 粘贴一张截图能直接成为想法的配图
- [ ] 断网 / 无 key 时仍能记录，`enrichment` 走到 `ready`（走 fallback）
- [ ] ready 后星图自动飞向命中区域并高亮
- [ ] 骨架四栏正确显示，且明显不含原句里的领域名词
- [ ] 连续快速敲 10 条不丢、不卡、不重复

---

## 3. 【M2】副脑 Agent 辩论模块 — 系统的技术深度都在这里

### 3.1 为什么是"辩论"而不是"多轮总结"

多 agent 系统最常见的死法是**互相点头**：A 提议，B 说"很好的观点，我补充一点"，
C 说"同意以上"。观众一眼看穿，评委立刻扣技术分。
我们用**四条机械约束**解决，全部在代码里强制执行，不靠 prompt 祈祷。

### 3.2 类比检索：反相似度带（`retrieval/analogy.py`）

标准 RAG 取 top-k。top-k 按定义就是你**已经会联想到**的东西：同领域、同词面、
零惊喜。我们改三处：

```python
band_centre = lerp(0.55, 0.30, wildness)     # 保守 ←→ 疯狂，UI 上是一根滑杆
rank_key    = abs(cos_sim - band_centre)     # 排"离带中心多近"，不是排"多相似"
hard_drop   = cos_sim > 0.62                 # 太像 = 同一件事 = 废话，直接扔
```

再叠两层：

* **跨副脑轮转**：候选按副脑分组后 round-robin 取，保证结果集不可能是一个副脑
  自言自语。
* **MMR 重排**（λ=0.55）：结果集内部再去冗余。
* **硬约束**：结果集必须覆盖 ≥ `min_brains`（默认 2）个副脑，否则从候选里补。

> 这一段全程**不调 LLM**：毫秒级、免费、可复现、可审计。路演时可以当场拖滑杆，
> 卡片立刻变。这是最便宜的"看得见的机制"。

### 3.3 固定 role 表（`debate/roles.py`）

App 只固定 role，模型由用户自己填 key 决定（§6）。

| role | 中文 | 绑定哪个副脑 | 硬约束（违反则本次发言作废） |
|---|---|---|---|
| `moderator` | 主持人 | 不绑 · 走**便宜模型** | 禁止提出任何新观点，只归纳/点名/裁决 |
| `proposer` | 提案者 | 命中最强的副脑 | 每次必须引用自己副脑 ≥1 条原文，且给出下一步 |
| `analogist` | 类比者 | 与提案者**语义距离最远**的副脑 | 必须引入本轮尚未出现的领域，禁止重复已有类比 |
| `skeptic` | 怀疑者 | 与辩题**最不对齐**的副脑 | 禁止表达同意；每次必须给 1 个可证伪的失败场景并指名攻击某条 claim |
| `pragmatist` | 实践者 | 技能/资源标签最多的副脑 | 只能用用户已有资源；不得假设新预算/新团队 |

绑定是**确定性**的（由检索结果和 embedding 距离算出），不是随机分配——评委问
"为什么是这四个副脑"时你有答案。

### 3.4 四条反点头机制（全部已实现）

1. **输出 Schema 强制**：每次发言必须返回
   `{stance, claim, body, citations[], attacks[]}`，`stance ∈ {support, attack, reframe}`。
   `_valid()` 校验不过 → 重试一次 → 仍不过则记为 `rejected` 并**在 UI 上展示**。
2. **反对配额**：一轮内若还没有任何 `attack`，最后一位发言者被注入
   `【强制指令】本轮已经太和谐了` 并强制 `stance=attack`。
3. **新颖度过滤**：把 claim embed，与黑板上所有既有 claim 求最大余弦，
   `novelty = 1 - max_sim`。`novelty < 0.15` 判为**复读**，打回重说。
4. **禁用空转句式**：`"我同意"、"很好的观点"、"总的来说"、"综上所述"、"作为一个AI"`
   出现即作废。

> UI 上**要显示被打回的发言**（灰色 + 原因）。看得见的裁判，是"不是点头会"最直接
> 的证据，比任何解释都快。

### 3.5 黑板架构：长时间交流 + 保护 context window（`debate/blackboard.py`）

**Agent 永远看不到 transcript。** 每次发言的上下文固定由六块拼成：

| 块 | 上限 | 是否随轮数增长 |
|---|---|---|
| system（role 卡） | ~250 tok | 否 |
| 辩题 motion | ~60 tok | 否 |
| 黑板（digest + live claims） | **≤800 tok（压缩保证）** | **否** |
| 自己副脑的私有检索碎片 | ≤1200 tok | 否 |
| 最近 2 次发言原文 | ≤600 tok | 否 |
| 自己上轮的私有备忘 | ≤200 tok | 否 |
| **合计** | **≈3.1k tok / turn** | **O(1)** |

> **背下来这句话**：*我们的每轮成本是常数，不随轮数增长。30 轮辩论的成本是
> 30×3.1k，不是 Σ(1..30)×3.1k。* 这就是"长时间交流"能落地的原因。

黑板结构：

```jsonc
{
  "motion": "辩题",
  "round": 3,
  "claims": [{"id":"clm_x","role":"skeptic","text":"...","stance":"attack",
              "status":"live|refuted|accepted","citations":["chk_..."],"round":2}],
  "open_questions": [], "agreements": [], "resources": [],
  "digest": "主持人对更早内容的 ≤200 字压缩"
}
```

**压缩策略**：`live` claims 超过 12 条或 digest 超长时，主持人（便宜模型）把旧的
压进 digest，旧 claim 标 `accepted` 退场。压缩失败也不会中断辩论（兜底截断）。

### 3.6 成本与停机（三重保险）

| 机制 | 默认 | 位置 |
|---|---|---|
| 轮数上限 | `max_rounds=6` | `DebateConfig` |
| Token 硬预算 | `token_budget=60_000`，超了立即停 | `engine.run_debate` |
| 收敛早停 | 一轮内最大 novelty < 0.24 且 round≥2 → `converged` | 同上 |
| 分层模型 | moderator/压缩走 `moderator_provider`（便宜档） | `providers/registry.py` |
| 前端断流 | `useEffect` 返回 `stop()`，离开页面即关 SSE | `DebateTheater.tsx` |

「**夜里做梦**」已经落地了，见 §3.10。**这一段把产品从工具讲成主动的 agent，
一定要在 demo 里出现。**

### 3.7 结算：想法卡片（`debate/cards.py`）

LLM 在这一步是**记录员，不是作者**：只能重组已在桌面上的碎片，不得引入新点子。

```
连接：        [副脑A 的某条原文] × [副脑B 的某条原文]     ← 必须 ≥2 个不同副脑
点子：        一句话
为什么是你：   引用你自己的经历/资源，禁止"你有热情""你很擅长"这类空话
本周可做的一件事：2 小时内能做完的具体动作
```

打分（显示出来，评委爱看可量化）：

```
total = 0.45·惊喜度 + 0.30·可信度 + 0.25·可行性
惊喜度 = 被连接碎片间的平均 embedding 距离
可信度 = 这些碎片在辩论中被引用的次数（归一化）
可行性 = 卡片文本与用户自己 #标签 的重合度
```

**「为什么是你」这一栏是整个产品的灵魂。任何情况下不许折叠、不许省略。**

### 3.8 SSE 事件契约

`GET /api/debates/{id}/stream`，`text/event-stream`：

| event | data | 前端反应 |
|---|---|---|
| `debate.started` | `{debate_id, motion, roles[], hits[]}` | 渲染辩题与出场阵容 |
| `round.started` | `{round}` | HUD 轮次 +1 |
| `turn.done` | 完整 Turn 对象 | 追加一条发言；有 citations 就点亮星图 |
| `turn.rejected` | `{role, reason}` | 灰条展示"被判无效：复读" |
| `blackboard.updated` | Blackboard | 更新侧栏（可选） |
| `card.created` | Card | 卡片区推入 |
| `debate.ended` | `{reason, rounds, tokens, cards}` | 收尾，显示停机原因 |
| `error` | `{message}` | 提示 + 关流 |

### 3.9 M2 验收清单

- [ ] 4 个 role 全部至少发言一次，且每人绑定的副脑名字显示在 UI 上
- [ ] 一轮内必然出现至少 1 次 `stance=attack`
- [ ] 故意重复的发言会被 `turn.rejected`，UI 上看得到原因
- [ ] `max_rounds=20` 时单轮 prompt 长度不随轮数增长（打日志验证）
- [ ] `token_budget=3000` 时能在中途干净地停下并出卡片
- [ ] 每张卡片至少连接 2 个不同副脑，且能点开看原文
- [ ] `WEAVE_OFFLINE=1` 全流程跑通（`python smoke.py`）

---

### 3.10 夜间发现（`night/discovery.py` + `night/runner.py`）

**这是整个产品立场的技术落点。** 如果只有用户开口它才动，它就只是个搜索框。
所以顶栏没有输入框（§2.0），默认路径是它每晚自己在星图里找题。

#### 选题：两条策略，都不调 LLM

| 比例 | strategy | 怎么选 | 为什么 |
|---|---|---|---|
| 2/3 | `unconnected` | 跨副脑、落在反相似度带里、**且从未在任何一场辩论里同时出现过**的碎片对 | 已经接通过的连接不是发现，是复读 |
| 1/3 | `cold` | 同样的带，但锚定在**被辩论用得最少**的碎片上 | 前一条只会越挖越深；这一条保证没人管的角落最终一定会被翻到 |

实现上**冷区先选**：开放搜索先跑会把好碎片吃光，冷区就永远分不到 —— 而那正是
这条策略存在的唯一理由。一条碎片一晚只能锚一个提案（否则 n 个提案是同一个想法
换了几张皮）。语料太小凑不够 n 时，按代价从小到大放松：先降噪声下限 `BAND_LO`，
再放弃"一片一提案"。**`BAND_HI` 永远不动** —— 提两条本来就在说同一件事的碎片，
正是这套机制存在的意义所在。

选完才轮到 LLM，而且它只是个记录员（和 `cards.py` 一样）：把已经选定的这一对
写成一句可被反对的辩题。它**不能换材料，也不能自己另想一个题**。

#### 两种模式（`NightPrefs.mode`）

| mode | 中文 | 行为 | 花钱吗 |
|---|---|---|---|
| `suggest` | 只递给我 | 照样想 n 个，一场都不开，全部停在收件箱 | 只花措辞的那点 |
| `auto` | 自动开庭 | 同样 n 个，接着真的吵完，早上你看结果 | 是 |

**`token_budget` 是整晚的硬上限，不是每场的。** 跑到没预算就干净地停下，并在
summary 里说清楚停在第几个。"睡觉时它在干活"不能变成"睡觉时它在刷卡"。

#### 提案的生命周期

```
夜里跑 ──▶ status="inbox"  ← 没有坐标，不在星图上
              │
   收下 ──────┼──▶ status="kept" (+brain_id) ──▶ 后台 enrich ──▶ 成为星图上一颗星
   不要 ──────┼──▶ status="trashed"            ← 弃稿箱，可捞回
   换说法 ────┘   同一对碎片重新措辞（**不换碎片** —— 换碎片就是另一个想法了）
```

提案在被收下之前**不做 embedding**：没人要的东西不值得花向量，而没有向量就没有
坐标 —— 「星图上只有你点过头的东西」因此是数据结构保证的，不是一句 UI 约定。

#### 调度

`main.py` 的 lifespan 里起一个分钟级 asyncio 循环，不引入调度器依赖。后端不开机
就不跑 —— 对一个完全跑在用户自己机器上的东西，这是诚实的行为。`last_run` 存
ISO 日期，所以一天最多自动跑一次；`POST /api/night/run` 无视它，方便当场演示。

## 4. 【M3】知识群可视化模块 — 比 Obsidian 清楚在哪

### 4.1 Obsidian 的三个病，我们的三个药

| Obsidian 的病 | 后果 | 我们的做法 |
|---|---|---|
| 一次渲染全部节点 | 毛球，看着酷、没法用 | **三级语义缩放**：副脑 → 簇 → 碎片，一次只渲一层 |
| 每次打开重跑力导向 | 同一条笔记每次都在不同位置，形不成空间记忆 | **坐标服务端预计算并钉死**（`fx/fy/fz`），PCA of embedding + 副脑球面分居 |
| 图是装饰，不参与工作流 | 用户看两眼就关掉 | **激活态**：只有被命中/被引用的节点亮，其余降到 8%；卡片能"在图上回放这条连接" |

### 4.2 坐标怎么来的（`indexing/layout.py`）

```
副脑中心 = Fibonacci 球面均匀分布 × R(260)      → 各副脑天然分居，不打架
副脑内部 = 该副脑 chunk embedding 的 PCA→3D
           + 符号归一化（防止每次运行镜像翻转）
           + 95 分位缩放到 LOCAL_R(95)
簇坐标   = 其成员坐标均值
最后跑 12 轮极轻量排斥，只分开视觉上重叠的点
```

固定随机种子 + 符号归一化 = **同一条笔记，每次启动都在同一个位置**。
这是"用户能真正调取和评估"的前提，也是我们和 Obsidian 最实在的差别。

### 4.3 图 API（`api/graph.py`）

```
GET /api/graph?level=brain                       → 几个星系
GET /api/graph?level=cluster&brain_id=...        → 带 LLM 标签的星座
GET /api/graph?level=chunk&brain_id=&cluster_id= → 星点，上限 MAX_RENDER_NODES=2000
                                                   不带任何 scope = 全副脑的碎片（「展开碎片」档）
GET /api/graph/chunk/{id}                        → 原文 + 出处 + 标签
```

前端拿到后**必须**把 `x/y/z` 复制成 `fx/fy/fz` 并设 `cooldownTicks={0}`，
否则力导向会把预计算坐标推乱，前面的功夫全白费。

**边有两层**，`GraphLink.kind` 区分：

| kind | 含义 | 来自 |
|---|---|---|
| `contains` | 同一个簇 —— 我们本来就知道的关系 | 聚簇结果，只在 scope 内下发 |
| `cooccur` | **同一场辩论里被一起用过** —— 辩论产生的关系 | `indexing/cooccurrence.py`，`weight` = 场次 |

`cooccur` 的定义是「未被驳回的发言引用的 chunk ∪ 结算卡片连接的 chunk」，
两两连边；副脑层是它按 `brain_id` 的聚合（丢掉副脑内部自环）。现算不落库 ——
一场辩论撑死二三十条碎片，全量重算比维护增量表便宜。

星图顶层默认**只画副脑**，`cooccur` 边就是「这套东西到底接通了什么」的一句话答案；
切到「碎片」档才展开全部星点。

### 4.3.1 想法节点（`level="idea"`）

想法和碎片是**两个集合**，这条线不能合并：

* `chunks` 来自用户的笔记，是 agent **唯一**能引用的东西。
* `ideas` 是用户或 agent 自己想出来的，永远不进 `analogical_search` 的语料 ——
  所以 agent 不可能把用户自己的想法当"证据"引用回给用户。agent 可以**读**想法
  （当辩题、当夜间素材）并重组，但引用不到。这是数据结构保证的，不是 prompt 里
  写一句"请不要"。

坐标（`indexing/layout.py:layout_ideas`）：

| 状态 | 位置 |
|---|---|
| `kept` + 有 `brain_id` | 该副脑里跟它最像的 3 条碎片的均值，再往外推到 `RIM` |
| `kept` + 无 `brain_id` | 星图正中那圈空处的一个球壳（半径随数量增长） |
| `inbox` / `trashed` | **没有坐标** —— 没点头的想法不上图 |

`seed` 边把一个想法连到它开出的那场辩论真正用到的东西（副脑层聚合，碎片层直连）。

### 4.4 三个必须做出来的"演出时刻"

1. **想法落地**：idea enrichment=ready → 相机飞向命中区域 + 命中节点放大 2.4× + 其余变暗。
2. **发言引用**：`turn.done` 带 citations → 对应碎片瞬时点亮（观众看得到 agent 在
   引用"你自己写的东西"）。
3. **卡片回放**：卡片上「在图上回放这条连接」→ 高亮这几个碎片，展示这条连接
   横跨了哪几个副脑。

### 4.5 M3 验收清单

- [ ] 关掉再打开，同一条笔记还在同一个位置（截图对比）
- [ ] 3 个副脑 / 2000 碎片下拖动帧率不掉（chunk 层有上限保护）
- [ ] 面包屑能一路下钻并返回
- [ ] hover 显示原文摘要 + 出处；点击能定位
- [ ] 激活态生效：其余节点确实变暗到几乎不可见
- [ ] 空数据（刚清库）不白屏、不报错

---

## 5. 数据模型与接口契约

**唯一真相**：`backend/app/schema.py` + `backend/app/models.py`。
`frontend/src/types.ts` 是它的镜像，**同一个 commit 里一起改**。

```
brains ──1:n── clusters ──1:n── chunks
   │                              ▲
ideas  ──(hits: chunk_id[])───────┘
   │
debates ──1:n── turns (citations: chunk_id[])
   └──1:n── cards (connection: chunk_id[])
```

存储是 **MongoDB**：一个库、八个集合（`brains / clusters / chunks / ideas / debates /
turns / cards / settings`），`_id` 就是应用生成的字符串 id（`brn_…`、`chk_…`），
skeleton / hits / blackboard / citations 之类全部是原生子文档，不存 JSON 字串。
向量以 float32 raw bytes 存成 BSON Binary，相似度用 `numpy` 在进程内点积。
**不要装 faiss / chromadb，也不要开 Atlas Vector Search**：几千条向量 `numpy` 点积是
微秒级，装依赖的时间比省下的时间多。

Mongo 没有外键：级联删除走 `db.delete_brain / delete_debate / delete_spark`，
不许对父集合裸 `delete`。所有 pymongo 调用只在 `db.py` 里；上层只拿 `id` 进、`id` 出的 dict。

```
WEAVE_MONGO_URI=mongodb://localhost:27017   # 也可 mongodb+srv://… 或 mock://（纯内存）
WEAVE_MONGO_DB=weave                        # smoke.py 用 weave_smoke，永不碰演示数据
WEAVE_MONGO_FALLBACK=1                      # 连不上就退内存并 warning；=0 直接报错
```

连不上 MongoDB 时后端**不会挂**，退到 mongomock 内存存储继续跑（`/api/health` 的 `db`
字段 = `memory`）。这是舞台兜底，不是常态：内存态重启即清空。

### REST 一览

| 方法 | 路径 | 归属 |
|---|---|---|
| GET/POST | `/api/brains`, `/api/brains/paste`, `/api/brains/upload` | Agent A |
| PATCH/DELETE | `/api/brains/{id}` | Agent A |
| GET | `/api/graph`, `/api/graph/chunk/{id}` | Agent C（读）/ A（写） |
| POST/GET | `/api/ideas`, `/api/ideas/{id}`, `/api/ideas/{id}/rehit`, `/api/ideas/{id}/image` | Agent A |
| PATCH/DELETE | `/api/ideas/{id}` （归档 / 弃稿箱 / 真删） | Agent A |
| POST/GET | `/api/debates`, `/api/debates/{id}/stream`(SSE), `/turns`, `/cards` | Agent B |
| GET/POST | `/api/cards`, `/api/cards/{id}/save` | Agent B |
| GET/PUT/POST | `/api/night`, `/api/night/run`, `/api/night/ideas/{id}/rephrase` | Agent B |
| GET/PUT | `/api/settings` | Agent A |
| GET/DELETE | `/api/privacy`, `/api/privacy/all` | Agent A |

---

## 6. BYOK：用户自己填 Key

**我们不持有任何密钥，也没有服务端。** 用户在设置里填自己的 provider，
存进本机 MongoDB 的 `settings` 集合，只用于请求他自己填的 `base_url`。

```
kind = openai_compat   → OpenAI / DeepSeek / Kimi / 通义(compat) / SiliconFlow /
                          ModelScope / vLLM / Ollama(:11434/v1)
kind = anthropic       → Claude Messages API（无 embedding，需另绑一个 embed provider）
kind = mock            → 离线，零成本，零网络
```

三个"角色位"分别可指：`default_chat`（副脑 agent）、`default_embed`（向量）、
`moderator_provider`（主持人/压缩，指便宜模型）。
`GET /api/settings` **永不返回 key**，只返回 `has_key: bool`。

**副脑级绑定**：`PATCH /api/brains/{id} {provider}` 把某个副脑绑到某个厂商。
"工作副脑用 DeepSeek，兴趣副脑用 Claude，它们吵起来"——这是 demo 里一句话就能讲清
的差异化，实现成本几乎为零。

**降级链**：`OFFLINE=1` → mock；provider id 找不到 → mock + warning；
provider 报错 → 该次发言作废走重试。**任何情况下不 500。**

**ModelScope 专项奖**：`embed_model` 填 `bge-m3` 或 `Qwen3-Embedding`，
并按条款把仓库开源到 ModelScope。几乎零额外工作量，多一条奖项通道。

---

## 7. 跑起来

```bash
docker compose up -d mongo   # 本地 MongoDB 7（或 brew services start mongodb-community）
./run.sh                     # 后端 :8000 + 前端 :5173
OFFLINE=1 ./run.sh           # 舞台兜底：不联网、不要 key、全 mock

cd backend && WEAVE_OFFLINE=1 python smoke.py    # 端到端自检，每次合并后必跑；没有 mongod 也能跑
```

目录：

```
brain2/
├── run.sh  docker-compose.yml  ← compose 只起一个 mongo:7
├── DEVELOPER_MANUAL.md         ← 本文件
├── demo/seed_notes/<副脑名>/*.md   ← 演示前换成你们自己的真实笔记
└── backend/
    ├── smoke.py  seed.py  requirements.txt
    └── app/
        ├── schema.py   models.py       ← 契约，动它要通知全组
        ├── config.py   db.py   main.py ← db.py 是唯一 import pymongo 的地方
        ├── providers/  base.py(含 mock) remote.py registry.py
        ├── ingest/pipeline.py           ← 切块 / zip 解析 / 入库
        ├── indexing/  cluster.py  layout.py
        ├── retrieval/ skeleton.py  analogy.py      ← M2 的技术核心
        ├── debate/    roles.py blackboard.py prompts.py engine.py cards.py
        ├── indexing/  cooccurrence.py                ← 辩论产生的边
        ├── night/     discovery.py runner.py         ← 它自己找题（§3.10）
        └── api/       brains.py graph.py ideas.py debates.py settings.py
└── frontend/src/
    ├── types.ts  api.ts  App.tsx  styles.css
    └── components/ GalaxyView.tsx Eureka.tsx Discoveries.tsx
                    DebateConsole.tsx DebateTheater.tsx CardDeck.tsx
                    SettingsDrawer.tsx
```

---

## 8. 三个 Agent 的分工与时间表

| | Agent A · 副脑基建 | Agent B · 辩论引擎 | Agent C · 前端与演出 |
|---|---|---|---|
| **拥有** | `ingest/` `indexing/` `providers/` `api/brains,graph,ideas,settings` | `retrieval/` `debate/` `api/debates` | `frontend/` 全部 |
| **不许碰** | `debate/` 内部逻辑、前端 | ingest / 前端 | 后端（除非改 `types.ts` 对应的 `models.py`） |
| **对外承诺** | `/api/graph` 稳定返回坐标；`/api/ideas` 立即返回 | SSE 事件流按 §3.8；`turn.done` 一定带 `brain_name` | 断网可演；不崩 |

**冲突面只有两处**：`models.py`↔`types.ts`，`prompts.py`。
改这两处必须在群里喊一声。其余各自并行。

### 16 小时排期（铁律：某个时刻起不再加新功能）

| 时段 | A | B | C | 交付物 |
|---|---|---|---|---|
| 0–1h | 冻结 scope，三人各导出**自己的真实笔记** | 读 §3，确认机制 | 画死一屏 UI | 一张手绘图 |
| 1–4h | ingest→cluster→layout 跑通 | 类比检索调到"出好碎片" | 星图渲出来、坐标钉住 | 命令行能打印副脑分区 |
| 4–7h | sparks + settings + 隐私页 | 辩论 4 role 跑通、SSE 出事件 | Eureka 条 + 辩论剧场接 SSE | 输入一句话 → 出 3 张卡 |
| 7–11h | 联调、降级路径、兜底 | prompt 调优（这是收益最高的 3 小时） | 三个"演出时刻"做出来 | 能点、能连线、能吵 |
| 11–14h | **预生成 3 个 demo 缓存**、删除按钮 | 收敛/预算停机验证 | 断网演练、录屏 | 离线可跑的完整 demo |
| 14–16h | 提交物（≤3min 视频 + 文档 + 开源仓库） | 同左 | 同左 | 提交完毕 |
| 9/6 上午 | **只排练，不写新功能**，讲 ≥3 遍 | | | |

> 评分里「完成度与可交互」考的是 **demo 不崩**，不是功能多。
> 下午某个时刻起，任何新功能一律不加。

---

## 9. 评分对齐表（拿到飞书赛制后回来核对）

| 维度 | 我们的答法 | 在哪证明 |
|---|---|---|
| 问题真实性 | 用户收窄到「独立开发者 / 内容创作者 / 找选题的研究生」，**我们自己就是用户**，用团队三年真实笔记演示 | 开场 30 秒真实故事 |
| 技术深度 | 反相似度带检索 + 跨副脑约束 + 黑板架构（每轮上下文 O(1)）+ 四条机械反点头 | §3.2 §3.4 §3.5，滑杆现场演示 |
| 完成度与可交互 | 一屏跑完全流程；`OFFLINE=1` 断网可演；预生成缓存兜底 | 现场随机输入 + 兜底案例 |
| 落地潜力 | 个人订阅 + 团队版（团队副脑 = 组织记忆，把离职带走的隐性知识留下） | 结尾 20 秒 |
| 安全与公信力（加分） | 本地 MongoDB、无账号、不上传、不训练、BYOK 直连；**当场点「删除我的副脑」** | 隐私页 + 30 秒演示 |
| ModelScope 专项 | embedding 用 bge-m3 / Qwen3-Embedding，仓库开源到 ModelScope | README 声明 |

---

## 10. 路演脚本（3–5 分钟）与评委问答

**脚本**

| 时间 | 内容 |
|---|---|
| 0:00–0:30 | 你们自己的真实故事："我三年前写过一段 X，上周才想起它和 Y 是一件事"。**不要讲行业趋势。** |
| 0:30–1:00 | 打开星图：这是我三年的笔记，自动分成了工作 / 兴趣 / 经历三个副脑 |
| 1:00–1:45 | **请评委随口说一件他最近在想的事** → 现场输入。全场记忆点，别用预设文案（预设留作断网兜底） |
| 1:45–2:45 | 四个副脑当场吵起来：念出被判无效的那条"复读"，再念卡片的**「为什么是你」**；拖一下疯狂滑杆再出一版 |
| 2:45–3:15 | "昨晚它自己做了个梦"——主动推送的那张卡 |
| 3:15–3:35 | 数据在哪 + 当场删除 |
| 3:35–4:00 | 给谁用、怎么收钱、下一步 |

**观众投票必杀技**（30 分钟工作量，先私下测一轮再决定放不放）：同一句碎念，
左边是直接问通用 LLM 的答案，右边是我们的，现场投票哪个更有启发。

**五个必被问到的问题**

1. **"这不就是 Notion AI / Mem 吗？"**
   → 它们找"你要找的"，我们找"你不知道该找的"。机制上我们**主动排除**最相似结果，
   只在中距离带 + 跨副脑组合里找。现场拖滑杆演示。
2. **"新用户没数据怎么办？"**
   → 第一天靠导入不靠积累，200 条笔记就能出第一张卡；而且越用越厚，
   留存和护城河都在数据侧。
3. **"你怎么证明生成的是'好'点子？"**
   → 三个可量化代理：卡片采纳率（`/api/cards/{id}/save`）、溯源可信度
   （每张卡都有用户自己的原文）、现场对比投票。**别答"我们能保证质量"。**
4. **"多 agent 不就是互相点头？"**
   → 指着 UI 上灰掉的那条："这条被判无效，因为它是复读。" 讲四条机械约束。
5. **"长时间辩论不会爆 context / 烧钱吗？"**
   → 黑板架构，每轮上下文是常数，不随轮数增长；三重停机（轮数 / token 预算 /
   收敛早停）；主持人走便宜模型。
6. **"隐私？"** → 别解释，当场点删除按钮。

---

## 11. 坚决不做（今天说不，明天不后悔）

- ❌ Notion / Google Drive OAuth 接入（半天没了，且演示当天最容易挂）
- ❌ 登录注册、多用户、账号体系
- ❌ 语音输入（除非 1 小时内接完现成 ASR）
- ❌ 移动端适配
- ❌ 微调任何模型
- ❌ 向量数据库 / Atlas Vector Search（numpy 够用）
- ❌ 用假数据做 demo（真实语料是这个赛题最便宜也最有杀伤力的证据）

---

## 12. 【期望·不在本次范围】写在 demo 之后的愿景

- **用户彻底电子化**：副脑群足够厚时，它是你的可查询、可辩论的数字分身。
- **副脑间共享**：用户与用户之间开放特定副脑，形成跨人知识共同体——
  你的"音乐副脑"和别人的"材料学副脑"直接对话。
- **团队副脑 = 组织记忆**：把离职带走的隐性知识留下。（这句在评分的"落地潜力"
  上很值钱，可以提前一句话带过。）

---

## 13. 命名

「副脑」内部代号可以，对外太泛。和赛事主题 Weave 呼应的方向更好记：
**织念** / **回响 Echo** / **暗物质 Dark Matter**（你已经有、但看不见的那部分）。
**5 分钟内定一个，不要再讨论。**
