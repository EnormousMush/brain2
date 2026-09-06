#### Melody or Machine: Dual-Stream Contrastive Learning

**引用:** Batra et al.(IIIT-Delhi 等),arXiv 2512.00621。**最大最diverse的歌曲深伪基准 + 专设 OOD 协议。**

#### TL;DR
两个贡献
- **MoM 数据集**(130,435 首 / 6,665 小时,9 种生成器,**训练和测试用完全不同的生成器**)
+ **CLAM 模型**([[MERT]] + [[wav2vec2]]2 双流 + 对比学习)。CLAM 在 MoM 上 F1 **0.925**(前 SOTA 0.869), SONICS 上 0.993。

#### 数据集(专为泛化设计)
- **65,475 真**(含**人类翻唱**当难负样本)+ 64,960 假;平均 196s;多语(82% 英语);
- **生成器隔离**:训练 = Suno v3.5 / Suno v2 / DiffRhythm / Udio v1.5;
  **OOD 测试 = Riffusion (FUZZ-1.0) / Suno v4 / Suno v3 / Yue / 声音克隆**;
- SpecTTTra 在其 OOD 上的惨状:**Riffusion F1 53.46 / 声音克隆 50.94 / Suno v4 64.58 / Yue 68.80**
