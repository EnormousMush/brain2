# MuQ

**用 Mel-RVQ 当预测目标的音乐自监督基础模型** · 腾讯 AI Lab · 2025 · github.com/tencent-ailab/MuQ

## 关键事实

- HF id：`OpenMuQ/MuQ-large-msd-iter`，装法是 `pip install muq`
- 类型：**音乐**自监督基础模型
- 采样率 **24 kHz** · large 变体 **~300M 参数** · 隐维约 **1024** · 逐层 hidden states 可取
- 训练数据：**Million Song Dataset（MSD）**
- 论文：*MuQ: Self-Supervised Music Representation Learning with Mel-RVQ*（2025），见 `[[Zhu 2025]]`

它和 MERT 的关键差别在预测目标：MERT 拿声学 teacher 加音乐 teacher，MuQ 拿 **Mel-RVQ**，也就是直接在梅尔谱上做残差向量量化，用量化出的码当掩码预测的目标。好处是目标本身就带频谱结构，不用额外挂一个 CQT teacher。

## 怎么用

**它不走 Hugging Face 那套 processor**，直接把原始波形张量 `[1, T]` 丢给模型就行。调用时加 `output_hidden_states=True` 才能拿到逐层表征。

输入同样是 24 kHz。和 MERT 一样，逐层性质不同，别默认用最后一层。

## 坑

- **调用方式和 HF 系的模型不一样**，从 MERT 或 wav2vec2 的代码直接抄过来会报错，得单独写一个分支。
- 离线环境要先把权重下到本地缓存。
- 参数量比 MERT 大三倍，显存和推理时间都要重新估。

## 关联

[[audio-ml]]
[[audio-tokenizer]]
[[transformer]]
