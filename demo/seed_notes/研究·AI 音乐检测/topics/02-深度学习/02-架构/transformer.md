# transformer

**一句直觉：一台并行处理一串 token 的机器**

Transformer 是现在主流大模型（GPT/Claude/Qwen）的底层架构，本质是「处理一串 token 的机器」。每个 token 先变成向量，在堆叠的多层里逐层更新，顶层输出拿去预测下一个 token。每一层 = [[attention]] 子层（字与字交换信息）+ FFN 子层（每个字自己消化信息），叠几十上百层，所有 token 一起并行进去，不像 RNN 排队。名字出处是《Attention Is All You Need》，历史上 attention 是因、transformer 是果。

**为什么用 LayerNorm 不用 BatchNorm**

NLP 里句子长度不一，batch 内要 padding。BN 跨样本统计同一位置的词，会把 padding 和真实词混在一起算均值方差，统计量既不稳也没意义。LN 只看单个 token 自己内部的特征分布，不受 padding、句长、batch size 影响，训练推理行为一致，也更契合逐 token 生成的哲学（BN vs LN 详见 [[batchnorm-layernorm]]）。

**最深的洞察：BERT 与 GPT 的全部分歧只在一个 mask 矩阵**

softmax(QKᵀ/√d_k + M)V 里那个 mask 矩阵 M，就是 BERT 和 GPT 的唯一分歧。BERT 的 M 全零（每个位置看到所有位置），GPT 的 M 是上三角 -∞（过 softmax 后归零，只能看自己和左边）。其余多头、FFN、残差、LayerNorm 几乎一模一样，所谓 encoder-only / decoder-only 说的就是这件事。由这一个差别能推出一切：

- 数据效率：因果 mask 让 GPT 一次前向拿到 L 个监督信号（位置 t 预测 t+1，绝不泄题），数据效率 100%。BERT 的双向性和自回归在同一次前向里根本不兼容（位置 3 能直接看到位置 4 抄答案，loss 秒归零），只能改做 MLM，一句 100 token 只有 15 个位置产生 loss，数据效率约 15%。这个隐形劣势在 scaling 时代是致命的。
- 理解 vs 生成：BERT 一次看全句，做分类/NER/检索这类「本来就手握完整句子」的任务表征天然更好，这是它 2018-2021 统治 benchmark 的原因。但它架构上无法生成（没有「下一个 token」概念、各 mask 位置预测互相独立会缝出怪词、双向性还拿不到 KV cache）。GPT 的 next-token prediction 本身就有用且难度无上限（压缩即理解），而且 [[rlhf]]、instruction tuning、CoT 全都要求模型能生成，BERT 在架构层就被排除。

**Encoder-Decoder 与 mask 的两种类型**

原始 Transformer 是 encoder-decoder：encoder 每层两子层（双向自注意力 + FFN），decoder 每层三子层（因果自注意力 + cross-attention + FFN），子层外都包残差 + LayerNorm（原论文 Post-LN，后来很多实现改 Pre-LN 提升深层稳定性）。mask 也有两种性质：padding mask（屏蔽 PAD 位）和因果 mask（上三角 -∞，只用在 decoder 自注意力）。统一写法 score = QKᵀ/√d_k + mask，用「加 -∞ 再 softmax」而非「softmax 后置零」，是因为置零会破坏归一化，而 exp(-∞)=0 恰好让归一化自动正确。decoder 训练能并行，靠的正是 [[teacher-forcing]]（目标序列已知，一次算完所有位置）。

**一句话总结**：Transformer 是「attention 交换信息 + FFN 消化」的可并行堆叠架构，BERT 与 GPT 只差一个 mask 矩阵，而正是这个 mask 决定了 GPT 在数据效率和「能生成」上的全面胜出。

## 关联

[[attention]]
[[batchnorm-layernorm]]
[[cnn-rnn-limits]]
[[neural-network]]
[[rlhf]]
[[teacher-forcing]]
