# tokenizer

**一句直觉：切词和查向量是两道独立工序**

Tokenizer 和 Embedding 是流水线上两道分开的工序。Tokenizer 把字符串切成词表里的条目、映射成整数 ID，这一步没有梯度，统计出来后就冻死了。Embedding 是一个 [vocab_size, d_model] 的可训练矩阵，拿 ID 去取对应的那一行。所以一个 token 只是「词表里的一行」，没有任何语言学上的必然性，模型从头到尾其实没见过字母。

**BPE 怎么训练**

先把语料拆成单字符（GPT 系是 256 个 byte，从此永不 OOV），然后反复统计相邻 token 对的频次、合并最高频的那一对、把这条合并规则追加进一个有序清单，循环到词表达标（比如 50k）。产出物就两个文件：vocab.json 和 merges.txt，后者就是五万行「a b」。

**编码要「重放合并历史」，不是贪心最长匹配**

编码阶段必须严格按 merge 规则的学习顺序逐条施加，而不是贪心找最长匹配，本质是重放当初的合并历史。例：lowest → l o w e s t →（规则 e+s）→ l o w es t →（规则 es+t）→ l o w est →（规则 l+o）→ lo w est →（规则 lo+w）→ ["low","est"]。

**WordPiece 和 BPE 的唯一区别：合并评分**

BPE 用 count(ab) 打分，WordPiece 用 count(ab)/(count(a)·count(b))，也就是 PMI 的指数形式。分母惩罚「你本来就到处都是」，避免把 e、s 这种各自超高频、碰在一起纯属偶然的对合并掉，只留下那些超出随机预期地黏在一起的单元（如 ##ing、##tion）。WordPiece 用 ## 标记非词首。

**几个工程坑**

byte-level BPE 下中文一个字占 3 字节，所以 token 效率天然差（国产模型必须扩中文词表）；" hello" 和 "hello" 是不同 token，prompt 末尾多打个空格会让模型变蠢；Llama 把数字逐位切开、显著改善算术，而 GPT-3 不这么做；SolidGoldMagikarp 这类 token 被切出来了、但训练时几乎没出现过，embedding 停在随机初始化附近，喂进去就胡言乱语。

它切出来的 ID 喂给 [[transformer]] 的 embedding 层，而位置信息要等 [[positional-encoding]] 之后才真正带上（音频侧的离散化见 [[audio-tokenizer]]）。

**一句话总结**：tokenizer 负责把字符串切成 ID（冻死、无梯度）、embedding 负责查向量（可训练），BPE 靠重放合并历史来编码，token 的这些边角脾气正是模型算术差、末尾空格变蠢、遇到怪 token 崩坏的根源。

## 关联

[[audio-tokenizer]]
[[positional-encoding]]
[[transformer]]
