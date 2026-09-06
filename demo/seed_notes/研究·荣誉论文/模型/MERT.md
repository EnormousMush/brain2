#### MERT(编码器)

`m-a-p/MERT-v1-95M` · 音乐 SSL · 我们的**最强音乐编码器之一**(round-1 best EER 0.67%)。

#### 身份
- HF id:`m-a-p/MERT-v1-95M`,`trust_remote_code=True`
- 类型:**音乐**自监督(Music undERstanding model,MAP 团队)
- 采样率 **24 kHz** · **~95M 参数** · **12 层 Transformer(+embedding = 13 组 hidden states)** · 隐维 **768**
- 训练:~160k 小时音乐音频;SSL 目标 = **声学 teacher(RVQ-VAE/EnCodec 量化)+ 音乐 teacher(CQT)** 的掩码预测

#### 我们怎么用
- **归类**:标准 HF 音乐耳朵(代码 kind=`hf_ssl`),用 `Wav2Vec2FeatureExtractor` 预处理 + `AutoModel` 接数字。
- **喂之前**:它要 **24kHz**,和我们音频一致,基本不用重采样。
- **接数字**:13 组(embedding + 12 层)全接。每首歌 → `encode_all_layers` → `[13, 2×768]`
  (13 层,每层 mean 和 std 拼起来,768×2=1536 个数)。
- **做实验**:13 层各训一个逻辑回归,逐层比 EER,报最好那层。
- **留后手**:`encode_frames(第 k 层)` 存一层的完整时间序列 `[时间, 768]`,给以后的时序分类器用。
- **注意**:加载必须 `trust_remote_code=True`(它带自定义代码)。

#### round-1 结果
- **best test EER 0.67%**,各层 ~0.1–0.9% —— **每层都近 0%**(含 raw 层)= gross-confound 签名。
- 判读:分离信号在低层声学/制作,不是高层音乐结构。

#### 坑
- 必须 `trust_remote_code=True`;复旦服务器 HF 被墙 → 预下到 `.hfcache` 离线加载。

参考:huggingface.co/m-a-p/MERT-v1-95M
