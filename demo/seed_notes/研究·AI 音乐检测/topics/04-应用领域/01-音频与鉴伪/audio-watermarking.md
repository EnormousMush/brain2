# audio watermarking

**一句直觉：把隐藏信息塞进音频，人耳听不出、机器能提取**

音频水印的核心目标就一句话：把一段隐藏信息塞进音频里，人耳听不出异样，但机器能把它读出来。用途包括版权保护、盗版溯源、以及 AI 生成内容的来源认证（provenance）。这个领域二十多年了，大致分两代技术。

**第一代：手工设计（传统信号处理）**

不用神经网络，靠人手设计信号处理规则，常见三种：

- 扩频（spread spectrum）：把信息能量摊薄到整个频谱，像把一勺盐撒进一大锅汤，尝不出咸但确实在里面。经典是 Cox 1997。
- 回声隐藏（echo hiding）：加一个极短、人耳察觉不到的回声，用回声延迟的长短来编码 0 和 1。
- 相位编码 / 低频幅度调制：改音频某些频段的相位或幅度来藏信息。

**第二代：深度神经水印（现在的主流）**

用一个 encoder-decoder 架构：encoder 学会把信息藏进音频，decoder 学会读出来。训练时中间夹一个攻击层（attack/distortion layer），故意模拟压缩、剪辑、加噪，逼模型学出鲁棒的水印。代表作有 Meta 的 AudioSeal、以及 WavMark、SilentCipher、XAttnMark、VoiceMark。

**评价一个水印好不好，看三个互相打架的指标**

- 不可感知性（imperceptibility）：听得出来吗？用 PESQ、SI-SNR、STOI 这些量。
- 鲁棒性（robustness）：被压缩、剪辑、转码后还能读出来吗？
- 容量（capacity）：能塞多少 bit 的信息？

这三个是跷跷板，塞的信息越多、越鲁棒，通常就越容易被听出来。

**OfSpectrum 的差异点**

- 嵌入的不只是几个 bit，而是「多媒体数据」（文本、音频、图像、甚至指向在线数据库的指针都能塞），比一般水印只塞一个 ID 号野心大，他们叫 private channel distribution（用音频当私密数据通道）。
- 主动全网扫描：不只提供嵌入/提取，还会主动在互联网上爬取、监测带水印的内容做盗版发现，是「服务+基础设施」的打法。
- 加入 C2PA：Adobe、微软等牵头的内容溯源标准联盟，想把水印做成符合行业溯源标准的一环。
- 骨干是 AURA。

**AURA 框架的技术细节**（信息来自第三方论文引用，AURA 本身还没公开发表）

- 输入：一段 n 秒音频 + 一个二进制密钥。
- 变换域：音频先转成幅度谱图（magnitude spectrogram，横轴时间、纵轴频率、值是能量）。水印扰动加在这个时频域上，而且是有界的（bounded），扰动幅度被限制住以保证听不出来。
- 骨干网络：一堆 Conformer block。Conformer = Convolution + Transformer 的混合体，卷积抓局部细节（相邻频率/时间的关系），自注意力抓全局长程依赖，原本是语音识别里的明星结构。
- 密钥条件化（key-conditioning）：密钥编码成一个 conditioning vector，通过 FiLM 层（Feature-wise Linear Modulation）注入网络。FiLM 对网络中间特征做一次「缩放 + 平移」（特征 × γ + β），其中 γ、β 由密钥算出来，这样不同密钥就产生完全不同的水印。
- 训练：encoder（嵌入）和 decoder（提取）联合训练，中间加失真层模拟真实世界的攻击。

**一句话总结**：音频水印是「在人耳阈值以下藏可提取信息」，从扩频/回声隐藏的手工时代走到 encoder-decoder + 攻击层的神经时代，永远在不可感知/鲁棒/容量三者间权衡，而 OfSpectrum 用 Conformer + FiLM 密钥条件化把它做成了带全网巡逻的溯源基础设施。

## 关联

[[attention]]
[[deepfake-detection]]
[[voice-anti-cloning]]
