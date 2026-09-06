# NYU Steinhardt MARL (Music and Audio Research Laboratory)

全美做 MIR 最强的几个实验室之一，本科生可接触度也相对最高。

- 实验室主页：https://steinhardt.nyu.edu/marl
- Join Us：https://steinhardt.nyu.edu/marl/join-us
- REU 页面：https://steinhardt.nyu.edu/marl/join-us/research-experiences-undergraduates-nyus-marl
- Music Technology 项目：https://steinhardt.nyu.edu/programs/music-technology
- 活动页：https://steinhardt.nyu.edu/marl/events

## 为什么是这里

- MARL 在 ISMIR 上有很强的存在感。2025 年在韩国大田（KAIST）举办的 ISMIR 上，MARL 成员有显著的成果产出
- 赞助方包括 **Sony、腾讯、Adobe、Google**。这意味着实验室本身就是通往这些公司实习的管道
- **Sony Audio Institute** 是 NYU Steinhardt 与 Sony 的战略合作产物，官方定位是「bridging academic study with real-world music industry experience」的枢纽
- **Agnieszka Roginska** 教授（Music Technology 教授）自 2026 年 1 月 1 日起担任 **AES（Audio Engineering Society）Director**
- **Magdalena Fuentes** 与 NJIT 研究者合作，正在做一个三年期项目，为聋人与听障观众开发 AI 音频字幕技术

## REU 项目

MARL 运作一个面向声音与音乐科技的 REU（Research Experiences for Undergraduates）暑期项目，与本科生合作，明确希望激发跨系合作。

**注意**：作为 2027 年 5 月毕业的四年级学生，REU 通常要求申请者在项目结束后仍是在读本科生。这一点需要直接确认。如果不符合，走**访问学生 / 研究合作**这条路。

## 我的切入角度（写冷邮件时用）

我的优势不是 GPA 或者课程，是**已有的具体产出**：

1. ACL ARR 共同作者（LLM persona conditioning）
2. 一篇成型的毕业论文：AI 生成音乐伪影检测，多编码器（MERT / MuQ / wav2vec2 / EncoDec）+ AASIST baseline，两条技术路线（自训练 flow matching 密度模型；用 ACE-Step 冻结速度场做 ODE inversion）
3. 21,000 条 Suno 语料 + FMA / MTG-Jamendo 基线，自建的两层数据清洗管线
4. 复旦两个实验室的经历：NLP 实验室的 MuseV2 数据管线，FD-LAMT（音频与音乐技术实验室）的 Audit Copilot。（[phone] 勘误：原文把两个实验室写成了一个，冷邮件里别照抄）
5. 我自己是音乐制作人，有实际的流媒体数据

第 5 点在 MARL 这种地方是加分而不是噪音，因为他们本来就是音乐学院下属的实验室。

## 冷邮件策略

- **不要群发**。挑一到两位方向最近的教职，写一封有具体技术内容的信
- Magdalena Fuentes 做音频与 MIR，是最可能的对象
- 信里要有一个**具体的问题**，不是「我想加入您的实验室」，而是「我在做 X，遇到了 Y，注意到您的 Z 工作可能相关，能不能聊聊」
- 附上 durunbao.com 和一份两页的项目摘要
- 时间点：秋季学期中（10 月至 11 月）最好，那时他们还没进入招生季的忙碌期

## 与研究生申请的关系

我在申请 UChicago 4+1、Harvard CSE / Data Science、Penn DATS / CIS MSE。**NYU 的 Music Technology 项目本身没在我的名单上，但值得重新考虑**：这是全美唯一一个把 MIR 当作核心而非边缘的项目，如果我的长期方向真的是音乐 + AI，NYU 的对齐度可能高于目前名单上的任何一个。

至少，与 MARL 建立联系会给我一封来自 MIR 圈内人的推荐信，这对任何一个申请都有用。

## 纽约的配套资源

- **Monthly Music Hackathon NYC**：历史上每月最后一个周六在 NYU Leslie eLab，免费，向所有人开放。音乐人、程序员、艺术家、科学家、作曲家、硬件玩家一起做音乐项目。**注意：2026-2027 年度是否仍在按月运作未确认**，去之前先查官网。https://monthlymusichackathon.org/
- **HackNYU**：48 小时全球性黑客松，往年 11 月中在 NYU Tandon 布鲁克林校区。五个赛道含 Interactive Media Art & Entertainment，这个赛道适合诗宇。https://hacknyu.org/

## 冷邮件连接候选（[phone] 调研）

五个候选，**已拍板用 ①**：

