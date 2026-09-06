# OpenMOSS 2026

**MOSS-Audio-Tokenizer: Scaling Audio Tokenizers for Future Audio Foundation Models** · MOSI.AI / OpenMOSS 团队 · arXiv 预印本 · https://arxiv.org/abs/2602.10934 · https://github.com/OpenMOSS/MOSS-Audio-Tokenizer · 权重 https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer

## 它做了什么

**核心主张：现有音频 tokenizer 都在拄拐，而拐杖会变成 scaling 的天花板。**

论文把这些拐杖归成三类。一是**预训练 encoder**，直接把 HuBERT / WavLM / Whisper 的 encoder 搬来当 codec 的 encoder（XCodec2.0、Higgs-Audio-Tokenizer、DualCodec）；毛病是规格被别人定死了扩不动，而且那个 encoder 是为理解任务训的，会主动丢掉相位和音色纹理这些重建必需的信息。二是**语义蒸馏**，加一项损失让 RVQ 第一层去模仿 HuBERT 特征（SpeechTokenizer、Mimi、Qwen3-TTS-Tokenizer）；毛病是天花板等于老师的水平，而且老师的偏见一起继承，这就是为什么 Table 1 里 SpeechTokenizer 的 Sound 和 Music 两栏是叉。三是 **CNN 归纳偏置或异构架构**，CNN 自带局部性和平移不变两个假设，小数据上收敛快，但免费的先验也是固定的先验，而且 CNN 和 Transformer 混着用时两者的 scaling 规律不同，不知道该往哪儿加算力。

**CAT 架构（Causal Audio Tokenizer with Transformer）三个激进选择：**

1. **全 Transformer，CNN-free**。encoder 和 decoder 都是纯 causal Transformer 堆的，Table 1 里唯一一个 encoder/decoder 都标 Trans. 的。
2. **直接吃 24 kHz 原始波形**，不经过 mel 谱这类人为设计的中间表示。
3. **严格因果**。每个 token 只能看过去，带来流式能力和训练推理一致性，也天然对齐下游自回归 LLM。

**Patchify 分级压缩**是从 24000 点降到 12.5 帧的关键。不是一次压到位，而是在 Transformer block 之间反复插入 patchify 逐级降分辨率。理由是一次到位的话那个线性层没有任何上下文，只能瞎压；分级压缩下每压一次都有 Transformer 在那个尺度上重新整理信息，把重要的挪到会被保留的位置。这其实和 CNN 的卷积加池化是同一个结构，只是把卷积换成 Transformer、池化换成 patchify，所以 CNN-free 不等于放弃层级。

**RVQ 32 层 + quantizer dropout**。每层码本 1024 条（10 bit，从论文说的 0.125 到 4 kbps 反推得出），32 层组合起来表达力是 1024 的 32 次方。quantizer dropout 让训练时随机只保留前 K 层，于是一个模型天然支持全比特率区间。比特率算法是 `帧率 12.5 × 层数 N × 每层 10 bit`。

**语义不靠蒸馏，靠大规模 audio-to-text 监督。** 拿一个 0.5B 的 decoder-only LLM 接在 quantizer 输出上，让它自回归预测文本，任务包括 ASR、多说话人 ASR 和 audio captioning，每个任务前面挂一个 task tag。逻辑是：如果小 LLM 光看你的 token 就能准确转录，说明 token 里必然编码了充分语义。加 captioning 那一项正是为了让音乐和环境声也有语义监督，补上 SpeechTokenizer 缺的那块。

**六项损失联合端到端优化**：`L_G = λ_sem·L_sem + λ_rec·L_rec + λ_cmt·L_cmt + λ_code·L_code + λ_adv·L_adv + λ_feat·L_feat`。L_sem 是上面那个交叉熵；L_rec 是多尺度 mel 谱损失，窗长从 2 的 5 次方到 11 次方共七个尺度，因为时频不确定性原理下一把尺子量不全；L_cmt 和 L_code 是解决量化不可导的两股对拉力，区别只在 stop-gradient 套在谁身上，前者冻住码本推 encoder、后者冻住 encoder 推码本；L_adv 和 L_feat 是对抗损失与特征匹配，沿用 XY-Tokenizer 的判别器。量化用 factorized VQ，码本直接梯度下降更新，不需要 EMA。**encoder、quantizer、decoder、判别器以及那个 0.5B LLM 全部一起端到端优化。**

顺手做了 **CAT-TTS** 证明 tokenizer 好用：Temporal Transformer（Qwen3-1.7B 初始化）管时间维、Depth Transformer（4 层随机初始化）管同一帧内 RVQ 层间的粗到细结构。配套提出 **Progressive Sequence Dropout**：训练时以概率 p 触发，触发时均匀采样前缀长度 K 并丢掉后面的层，损失只在保留的前缀上算，推理时指定 K_infer 即可控制比特率。训练数据是 VoxBox 加内部数据约 20 万小时。

## 结论

