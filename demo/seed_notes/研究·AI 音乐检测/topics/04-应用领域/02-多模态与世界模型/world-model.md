# world model

**一句直觉：用神经网络学「世界怎么演变」，而不是手写物理方程**

世界模型的数学基础是马尔可夫决策过程 MDP (S,A,P,R,γ)，核心是用神经网络逼近状态转移函数 P(s_{t+1}|s_t,a_t)：给定当前状态和动作，预测下一个状态，而不是像传统控制论那样手写物理方程。关键技术难点是不能直接在高维像素空间预测下一帧（维度爆炸、且大部分像素跟决策无关），必须先把观测压缩成保留决策相关信息的低维 latent state。

**经典三段式（Ha & Schmidhuber 2018）**

V + M + C：V 用 VAE 把每帧压成低维 latent z_t；M 用 MDN-RNN 在 latent 空间预测转移 P(z_{t+1}|z_t,a_t,h_t)；C 是一个很小的 controller 直接在 z_t,h_t 上做决策。关键洞察是 agent 可以完全在 M 生成的「梦境」rollout 里训练 controller，再迁移到真实环境，大幅降低真实交互的样本需求。

**Dreamer 系列（V1-V3）**

这是目前 model-based RL 最成熟的路线，核心是 RSSM（确定性递归 h_t + 随机 latent z_t）。训练好后完全在 latent 空间做 imagined rollout，展开成百上千步未来轨迹，用 actor-critic 在想象轨迹上训策略，比真实环境快几个数量级。DreamerV3 已能零调参在 Atari 到 Minecraft 一大批环境达到 SOTA。

**另一条路：视频生成式世界模型**

Sora/Genie/Cosmos 这类用 [[diffusion]] 或自回归 [[transformer]]，直接在像素/视频 token 空间生成，不刻意压到低维抽象状态。优点是视觉保真高、能直接当仿真器用且人能看懂验证，缺点是算力贵、长程一致性（物体永久性、严格物理）仍未解。它和 Dreamer 那条 latent 路线本质是「决策效率 vs 视觉保真度」的取舍，工业场景大概率是两者混合。

**长时一致性的三类问题**

- 视觉一致性（人脸/衣服不能漂移）：靠 reference frame conditioning、ID embedding 每帧重新注入。
- 物理与空间一致性（不能穿墙、门不能自动复原）：目前没有真正「理解物理」的方案，靠 Memory Bank 显式存物体状态 + causal attention 保证不编出矛盾历史（显式记忆思路见 [[agent-memory]]）。
- 事件与记忆一致性（NPC 记不记得对话）：本质是长上下文/检索问题，把历史事件编码存起来、生成时做类似 attention 的 retrieval 注入（见 [[rag]]）。

业界共识是纯 scaling attention window 不现实，都在往「外挂显式记忆/几何表示 + 检索」的方向走。漂移问题很多源于 [[teacher-forcing]] 的 exposure bias（音频侧的离散化见 [[audio-tokenizer]]，多模态基座见 [[multimodal]]）。

**一句话总结**：世界模型用神经网络学状态转移，Dreamer 走「压到 latent 里做想象训练」求决策效率、视频生成走「直接生成像素」求视觉保真，而长程一致性的共同解法都在往外挂显式记忆 + 检索走。

## 关联

[[agent-memory]]
[[attention]]
[[audio-tokenizer]]
[[diffusion]]
[[multimodal]]
[[rag]]
[[teacher-forcing]]
[[transformer]]
