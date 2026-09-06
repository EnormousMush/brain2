# gdn

**它是谁：线性 attention 的一种，精神上是 RNN 的现代亲戚**

Gated Delta Net（GDN）是线性 [[attention]] 的一种，骨子里是 [[ssm]]/RNN 那一族：维护一个记忆状态、走线性复杂度，而不是像标准 attention 那样两两算、吃 O(n²)。它和 SSM 一样，想干的事都是「把 RNN 那种线性带状态的省钱思路请回来，同时保住 [[transformer]] 的并行和效果」，在两者之间找个更好的平衡点。

**两个核心机制**

- delta（增量）规则：更新记忆时不整块重写，而是只算新信息和旧记忆的差，然后补上这个差。类比就是笔记记错了一行，你只改那一行，而不是整页重抄。
- gated（门控）：加一道闸门，动态控制记忆的进出，哪些该记牢、哪些该忘掉。这个思想是从 LSTM 借来的（LSTM/GRU 的门控背景见 [[cnn-rnn-limits]]）。

**一条待核实的信息**：据称 Qwen3.5 用了 GDN，但这个具体型号的细节你当时标了待核实，先别当定论。

**一句话总结**：GDN = delta 规则（只补差值地更新记忆）+ 门控（控制记忆进出）的线性 attention，是 SSM 这条「让 RNN 现代化、对抗 attention 平方复杂度」路线上的又一个成员。

## 关联

[[attention]]
[[audio-ml]]
[[cnn-rnn-limits]]
[[ssm]]
[[transformer]]
