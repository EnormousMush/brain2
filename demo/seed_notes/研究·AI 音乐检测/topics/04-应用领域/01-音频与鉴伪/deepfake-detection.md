# deepfake detection

**一句直觉：一台「AI 语音测谎仪」**

深伪检测就是判断一段音频是真人说的、还是 AI 合成/克隆的。学术圈的正式名字叫 anti-spoofing（反欺骗）或 spoofing countermeasures（CM），主战场是 ASVspoof 挑战赛（每两年一届的行业标杆）。

**通用做法**

- 数据集：ASVspoof 2019/2021、In-the-Wild 是标准 benchmark，里面有真人语音（bonafide）和各种 TTS/语音转换生成的假语音（spoof）。
- 模型：经典骨干是 AASIST（基于图注意力的时频网络，见 [[attention]]）、RawNet2，以及现在流行的 SSL 前端（wav2vec 2.0、WavLM 这种自监督预训练特征）+ 后端分类器，还有 BEATs 这类音频预训练模型。
- 指标：EER（等错误率，把「漏判假的」和「错判真的」两种错误率调到相等时的那个值，越低越好，细节见 [[eer]]）。
- 核心难题：泛化（generalization），模型在训练见过的伪造方法上很准，一换成没见过的新生成器就容易崩。还有 shortcut learning（捷径学习），模型学到的可能是数据集里的无关线索（比如静音段长度、录音底噪），而不是真正的伪造痕迹，这正是 [[confounder]] 里那套「模型抄近道」的问题。

**OfSpectrum 的差异点**

- 帧级检测（frame-level detection）：不只给整段一个真/假标签，而是能定位到音频里具体哪一小段是 AI 生成的。这对付「部分伪造/拼接」很关键，比如一段真人录音里被插了几秒 AI 合成的话。
- 轻量化，能上手机：很多 SOTA 模型很重，他们主打优化到能在移动设备实时跑。
- 拿过多个国际比赛的奖，并且自己主办/赞助 ESDD、ESDD2 挑战赛，还发布了 SynSFX 数据集，说明他们在环境声/音效的 deepfake 这个细分方向既是参赛者也是规则制定者。

**技术 pipeline**

原始波形 → 前端特征（SSL 模型如 wav2vec2 提取的表示，或直接 raw waveform）→ 后端（AASIST 这种图注意力网络）→ 输出真/假分数。帧级检测要求模型输出一个时间序列的分数（每帧一个），而不是单一标量，所以不能一上来就 [[pooling]] 成一个向量、得在时间维度保留分辨率。EER 的计算是调判决阈值，当 FAR（把假的当真）= FRR（把真的当假）时的错误率。泛化难点的根源是域偏移（domain shift）：新生成器、新录音环境、新后处理都会让测试分布偏离训练分布。这条判别式路线（学真假边界）和 [[flow-matching]] 那种生成式密度路线（只学真实分布、把偏离当异常）正好是两种哲学。

**一个反直觉的坑：水印会让检测器变笨**

有篇论文《The Impact of Audio Watermarking on Audio Anti-Spoofing Countermeasures》专门研究了这个。荒诞之处在于：[[audio-watermarking]]（为了版权）和深伪检测（为了打假）本是两个各干各的好人技术，但现实里一段音频完全可能既被加了水印、又要被送去检测真假，这是第一个系统研究「水印会不会干扰检测器」的工作。

他们造了个 WSD 数据集（Watermark-Spoofing Dataset），拿现成的反欺骗数据集（ASVspoof 2019/2021、In-the-Wild），用各种水印方法（传统的和神经的都有）去处理，真人和假音频都按比例加水印，再拿三个 SOTA 检测器测「水印比例越高，EER 怎么变」。核心发现是水印一致地拉低了检测性能，水印密度越高 EER 越高。原因是水印虽然人耳听不到，但它改变了音频的底层信号分布，给检测器制造了一个它没见过的域偏移。他们的解法是 KPWL（Knowledge-Preserving Watermark Learning，知识保持的水印学习），让检测器适应水印带来的分布变化、同时不忘记原本学到的辨伪知识，避免灾难性遗忘。

**一句话总结**：深伪检测是判别式的「AI 测谎仪」，靠 ASVspoof 数据集和 AASIST/SSL 骨干、以 EER 计分，最大的敌人是泛化和捷径学习，而水印这种听不见的扰动会制造域偏移把检测器带崩，需要 KPWL 这类手段去适应。

## 关联

[[attention]]
[[audio-ml]]
[[audio-watermarking]]
[[confounder]]
[[eer]]
[[flow-matching]]
[[pooling]]
[[music-generation-pipeline]]
[[neural-vocoder]]
