# brain2

把几个笔记库放在一起，让它们互相提问。

每个笔记库叫一个副脑。brain2 定期在副脑之间寻找相关但不相同的内容，拼成题目，交给四个角色辩论，把结论记成可以追溯到原文的卡片。全部数据放在你自己的 MongoDB 里，模型用你自己的 API Key，没有账号，不上传。

## 快速开始

完整的使用说明见 [docs/GUIDE.md](docs/GUIDE.md)。

```bash
git clone <本仓库> brain2 && cd brain2
OFFLINE=1 ./run.sh          # 不联网、不需要 Key、内存存储，打开 http://localhost:5173
```

需要 Python 3.10 以上和 Node 18 以上。第一次运行会自动建 venv 并安装依赖。

要保留数据，先起一个 MongoDB：

```bash
docker compose up -d mongo   # 或 brew services start mongodb-community
./run.sh
```

单容器方式（前后端一起，端口 7860）：

```bash
docker build -t brain2 . && docker run -p 7860:7860 brain2
```

## 接入模型

设置里选择提供方，填 base_url 和 api_key。兼容 OpenAI 格式的服务都可以，例如：

| 服务 | base_url | 对话模型 | 向量模型 |
|---|---|---|---|
| 魔搭 API-Inference | `https://api-inference.modelscope.cn/v1` | `Qwen/Qwen3-32B` | `Qwen/Qwen3-Embedding-0.6B`、`BAAI/bge-m3` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` | `text-embedding-3-small` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 需另配向量服务 |

不填任何 Key 时用离线模式，所有模型调用返回确定性的假结果，用于试用界面。

## 第一次使用

1. 打开 http://localhost:5173 ，离线模式下星图已经有 8 个示例副脑。
2. 左侧设置图标，选一个预设填上 api_key，保存。不填就一直是离线模式。
3. 顶栏导入按钮，选一个文件夹或几个文件，起名，等进度走完。至少要有两个副脑。
4. 左侧发现图标，模式选"只递给我"，点立即运行。题目出现在收件箱里，右滑保留，点开始辩论。
5. 辩论结束后看卡片，点回放回到星图看它引用了哪些碎片。

## 功能

- 导入：Markdown、txt、csv、Word、PDF、HTML、zip，或直接选一个文件夹（Obsidian 库、Notion 导出目录）。导入分读取、切分、向量化、聚类、布局五步显示进度。
- 星图：三维力导向布局。副脑是星球，碎片围绕星球分布，副脑之间按共现关系连线。位置存回数据库，重启后不变。
- 灵光：随手记一句话，系统抽出它的问题骨架，在星图上点亮相关碎片。
- 夜间发现：后台按设定频率在副脑之间搜索。只取中间相似度区间的配对，太像的没有新信息，完全无关的拼不出题。结果进收件箱，滑动保留或丢弃。
- 辩论：提议者、怀疑者、类比者、裁判四个角色围绕一个题目多轮发言，共享一块黑板。每条反驳标出针对的是谁的哪一句。
- 卡片：辩论结论。回放时星图上把卡片引用的碎片连起来。

## 代码结构

```
backend/app/
  api/          brains, graph, ideas, night, debates, settings
  ingest/       文件解析、切分、向量化、聚类
  retrieval/    骨架抽取、反相似度检索
  debate/       角色提示词、黑板引擎
  night/        发现器与定时循环
  indexing/     布局与共现边
  providers/    OpenAI 兼容与 Anthropic 提供方，离线 mock
  db.py         唯一的 pymongo 入口，mongomock 回退
  schema.py     8 个集合的字段与索引
frontend/src/
  components/   GalaxyView, ImportPanel, DebateTheater, CardDeck, Discoveries...
demo/
  seed_notes/   8 个示例副脑，全部为演示编写
  build_demo.py 重建示例库
```

环境变量：`WEAVE_MONGO_URI`（默认 `mongodb://localhost:27017`，`mock://` 表示内存）、`WEAVE_MONGO_DB`、`WEAVE_OFFLINE`。

自检：

```bash
cd backend && WEAVE_OFFLINE=1 .venv/bin/python smoke.py
```

## 数据

- 8 个集合，见 `backend/app/schema.py`。向量以 float32 二进制存在文档字段里，相似度在进程内用 numpy 计算，不依赖向量数据库。
- 删除一个副脑会级联删除它的碎片、向量、辩论和卡片。
- 设置里的"删除全部"清空所有用户数据集合，提供方配置保留。

## 许可证

MIT，见 LICENSE。