1. **Investigating Modality Contribution in Audio LLMs for Music**（Giovana Morais & Fuentes，ICASSP 2026）【选定】：音频 LLM 里各模态到底贡献多少，也就是「模型在听还是在猜」。你从两侧碰过同一问题：Lyra 的架构是对它的一次未经检验的下注（不信端到端，手动铺特征通路），论文的混淆方法论是它的检测版（模型实际用的是哪路信号）。可献出的工具：内容锁死设计迁移成模态贡献的测量法
2. **Evaluating Compositional Structure in Audio Representations**（McFee、Bello 等，ICASSP 2026）↔ 你的逐层编码器探针（信号在低层声学而非高层结构）。作者不是 Fuentes，**留给将来单独写给 McFee/Bello 或面试用**
3. **AudioCards**（结构化元数据提升音频语言模型）↔ MuseV2 的 DAG 结构化 specs。作者一半是 Adobe 的人，对 MARL 针对性弱
4. **MUSE Benchmark**（探测音频 LLM 的音乐感知，Carone、Roman、Ripollés）↔ 你的去混淆评测设计。与 ① 高度重叠，并入 ① 讲
5. **Fuentes 的 NSF 项目**（HCC Medium，AI 辅助非语音音频字幕，约 80 万美元，2025 年夏起三年，与 NJIT 的 Mark Cartwright、Sooyeon Lee 合作，合作方含 Adobe、Google/YouTube、New York Public Radio）↔ Audit Copilot 的显著性判断与人机交还。**已作为第二段的一句话支撑用上**

**①的论文已核实（[phone]，arXiv 2509.20641，ICASSP 2026，5 页）**：方法是把 MM-SHAP（基于 Shapley 值的归因框架）迁移过来测各模态贡献，在 MuChoMusic 基准上测两个模型；结论是**准确率越高的模型越依赖文本**，但音频没被完全忽略（仍能定位关键声学事件）。摘要原话「it is unclear if they are truly listening to the audio or just using textual reasoning」和你信里「I did not trust an audio LLM to actually listen」是同一个怀疑。注意：她已有原则性方法（Shapley），信里的献计措辞要保持「从另一条路碰到同一问题」的姿态，不是「给你出主意」。

其它可用背景：MARL 三大方向是 machine listening、音乐心理与认知神经、沉浸式音频；老牌项目有 SONYC、BirdVox、Citygram。Fuentes 是 Steinhardt 与 Tandon 双聘助理教授，巴黎萨克雷博士，乌拉圭共和大学电气工程本科，邮箱 mfuentes [at] nyu [dot] edu。

## 冷邮件定稿（校对版，[phone]）

**发送状态：待确认**（截至 [phone] 未收到反馈）。原定发送窗口 9 月下旬。发前把 Morais 那篇 5 页读掉，她回信第一句大概率聊它。

Subject: Does the model actually hear it? A question from a UChicago senior

Dear Professor Fuentes,

I hope this email finds you well. I apologize in advance for sending you a bulky email during the summer break. I was getting too excited about MARL.

I'm a senior at the University of Chicago majoring in computational and applied mathematics. I have been producing music for six years, which led to my huge interest in exploring music in an ML setting. I follow MARL's MIR work closely, and your project on AI-driven audio captioning for deaf and hard-of-hearing audiences is a model of audio research that actually reaches people. I always think technology should ultimately serve people, and I have been trying to do the same, though I often feel lost along the way.

Your ICASSP paper with Giovana Morais on modality contribution in audio LLMs named something I had been circling from two directions. When I built Lyra, a platform where you upload a song and talk with a model about it, I did not trust an audio LLM to actually listen, so I routed the audio through a custom feature pipeline before the model ever saw it. I treated that as an engineering decision, but it was really an untested assumption about modality contribution. And in my research project on detecting AI-generated music, supervised by Prof. Blase Ur of the UChicago Computer Science Department, the same question returns as a confound problem: what is the detector actually using?

For now, in a content-locked comparison (21,500 Suno tracks plus six other generators prompted identically, against FMA and MTG-Jamendo baselines), it seems that detectors learn generator-family fingerprints rather than any universal signal. What strikes me is that the construction might transfer to your question: hold the underlying content fixed, vary only how it reaches the model, and the shift in output becomes an estimate of what each modality is carrying.

Most of my other work is music infrastructure from the generation side. I'm one of four founding members of MuseV2, an open text-to-music model at Fudan University's NLP lab, where I lead the design of the structured prompt dataset generator and am now working on model construction and training. At Fudan's audio and music technology lab (FD-LAMT), I helped build an LLM agent that automates the processing and logging of a large multi-track Chinese-pop dataset; the hardest part turned out to be working out which checks genuinely carried the reviewer's judgment, which I now suspect is a cousin of deciding which sounds warrant a caption. I co-authored an LLM ethics study now under revision for resubmission to ACL ARR, and I produce music myself (13M+ streams).

Might I ask for twenty minutes of your time to talk about MARL? I graduate in May 2027; if MARL hosts visiting students, I'd be glad to learn more. You can also visit durunbao.com, a personal website I made that includes most of my recent projects.

Best,
Runbao (Frank) Du

## 我的行动

1. 秋季读 3 至 5 篇 MARL 近期论文，特别是 Fuentes 的
2. 10 月至 11 月发第一封冷邮件
3. 同时查 REU 的申请开放时间和资格条款（我是否因为毕业年份被排除）
4. 如果去纽约（比如面试或访校），提前约实验室参观
5. 重新评估要不要把 NYU Music Technology 加进研究生申请名单

## 待确认

- REU 2027 的申请时间与对四年级学生的资格限制
- MARL 是否接收非 NYU 的访问本科生
- Monthly Music Hackathon 是否还在办
