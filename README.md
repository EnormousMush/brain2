# Weave · 副脑

一站式搭建、管理、维护、Agent 化「副脑群」的平台。

> 我们不让 AI 想点子，我们让 AI 只能用你自己的碎片拼点子。

把你的笔记切成若干个「副脑」（工作 / 兴趣 / 经历 / 某个项目），每个副脑交给一个
agent 代理；你随手记下一个想法，系统抽出它的「问题骨架」，**主动排除最相似的
结果**，只在中距离带上跨副脑检索，然后让四个角色固定的副脑 agent 当着你的面
吵一架，最后结算成可溯源的想法卡片。

## 快速开始

```bash
docker compose up -d mongo   # 本地 MongoDB（或 brew services start mongodb-community）
./run.sh                     # 后端 :8000 + 前端 :5173
OFFLINE=1 ./run.sh           # 离线模式：不联网、不需要 API Key、全 mock
```

环境变量：`WEAVE_MONGO_URI`（默认 `mongodb://localhost:27017`）、`WEAVE_MONGO_DB`（默认 `weave`）。
连不上 MongoDB 时后端会退到**内存存储**继续跑（重启即清空），`GET /api/health` 的 `db`
字段会告诉你当前在哪个后端上。

第一次启动会用 `demo/seed_notes/` 里的示例笔记建三个副脑。
**演示前请换成你自己的真实笔记。**

自检：

```bash
cd backend && WEAVE_OFFLINE=1 python smoke.py     # 端到端，应打印 DONE（用 weave_smoke 库，不碰演示数据）
```

## 三个模块

| 模块 | 做什么 | 核心文件 |
|---|---|---|
| 灵光捕捉 | 零延迟记录想法（文字 / 图片+说明），异步抽「问题骨架」并点亮星图 | `api/ideas.py`、`retrieval/skeleton.py` |
| 副脑辩论 | 反相似度检索 → 4 个固定 role → 黑板式多轮辩论 → 想法卡片 | `retrieval/analogy.py`、`debate/` |
| 夜间发现 | 它自己在星图里找题：从未接通过的中距离对 + 冷区。自动开庭 / 只递给我 | `night/discovery.py`、`night/runner.py` |
| 知识群可视化 | 三级语义缩放星图，坐标钉死；辩论产生的共现边 | `indexing/layout.py`、`indexing/cooccurrence.py`、`GalaxyView.tsx` |

## 你的数据

- 全部写在你本机（或你自己指定）的 MongoDB 里，8 个集合，见 `backend/app/schema.py`
- 向量以 float32 二进制存在文档字段里，相似度用 numpy 在进程内算；不用向量数据库
- 没有服务器，没有账号，不上传，不训练
- 模型调用用**你自己填的 API Key**，直连你指定的 `base_url`
- 「删除我的副脑」= 删除全部笔记 / 向量 / 辩论 / 卡片集合，不可恢复（provider 设置保留）

## 开发

见 [`DEVELOPER_MANUAL.md`](./DEVELOPER_MANUAL.md) —— 接口契约、机制设计、
分工与验收标准都在那里。
