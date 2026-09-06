# brain2 在魔搭创空间的部署

单容器镜像，根目录 `Dockerfile`。容器监听 7860，离线模式，内存存储，启动时自动装入 `demo/seed_notes/` 的 12 个知识库（约 1 分钟）。

## 创建创空间

1. 登录 https://modelscope.cn ，右上角头像 → 创建创空间。
2. 类型选 Docker，名称 brain2，公开。
3. 把本仓库推到创空间的 git 地址（页面上有命令），或直接上传 `Dockerfile`、`backend/`、`frontend/`（不含 node_modules）、`demo/`。
4. 等构建完成，访问链接确认星图能看到 12 个知识库。
5. 设为公开，把访问链接填到参赛表单。

## 接入魔搭开源模型

设置 → 模型提供方 → openai_compat：

- base_url: `https://api-inference.modelscope.cn/v1`
- api_key: 魔搭 API-Inference 的 token
- 对话模型: `Qwen/Qwen3-32B`（或其他 Qwen 系列）
- 向量模型: `Qwen/Qwen3-Embedding-0.6B` 或 `BAAI/bge-m3`

创空间里若想默认用真实模型，在环境变量里把 `WEAVE_OFFLINE` 设为 0 并配置上面这些参数。

## 本地验证

```bash
docker build -t brain2 . && docker run -p 7860:7860 brain2
```

打开 http://localhost:7860 。
