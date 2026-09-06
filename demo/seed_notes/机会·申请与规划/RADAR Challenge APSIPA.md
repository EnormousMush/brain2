# RADAR 挑战赛 (APSIPA Grand Challenge)

全称：**Robust Audio Deepfake Recognition under Media Transformations**，媒体变换下的鲁棒音频深伪识别。

- 官网：https://radar-challenge.github.io/
- 平台：Codabench
- 归属：APSIPA Grand Challenge，成果在 APSIPA ASC 上发表

## 2026 届（已结束，作为 2027 的参照）

- **报名截止**：2026 年 4 月 10 日
- **论文截止**：2026 年 5 月 15 日
- 成果发表于 **APSIPA ASC 2026**，越南河内
- 参赛资格：**欢迎学术界与产业界团队，以及独立研究者**。这一点很关键，不需要机构背书

## 数据规模与设置

- **超过 100,000 条语句**
- **六种语言**：英语、新加坡英语、普通话、台湾普通话、日语、越南语
- 考察的媒体变换：**压缩、重采样、噪声、混响**

## 为什么这个跟我的论文是同一个问题

我论文里最难的部分不是「干净的 Suno 音频能不能被检测出来」，而是**「经过压缩、重编码、重采样之后还能不能检测出来」**。因为真实世界里没人拿 WAV 传播，都是 Spotify / YouTube / 抖音的有损编码。

RADAR 的整个设计就是围绕这个问题：media transformations 下的鲁棒性。所以：

1. 打这个榜等于给我论文的鲁棒性章节做了一次外部验证
2. 榜上的名次是可以写进简历、SOP 和求职信的硬指标
3. 它的多语言设置（六种语言）会暴露我的方法在跨语言上的弱点，这本身是论文里值得写的一节

## 与我方法的差异（要注意的）

- RADAR 是**语音**（speech）深伪，我做的是**音乐**（尤其是 instrumental）
- 我的 AASIST baseline 和 wav2vec2 编码器在语音域上本来就是原生的，所以迁移成本低
- 但 MERT 和 MuQ 是音乐向的自监督模型，在纯语音任务上可能反而拖后腿
- 所以打 RADAR 更像是**验证我的 pipeline 工程正确性**，而不是验证音乐特化的部分

## 相关的姊妹挑战赛（一并记）

- **ESDD（Environmental Sound Deepfake Detection）**：环境声深伪检测。ESDD 2026 承接 ICASSP 2026 Grand Challenge，时间线 2025 年 9 月至 11 月，两页论文 2025 年 12 月至 2026 年 1 月截止。评测方案见 arXiv:2508.04529。baseline 是 AASIST 和 BEATs+AASIST。**注意：ESDD / ESDD2 与 OfSpectrum 有直接关联**，他们与杜克昆山大学李明教授实验室合作办过这个系列，ESDD2 已于 2026 年 6 月结束
- **SAFE（Synthetic Audio Forensics Evaluation）**：见单独笔记。三个递进难度任务：原始合成语音、压缩重采样后、洗白（laundering）后
- **ASVspoof 系列**：语音反欺骗的老牌挑战赛，ASVspoof 5 已完成
- **ADD（Audio Deepfake Detection）**：中文语境的深伪检测挑战赛
- **ImageCLEF 2026 Deepfake Detection and Generation**：含音频模态。报名 2026 年 1 月 26 日开放、4 月 23 日截止；检测任务 4 月至 5 月；参与者论文 5 月 28 日截止。https://www.imageclef.org/2026/deepfake-detection-and-generation

## 我的行动

1. **现在就去 radar-challenge.github.io 注册邮件通知**，等 2027 届公告
2. 按 2026 年的节奏推，2027 届报名可能在 4 月上旬，论文在 5 月中旬。这个时间点跟我毕业答辩重叠，要提前评估
3. 在等待期间，先用 RADAR 2026 的公开数据（如果有）跑一遍我的 pipeline，测试鲁棒性
4. 更实际的短期动作：**先打 ImageCLEF 2026**（1 月 26 日开放报名），那个的时间点在冬季，不跟毕业冲突

## 待确认

- RADAR 2027 是否举办，以及时间线
- RADAR 2026 的数据集是否在赛后公开可用
- ESDD3 是否有新一轮
