# Müller 2024

**定位**：跨生成器崩塌 = different 不是 harder

**引用:** Müller et al., *Harder or Different? Understanding Generalization of Audio Deepfake
Detection*, INTERSPEECH 2024, arXiv 2406.03512。**跨生成器崩塌的理论支柱:崩不是因为"更难",
是因为"不一样"。**

#### 核心问题与分解
跨域掉分,是新生成器**更难检测**(hardness),还是**特征根本不同**(difference)?他们把性能差距
数学分解:**总差距 = 难度差距 + 差异差距**——
- 难度差距 = 域内训测 D→D 与 D'→D' 的差(两个数据集各自"有多难");
- 差异差距 = D'→D' 与 D→D' 的差(模型跨过去时**额外**损失的部分 = 纯域偏移)。
协议:ASVspoof 2019 LA 训练,测 ASVspoof 2021 LA / 2021 DF / In-the-Wild;
4 个架构:LCNN、RawNet2、Whisper-DF、SSL-W2V2。

#### 关键数字(EER 分解)
| 场景 | 难度差距 | 差异差距 | 判决 |
| --- | --- | --- | --- |
| ASVspoof 2021 LA | 0.6–7.2% | 9.9–15.9% | 差异主导 |
| ASVspoof 2021 DF | 0.1–1.7% | **14.0–25.0%** | 差异独占 |
| In-the-Wild | **≈0**(−0.5–0.1%) | **30.2–79.7%** | 差异独占 |

→ 对未见攻击,"性能差距几乎完全归因于 difference"。**新伪造并没有变难,只是长得不一样。**

#### 结论与建议
- **堆模型容量救不了跨域**——问题不是"不够强",是"看错了地方"(捷径/数据集特征不迁移);
- 研究该转向:理解并消除**数据集专属 artifact 与捷径**;
- 一线希望:**SSL 预训练前端**(W2V2/Whisper)的差距较小 → 预训练特征更可迁移。

#### 对我们的意义
1. **正式回答"换 AASIST/SpecTTTra 会不会解决跨生成器"——不会**,这是标准引用出处;
   也是 reviewer 问"为什么不上更大模型"时的答案。
2. 我们的跨生成器矩阵(见 生成器混淆 §7)= 这个"difference 主导"结论的**音乐版实例**,
   且我们进一步给出了差异的**结构**(制作现代度轴 + Suno 专属成分)——比语音侧的分解更进一步,
   这是我们的"不一样"。
3. 他们的分解协议可以直接搬:等我们有多个 AI 源(ACE-Step 等),可以做音乐版的
   hardness/difference 分解——**前人没在音乐上做过**。
4. "SSL 前端差距小"与我们用冻结 MERT 的选择互相印证。

## 关联

[[deepfake-detection]]
[[confounder]]
[[evaluation-metrics]]
