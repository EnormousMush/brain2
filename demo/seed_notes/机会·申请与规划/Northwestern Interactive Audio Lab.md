# Northwestern Interactive Audio Lab

Bryan Pardo 教授领导的实验室，隶属西北大学计算机科学系（也有电气工程与计算机科学系的说法）。**在埃文斯顿，从海德公园坐红线约一小时，是我够得着的唯一一个顶级音频 ML 实验室。**

- 实验室主页：https://interactiveaudiolab.github.io/
- 人员页：https://interactiveaudiolab.github.io/people-current/1_bryan-pardo.html
- 另一个域名：http://music.eecs.northwestern.edu/people.php
- Pardo 的 Google Scholar：引用 6,900 次以上
- 办公室：2133 Sheridan Rd., Room 3-323, Evanston, IL 60208

## 实验室方向

官网自述：

> We develop new methods in **Generative Modeling, Signal Processing and Human Computer Interaction** to make new tools for understanding, creating, and manipulating sound.

具体研究领域：
- 音乐与语音的**生成**
- 音频场景标注（audio scene labeling）
- **音频源分离**（audio source separation）
- 包容性界面（inclusive interfaces）
- 新的音频制作工具
- **无监督学习的机器听觉模型**（machine audition models that learn without supervision）

另一处的自述更简洁：「We make machines that hear.」

## 近期工作

- **Sketch2Sound**（与 Adobe 合作）：一个生成式音频模型，能从一组可解释的时变控制信号（响度 loudness、亮度 brightness、音高 pitch）加文本提示生成高质量声音。可以从「声音模仿」（比如人声模仿或参考声音形状）合成任意声音
- **Mix2Morph**：一个文本到音频的扩散模型，微调后可以做**声音变形（sound morphing）**，而且不需要专门的变形数据集。做法是在更高扩散时间上对含噪的代理混合进行微调

**Mix2Morph 这条对我特别有意思**：它用的是扩散模型 + 在噪声域上操作，跟我 Path B（用 ACE-Step 冻结速度场做 ODE inversion）在数学结构上是相邻的问题。他们在做「怎么用扩散模型生成」，我在做「怎么用扩散模型的反演来检测」。

## Bryan Pardo 本人

- 博士：密歇根大学计算机科学
- 硕士：密歇根大学**爵士乐与即兴演奏音乐硕士（Master of Music in Jazz and Improvisation）**
- 教授的课程：Deep Learning、Machine Learning、Generative Modeling、**Digital Musical Instrument Design**、Machine Perception of Music、Computer Audition、Computational Creativity
- 联合领导 Northwestern Center for Human Computer Interaction + Design
- 在音乐理论与认知系有兼职任命
- 发表 180 篇以上论文，多项专利
- 曾为俄亥俄州立大学听力与言语系开发语音分析软件，为 SPSS 开发统计软件，在 General Dynamics 做机器学习研究员
- **不编程不写作不教书的时候，他在全美各地演奏萨克斯和单簧管**，演出场地包括芝加哥文化中心、底特律 Concert of Colors、芝加哥世界音乐节、Bloomington 的 Lotus Festival、图森的 Rialto Theatre

## 为什么这是我名单上最该发邮件的人

三重契合：

1. **方向**：生成建模 + 音频 + 信号处理，正好是我论文的三个支柱
2. **地理**：埃文斯顿，红线一小时可达。可以真的去见面、去听 talk、甚至旁听课，这是纽约和洛杉矶的实验室做不到的
3. **身份共鸣**：他是有爵士乐硕士学位、还在演出的计算机教授。我是做音乐、写诗、也做 ML 的本科生。**这是极少数不会觉得「你搞音乐」是简历噪音的人**，恰恰相反

第三点是真正的杠杆。给大多数 CS 教授写信，我的音乐制作背景是需要淡化的东西；给 Pardo 写信，那是共同语言。

## 冷邮件怎么写

- **不要写成求职信**。写成一个技术问题的开场
- 切入点：Mix2Morph 和 Sketch2Sound 都在做「用扩散模型控制音频生成」。我在做的是它的对偶问题：**用扩散模型的反演来检测生成**。可以问他对「ODE inversion 作为检测信号」这条路线的看法
- 附上：durunbao.com、一页项目摘要、ACL ARR 那篇的引用
- 提一句我在做音乐制作，但放在信的后段，不要开头就说
- 明确提出一个低成本的请求：能不能去听一次实验室 group meeting，或者聊 20 分钟
- 时间点：秋季学期中（10 月左右），避开学期头两周和期末

## 可能的形态

- 旁听 group meeting
- 访问学生 / 校际研究合作（UChicago 与 Northwestern 之间有先例）
- 旁听他的课（Machine Perception of Music、Computer Audition 这类，需要查跨校选课政策）
- 最低限度：一封有内容的推荐信来源，或者一个能读我论文草稿的外部读者

## 与研究生申请的关系

