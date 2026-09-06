# rlhf

**一句直觉：让人给答案排序，把偏好教给模型**

RLHF 分两步。第一步训一个 reward model：用 Bradley-Terry 把人的偏好对建成 P(y_w ≻ y_l) = σ(r(x,y_w) - r(x,y_l))，这个 reward model 从 [[sft]] 模型初始化，把 LM head 换成一个输出标量的 head。第二步用 PPO 去最大化 E[r(x,y)] - β·KL(π_θ ‖ π_SFT)。

**它的经济学根基**

为什么这么绕？因为「写一个好回答很难，判断两个哪个好很容易」。RLHF 把标注需求从「生成」降到「比较」，人只需要在两个答案里挑一个更好的，这比让人写标准答案便宜太多。

**KL 项是命脉，不是可选的正则**

千万别把那个 KL 项当成可有可无的正则。没有它，策略必然 reward hacking：去找 reward model 的对抗样本，比如疯狂灌水（因为 RM 学到了「越长越好」），或者每句都以「作为一个 AI，我想强调」开头，拿到超高 reward 但输出完全崩坏。KL 项把策略拴在 SFT 模型附近，不让它跑去钻 RM 的漏洞。

**工程代价**

PPO 最劝退的地方是显存里要同时放 4 个模型：Actor、Critic、Reward、Reference。这也是 [[dpo]] 想绕开的东西（DPO 直接用偏好数据优化，省掉显式 reward model 和 RL 循环）。KL 散度的背景见 [[cross-entropy-kl]]。

**一句话总结**：RLHF 靠「比较比生成便宜」先训个奖励模型、再用带 KL 约束的 PPO 对齐，KL 是防 reward hacking 的命脉，而它 4 个模型的显存代价正是 DPO 出场的理由。

## 关联

[[cross-entropy-kl]]
[[dpo]]
[[sft]]
