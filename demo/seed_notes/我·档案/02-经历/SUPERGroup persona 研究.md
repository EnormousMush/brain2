# SUPERGroup persona 研究

**一句话**：研究一段简短的用户自我描述（persona）会在多大程度上改变大语言模型完成任务的方式。

- **正式题目**：The Effects of Value-Laden Persona Descriptions on LLM Value Inferences and Task Completion
- **时间**：2025 年 11 月至今，**还在做**（[phone] 拍板；个人网站写的 May 2026 结束是错的，待更新）
- **角色**：Research Assistant / 研究员
- **实验室**：UChicago SUPERGroup（[[Blase Ur]] 的组）
- **作者列表**（论文 draft 署名）：Allison Row、Madison Pickering、**Runbao Du（第三作者）**、Alexander Haniph、Arjun Arunasalam（Florida International University）、Blase Ur
- 代码与数据已在 OSF 匿名开源（论文脚注给了链接）

## 摘要（网站上的原文，你自己写的）

人们越来越多地把日常任务（比如修改邮件、征求推荐建议）交给大语言模型来完成。由于完成这些任务时隐含的许多决策都反映了人的价值观，我们想知道：一段简短的用户自我描述会在多大程度上影响 LLM 完成任务的方式。

- **实验一**：测试的**八个 LLM** 从 **33 个 persona** 中共推断出 **2,583 个不同的价值观**，归纳为 **162 个聚类**
- **实验二**：测试这些 persona 如何影响八个 LLM 完成 **33 项任务**

**结论**：几乎任何 persona，即使看似与任务无关，都会改变 LLM 完成任务的方式；与任务相关的 persona 造成的改变更大。也就是说，几句暗示特定价值观的话就能让 LLM 以截然不同的方式完成同一项任务，这在个性化与刻板印象之间形成张力。

## 我具体做了什么（来自 CV）

- 通过 persona 与情境描述，考察 8 个主流大语言模型在基于价值观推理中的行为表现
- 实践 prompt engineering 与输出格式化，大批量解析及分析文本数据

## 结果

- 上面那组数字（8 模型 / 33 persona / 2,583 价值观 / 162 聚类 / 33 任务）是可引用的硬结果
- **投稿状态**：**2026 年 5 月轮投了 ACL ARR（Submission 13119），meta-review 2.5（borderline），决定改版重投 10 月轮**
- 论文里比网站摘要更硬的几个数字：同一 primer 重采样下推断值画像几乎不变（**平均余弦 0.984**），换个说法表达同一价值就剧烈漂移（**0.558**）；2,583 个值里**只有 99 个（3.83%）被全部 8 个模型共享**

## ARR 2026 年 5 月轮战报（10 月改版的作战地图）

三位审稿人分差极大：**M4Uw 给 4.5（borderline award，soundness 4.5）**，tZeS 给 2（soundness 2），14F3 给 1.5（倾向拒稿）。AC 采纳了 14F3 的核心批评但认为可以通过 reframe 解决。

**三条核心批评**：

1. **因果归因没被设计所支撑**（14F3，AC 背书，最重的一条）：标题和框架断言是「价值观」驱动了行为漂移，但 persona 是个混合包（词汇、话题、语域、具体度、token 数），从 no-persona 到 persona 同时改变了内容和「多了一段第一人称前言」两件事，presence effect 和一般性 prompt 敏感性没分开。审稿人认为「要么混淆、要么不新」
2. **下游任务全是选择题**（M4Uw，AC 点名）：比开放式任务好评估，但离真实使用远
3. **刺激材料的构造标准不透明**（tZeS）：value anchors 怎么选的、primers 怎么验证的、relevant/irrelevant 怎么定的，标准没写清

**队里回应的亮点**（这些也是你可以在面试里讲的防守）：

- 用 Kaleido（人类验证过的独立分类器）做了事后校验：99 个 primers 全过其相关性阈值（均分 0.974）；relevance 标签与 Kaleido 一致性 κ=0.522、AUC=0.825，irrelevant 标签 94% 被确认
- 排除了三个可命名的混淆（词汇重叠 TF-IDF、语义重叠、primer 长度）：relevance 标签的预测力比三者都强（AIC 295 对 329 至 354），控制三者后效应仍显著（系数 0.113 到 0.096，p<.001）
- 承认漏引 Value Kaleidoscope 是重大疏忽；同意软化因果语言、把 162 clusters 降格为可靠性度量而非分类学贡献

**10 月改版的方向**（从 meta 和回应里读出来的）：reframe 标题与贡献（从「价值观驱动」退到「估计的增量效应」）、补 Value Kaleidoscope / CLASH / DailyDilemmas 引用、Kaleido 验证进附录、若干行文修正（去掉内部 persona 名字等）。

## 能拿来说的素材

- 「8 个 LLM 从 33 个 persona 推断出 2,583 个价值观、归成 162 个聚类」，数字密度高，一句话就能让人知道这是个真做过的实验
- 「个性化与刻板印象之间的张力」是一句好的结论表述，同时点到技术和伦理
- 这条和你 AI 音乐那条共享一个底层关切：**AI 在替人做带价值判断的事**。这是把你的两条研究线串起来的那根线，**待你确认是否认同这个说法**
- 被最严的审稿人也认可的那个发现（同 primer 稳定 0.984、换措辞漂移 0.558）是这篇最结实的一句话，对外讲用它
- SOP/SOI 里提这篇的措辞：under revision for resubmission to ACL ARR（October 2026 cycle）。SOI 母本里那条 FLAG 说过「能写状态就写状态」，现在能写了

## 关联

[[Blase Ur]]

来源：durunbao.com 的 research 一节、cv.pdf、cv-zh.pdf；论文 draft（LLM_Values__Personalization.pdf，[phone] 上传）；ARR May 轮 meta-review、三份审稿与作者回应（OpenReview，Frank [phone] 提供）。
