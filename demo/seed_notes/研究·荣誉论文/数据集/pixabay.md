**结论(先说):不推荐。** 三条硬伤:① 官方 API **根本不含音乐**;② ToS **明文禁止 scraping,
且点名"机器学习用途"和"批量复制"**;③ Pixabay **公开欢迎 AI 生成音乐**且仅靠上传者自觉打标,
"人类"纯度无法保证——而"排除 AI"正是我们要的(见你之前的顾虑)。

---

#### 1. 适配性(fit)

**唯一的理论优点**
- **年代/制作现代**:Pixabay 音乐是当下上传的干净作品,理论上比 FMA(2009–2014 lo-fi)更能和 Suno(2026)对齐[[年代混淆]]

**致命缺点**
- **AI 污染(dealbreaker)**:Pixabay 政策"AI content is welcome",要求上传时勾"AI-generated"框,
  但**站上大量 AI 音乐**(直接有 "ai generated / ai music" 分类搜索结果)。用它当"人类"标签会把。
- **无法可靠过滤 AI**:没有音乐 API,也没有"排除 AI"的公开过滤器;AI 标记只在上传端自觉,
  浏览/搜索端拿不到可信的 per-track AI 标志 → 没法程序化剔除。
- **新混淆:stock/library 制作签名**:royalty-free 库存音乐有自己高度同质的"配乐感"制作风格,
  引入一个**新的制作混淆**(和 [[MagnaTagATune]] 的厂牌同质问题类似)。
- **License 不许再分发**:Pixabay License 禁止把内容作为"数字内容/在 stock 站上"再分发
  → **数据集不能公开发布**,复现性受限。

#### 2. 能不能爬?——基本不能(合规角度)

- **API 不含音乐**:官方 API 只有图片(`/api/`)和视频(`/api/videos/`)两个端点,
  **没有任何 audio/music 端点**。→ 没有干净的程序化获取路径。
- **ToS 明令禁止**(原文要点):
  - "Data mining, extraction, **scraping** and the use of programs or robots for automatic data
    collection … is strictly prohibited for all unauthorised purposes, **including without
    limitation for machine learning purposes**." ← 直接点名 ML;
  - "**Bulk, large-scale or systematic copying** of Content is strictly prohibited unless explicit
    permission has been granted.";
  - 即便用官方 API:"made for real human requests, **systematic mass downloads are not allowed**."
- **反爬**:站点对非浏览器请求直接 **403**
- → **技术上能硬爬(音乐详情页里有 mp3 直链),但那是明确违反 ToS(且专门禁 ML)**,
  用作论文训练数据在合规/伦理上站不住,不做。

#### 3. 如果真的非用不可(合规路径,优先级低)
- **申请书面许可**:ToS 说 bulk/systematic 需 "explicit permission" → 邮件联系 Pixabay 说明学术用途,
  拿到授权再谈;不确定能否覆盖 ML 训练。
- **少量手动下载**:License 允许下载使用单曲,但 ToS 的"ML 用途"限制仍在;只适合个位数样本做质检,
  **不适合建数据集**。
- 无论哪条,**AI 污染问题依旧无解** → 收益低、风险高。

#### 来源
- [Pixabay Terms of Service](https://pixabay.com/service/terms/) — 禁 scraping / ML / bulk 条款
- [Pixabay API Docs](https://pixabay.com/api/docs/) — 仅 images + videos
- [Content License](https://pixabay.com/service/license-summary/) — 使用/再分发限制
- [AI Quality Guidelines](https://pixabay.com/blog/posts/ai-quality-guidelines-479/) — AI 内容政策
- [Pixabay 音乐 "AI generated" 搜索](https://pixabay.com/music/search/ai%20generated/) — 站上 AI 音乐现状
