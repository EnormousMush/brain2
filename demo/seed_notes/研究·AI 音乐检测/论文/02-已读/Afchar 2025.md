# Afchar 2025

**定位**：首篇公开的 AI 音乐检测器(Deezer)

#### AI-Generated Music Detection and its Challenges
**引用:** Darius Afchar, Gabriel Meseguer-Brocal, Romain Hennequin (Deezer). *AI-Generated
Music Detection and its Challenges.* IEEE ICASSP 2025. arXiv:2501.10111 ·
代码 github.com/deezer/deepfake-detector · 首篇公开的 AI-音乐检测器论文。

#### Main Methodology
不直接分"AI vs 人类",而是分"**原曲 vs 它自己过一遍神经自编码器的重建版**"。因为重建版与原曲
**内容、码率、压缩全一致**,分类器只能学到**神经解码器的痕迹**——而 AI 音乐(也出自神经解码器)
天然带这种痕迹,于是在真实 AI 上直接可用。见证成绩 99.8%,连没训过的 MusicGen 也 99.9%。
**但跨解码器家族几乎完全失效**——学到的是"解码器指纹",不是"通用 AI 痕迹"。
"**每首 vs 它自己的重建**"是一个**原则性 de-confounder**:同内容、同制作、同码率,唯一差异
就是生成痕迹。它绕开了"AI 数据和人类数据 content/production/年代混淆"这个根本混淆

#### 方法
- **数据**:FMA-medium **25,000 首**(MP3 44.1kHz);每首生成 **9 种重建 + 原曲** →
  **~250,000 条**。划分 70% / 10% / 20%。
- **重建用的 9 个自编码器**:
  - **EnCodec** @ 3 / 6 / 24 kbps
  - **DAC**(音乐用 LAC 变体)@ 2 / 7 / 14 kbps
  - **Musika** decoder(polar spectrogram)
  - **GriffinMel**(mel + Griffin-Lim 相位重建,256 & 512 mel-band)
- **关键控制**:重建**存成与原曲相同的码率/压缩** → 内容 + 压缩被锁死,
  "same content + same compression, only the AE artefacts remain" → 只剩解码器痕迹(可排除 genre 等混淆)。
- **分类器**:6 层卷积 `[16,32,64,128,256,512]`,kernel 3,pool 2,average-pool + 2 层全连接。
  **最佳输入 = 幅度谱(amplitude spectrogram)**。作者强调高分后没堆复杂模型,而是去做 sanity-check。

#### 结果
- **原曲 vs 重建:99.8%**(幅度谱模型)。
- **未见过的纯生成模型 MusicGen**:50 首 / 2,500 片段 → **99.9%** 检出
  (证明"训在自编码重建上"能泛化到"完全由 prompt 生成、没被 auto-encode"的音乐)。

#### 局限 / 失败模式
1. **跨解码器家族崩溃**:同家族(EnCodec 跨码率)迁移好;**跨家族**(如 GriffinMel→DAC)
   "performances are almost always zero" → 学的是**解码器指纹**,不是通用 AI 痕迹。
2. **抗扰动差**:pitch-shift(±2 半音)、加白噪声、MP3 重压(64kbps)都会大幅掉分;
   对 time-stretch / EQ / reverb 相对稳。
3. **"没痕迹就默认判真"**:扰动把痕迹掩盖后,模型"predicted the real class for most samples"——
   它靠**检测每个 AE 的特定痕迹**工作,找不到就默认 real。→ 对**未知/新解码器**会漏判成人类。
4. 需要**持续更新**以覆盖新出现的生成器。

## 关联

[[deepfake-detection]]
[[confounder]]
[[audio-tokenizer]]
