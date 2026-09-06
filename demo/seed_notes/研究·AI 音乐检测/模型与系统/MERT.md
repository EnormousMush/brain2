# MERT

**音乐领域的自监督表征模型，把一段音乐编成逐层的向量表示** · MAP 团队 · 2023 · huggingface.co/m-a-p/MERT-v1-95M

## 关键事实

- HF id：`m-a-p/MERT-v1-95M`
- 类型：**音乐**自监督（Music undERstanding model），不是语音模型
- 采样率 **24 kHz** · **~95M 参数** · **12 层 Transformer**（加 embedding 层共 13 组 hidden states）· 隐维 **768**
- 训练数据：约 **160k 小时**音乐音频
- SSL 目标是**双 teacher 掩码预测**：一个声学 teacher（RVQ-VAE / EnCodec 量化出的离散码）加一个音乐 teacher（CQT，也就是常数 Q 变换的频谱）。掩掉一段，让模型同时猜回这两种 teacher 的输出。双 teacher 是它和纯语音 SSL 最大的结构差别，音乐 teacher 那一路逼它学音高和和声结构。

## 怎么用

走 Hugging Face 的标准路子：`Wav2Vec2FeatureExtractor` 做预处理，`AutoModel` 拿表征，加载时必须带 `trust_remote_code=True`。

输入要 24 kHz。取表征的时候把 13 组 hidden states 全接下来，**不要默认只用最后一层**：不同层的性质差别很大，低层偏声学质感和制作痕迹，高层偏音乐结构，哪一层好用完全取决于你的下游任务。常见做法是每层单独跑一遍下游任务、逐层比，或者做多层加权融合。

## 坑

- **不加 `trust_remote_code=True` 加载不了**，它带自定义模型代码。
- 网络受限的机器（比如国内的服务器）上 HF 可能连不上，要先在能联网的地方把权重下到本地缓存目录再离线加载。
- 「音乐 SSL 就一定比语音 SSL 强」是错觉。如果你的任务信号其实在低层声学质感上，语音 SSL 甚至通用音频模型可能一样好，值得放个对照。

## 关联

[[audio-ml]]
[[transformer]]