**重建（Table 2）。** 低比特率档约 1000 bps，MOSS 用 12.5 Hz 帧率 8 层，SIM 英/中 0.88 / 0.81、STOI 0.94 / 0.91、PESQ-WB 2.87 / 2.43，全面领先 SpeechTokenizer（0.36 / 0.25）、BigCodec（0.84 / 0.69）和 Mimi（0.74 / 0.59）。高比特率档 4000 bps 用满 32 层，SIM 0.97 / 0.93、STOI 0.97 / 0.96。**注意它是在 12.5 Hz 这个最低帧率上做到最好的**，别人靠 50 到 80 Hz 的高帧率堆质量，它用六分之一的序列长度反超。

**TTS（Table 3，Seed-TTS-Eval）。** CAT-TTS 的 SIM 是全表最高，英文 73.1、中文 78.5，超过 MaskGCT（71.7 / 77.4）和 IndexTTS2（70.6 / 76.5）；WER 英文 1.89、CER 中文 1.23。论文最得意的一句是**这是第一个纯自回归的离散 TTS 系统超过非自回归和级联系统**，因为过去几年的共识是纯 AR 离散路线质量上不去，得靠 AR+NAR 级联或扩散流匹配。

**Progressive Sequence Dropout。** p 取 0.25 / 0.5 / 1.0 效果基本一样，但 p 越大训练显存越省，所以直接用 p=1.0。而 p=0 的模型比特率一降就崩，SIM 和 WER 都陡降，因为训练推理失配。

**Scaling 三条（本文最有方法论价值的部分）。** 第一，端到端优化才能 scale：对比"冻结 encoder 和 quantizer、只训 decoder 和判别器"这种前作常用的部分优化，后者很快压平饱和，端到端训到 50 万步四个指标还在涨。第二，参数量和量化容量必须同步扩：hidden dim 取 256 / 384 / 512 / 768 对应 319M / 505M / 710M / 1169M，反常识的发现是低比特率下 1169M 反而可能不如小模型跑高比特率，因为系统性能由最窄的瓶颈决定。第三，batch size 从 2 的 0 次方扫到 8 次方，固定总步数下 batch 越大质量严格越好，且大 batch 到 25 万步仍在强劲上升，说明算力可以直接换质量。

## 局限

- **1.6B 的 tokenizer 本身就很重。**它是给下游模型当接口用的，可这个接口自己就有 16 亿参数，推理成本不可忽略，论文没讨论这个代价。
- **复现门槛极高。**300 万小时带文本标注的音频，绝大多数团队拿不到。所以"端到端优于拄拐"这个结论对小团队可能根本不成立，他们没有那个规模，拐杖仍然是理性选择。这篇的结论其实是有前提的，但论文表述得像普适真理。
- **没有明确的 limitation 章节**，技术报告的通病。
- **和解耦路线的张力没被正面回应。**MOSS 的 token 语义和声学是混在一起的，可 CAT-TTS 的 SIM 却是全表最高。它究竟靠什么保住音色的，论文没有拆解，只给了结果。
- MTP 那条线不是它做的，但同样的问题它也没答：**事前压缩（低帧率 tokenizer）和事后打包（多 token 预测）哪种更优**，没有对照实验。

## 对我意味着什么

- **和上一篇（Fan 2026）不矛盾，两者共同的敌人是"没有语义监督的纯声学 codec"。**Fan 2026 真正证明的不是解耦优于耦合，而是 **token 里必须有清晰的语义结构**。解耦只是获得语义结构的一种手段（架构隔离），MOSS 是另一种手段（300 万小时 audio-to-text 硬灌）。真正的对立轴是：语义该靠**设计**得到，还是靠**规模**得到。这是深度学习里反复上演的手工先验对规模的老剧本。
- **以后看任何表征，先问一句：它的语义信息是哪来的。**蒸馏？架构隔离？大规模监督？还是根本没有。这个问题会一路用到 SVS 和 SVC。
- **低帧率是硬通货，12.5 Hz 是当前的收敛点。**Mimi、XY-Tokenizer、Qwen3-TTS-Tokenizer、MOSS 都是 12.5，MiMo 和 Higgs 是 25。因为下游 LLM 的上下文长度按时间步算，压时间轴的收益是平方级的。MOSS 把表达力转移到深度轴，用 Depth Transformer 单独处理，这个"把负担从序列长度转移到每步复杂度"的思路值得抄。
- **dropout 类训练是个通用套路。**quantizer dropout 在 tokenizer 侧、Progressive Sequence Dropout 在生成模型侧，本质都是**训练时就暴露在退化条件下，推理时才不会崩**。这个套路在 SVC 那边会以 Seed-VC 的 timbre shifter 形式再出现，都是训练时故意制造扰动。
- **判断一个架构能不能 scale，看曲线饱和没有，而且必须多个旋钮联合扫描。**很多人只调一个旋钮发现没用就下结论"不能 scale"，实际可能是另一个旋钮卡死了。这条方法论比论文的结论本身更值钱。

## 关联

[[audio-tokenizer]]
[[slm]]
[[scaling-law]]
[[gan]]
[[distillation]]
[[evaluation-metrics]]
[[audio-ml]]
