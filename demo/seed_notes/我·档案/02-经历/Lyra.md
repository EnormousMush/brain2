# Lyra

**一句话**：一个上线了的全栈 AI 音乐平台，用户上传一首歌，然后跟一个「听得见」这首歌的大模型对话，系统实时生成可视化场景。

- **角色**：Founder（创始人）
- **时间**：2026 年 2 月起，目前**告一段落**（[phone] 拍板）

## 做了什么

- 用户上传歌曲后可与 LLM 对话，模型通过**自研的 Python 音频分析 pipeline** 提取特征，等于让它「听」到这首歌。**pipeline 里的很多特征直接复用自荣誉论文**（Crest Mean、MFCC delta 那一套），两条线是通着的
- 由 **Claude 的 tool use 编排 Google Gemini 图像模型**，实时生成可视化场景
- 部署：后端在 Render，前端托管在 Lovable。**当前是 demo 状态，没有正式上线**
- 网站上写「Lyra 1.1」，说明至少迭代过一版
- 代码：https://github.com/EnormousMush/lyra-frontend 和 https://github.com/EnormousMush/lyra-backend
- 诚实记录（[phone] 口述）：**全栈里很多东西是 vibe coding 出来的**（AI 辅助写的），但想法和创意是你自己的。对外讲这段时要预设「面试官深挖技术细节」的场景，想清楚哪些部分你能白板级讲透、哪些要坦承是 AI 辅助

## 日期（已裁决 [phone]）

起点 2026 年 2 月，目前告一段落。对外材料要改：英文 CV 写了 April 2026 – Present（起点和状态都不对），个人网站写了 Jan 2026 - May 2026（起点不对）。

## 结果（[phone] 口述，如实）

- **没有用户**，demo 状态，未正式发布；现状就是两个 repo 里的样子
- 告一段落的原因想得很清楚：**API 调用太贵，而且想不出足够的用户群**（即使有也不会多），单位经济学不成立
- **对外表述注意**：CV 上写的是「shipped it to production」，和真实状态（demo、无用户）之间有 gap。建议改成 deployed a working demo 这类措辞，这段经历真正的价值不在「上线」，在下面这条

## 能拿来说的素材

- 「Claude tool use 编排 Gemini 图像模型」这个组合具体、可信，比「用了 AI」有信息量得多
- 「自研 Python 音频分析 pipeline 让 LLM 听得见」是产品的技术内核，一句话能说清；且特征复用自论文，「研究反哺产品」是个好故事
- 「做出来、算了账、发现单位经济学不成立、主动停」是比上线更稀有的素材，用它，别用「shipped to production」

## 关联

[[本科荣誉论文 AI音乐检测]]

来源：cv.pdf、cv-zh.pdf、durunbao.com 的 build 一节；repo、用户与成本现状来自 Frank 口述（[phone]）。