Northwestern 目前不在我的申请名单上（UChicago 4+1、Harvard CSE / Data Science、Penn DATS / CIS MSE）。**如果这条线建立起来，Northwestern 应该加进去。** MLDS（Master of Science in Machine Learning and Data Science）是麦考密克工学院下的项目，值得单独查。

## 冷邮件连接候选（[phone] 调研，出版物页全量过了一遍）

五个候选，**已拍板用 ②**：

1. **Code Drift（ICASSP 2025）**：幂等神经 codec ↔ 你的「检测器学的是 codec 家族指纹」。问题：codec 幂等化会抹掉还是冻结指纹
2. **MaskMark（ICASSP 2024）+ Deep Audio Watermarks are Shallow（ICLR 2025 WS）**【选定】：他们证明事后水印是浅的；你的内生家族指纹是它的镜像。问题：溯源该住在人为水印里还是生成器甩不掉的指纹里
3. **AI-tribution（AIES 2026）+ Exploring Musical Roots（ISMIR 2024）**：训练数据归因 ↔ 你的生成器归因 + MCSC 会员的利益相关方身份
4. **VampNet / The Rhythm In Anything / SMORPH**：可控生成 ↔ MuseV2 的 conditioning 设计（DAG 采样器）
5. **Text2FX / HARP 2.0 / FXplorer**：语言驱动音频工具 ↔ Lyra + Audit Copilot

①②都指向 Patrick O'Reilly 与 Pardo 的合作线，说明实验室火力正对你的领域。没用上的③④⑤留给 SOP、面试、或第二封跟进邮件。

**②的两篇论文已独立核实（[phone]，arXiv 与实验室官网一手页面）**：MaskMark（O'Reilly、Jin、Su、Pardo，ICASSP 2024，乘性频谱掩码嵌入密钥）；Deep Audio Watermarks are Shallow（同一四人，ICLR 2025 GenAI Watermarking Workshop，arXiv 2504.10782），摘要证实事后水印「susceptible to removal attacks」，且不知方案也能以极小音质损失击破。同一批人先建后拆，信里的论证支点站得住。

## 冷邮件定稿（校对版，[phone]）

**发送状态：待确认**（截至 [phone] 未收到反馈）。原定发送窗口 9 月下旬。发前把 MaskMark 和 arXiv 2504.10782 读一遍。

Subject: Watermarks vs. fingerprints: a question about audio provenance from a UChicago senior

Dear Professor Pardo,

I hope this email finds you well. I apologize in advance for sending you a bulky email during the summer break. I was getting too excited about the work that your lab does.

I'm a senior at the University of Chicago majoring in computational and applied mathematics. I have been producing music for six years, which led to my huge interest in exploring music in an ML setting. I am doing research on detecting AI-generated music, supervised by Prof. Blase Ur from the Computer Science Department of UChicago. I'm writing because your group has been working on the exact question I keep circling, from the other side. MaskMark builds robust watermarks for real and synthetic speech, and your ICLR workshop paper then showed how shallow post-hoc watermarks can be. My thesis takes up the question that result implies: if deliberate marks can be washed out, what provenance signal survives?

In a content-locked comparison (21,500 Suno tracks plus six other generators prompted identically), detectors turn out to learn generator-family fingerprints rather than any universal "AI" signal. These fingerprints are intrinsic, structural, and nothing anyone chose to embed, which makes me wonder whether they are more robust than deliberate watermarks, or just differently fragile. I would genuinely value your read on where provenance should live: in marks we embed, or in fingerprints generators can't help leaving.

Most of my other work is music infrastructure from the generation side. I'm one of four founding members of MuseV2, an open text-to-music model at Fudan University's NLP lab, where I lead the design of the structured prompt dataset generator and am now working on model construction and training. At Fudan's audio and music technology lab (FD-LAMT), I helped build an LLM agent that automates the processing and logging of a large multi-track Chinese-pop dataset. I also built and deployed Lyra, a platform where you upload a song and talk with a model that listens through a custom audio pipeline. I co-authored an LLM ethics study now under revision for resubmission to ACL ARR, and I produce music myself (13M+ streams).

Might I ask for twenty minutes of your time to talk about the Interactive Audio Lab? I'm in Hyde Park, one Red Line ride from Evanston, so in person works too. I graduate in May 2027; if the lab hosts visiting students (and more importantly, a visiting undergrad :D), I'd be glad to learn more. You can also visit durunbao.com, a personal website I made that includes most of my recent projects.

Best,
Runbao (Frank) Du

## 我的行动

1. 秋季前读完 Sketch2Sound 和 Mix2Morph 两篇论文
2. 查实验室是否有公开的 seminar 或 group meeting 时间
3. 10 月发第一封邮件
4. 查 UChicago 与 Northwestern 之间的跨校选课 / 访问学者政策
5. 评估要不要把 Northwestern MLDS 加进研究生申请名单

## 待确认

- 实验室是否接收非西北的本科访问学生
- 他秋季开哪些课，以及是否允许旁听
- 组会时间与地点
