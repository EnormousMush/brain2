**自产的第 6 个 AI 数据源:现代"LM 规划 + 流匹配渲染"族(Suno 同族)的代表。**
[phone] 夜在租用的 RTX 4090(RunPod)上生成,专为回答 [[生成器混淆]] 的悬念:
LOGO 混训"5 个开源生成器训 → 测 Suno = 44.9%"——池子里缺 Suno 的架构同族,补上它再测。

#### 设计精髓:与 Suno 逐条同 prompt
- 从 [[Suno数据集]] 的 **10,750 条冻结 prompt** 里按 genre 均衡采样(固定种子 0,8 genre × 125 = **1000 首**);
- 每条 prompt **与当年喂给 Suno 的一字不差** → 内容分布逐条对齐,content shift 从源头归零
  (这是 [[FakeMusicCaps]] 给不了的对照质量);
- 逐首固定 seed(1e6+prompt 序号),**完全可复现**。

#### 生成配置
- 模型:ACE-Step **v1.5**(acestep-v15-turbo DiT 渲染器 + 5Hz-lm-**1.7B** 规划 LM,thinking 开,vllm 后端);
- 参数:30 秒 / instrumental(`[Instrumental]` 歌词 + instrumental flag)/ FLAC 48kHz 立体声;
- 速度:**13 秒/首**,998 首约 3.6 小时,**0 失败**(另 2 首为 Mac 烟测,合计 1000);
- 成本:约 $2.5(4090 @ $0.70/h);批量脚本 `part1_extraction/crossgen_generate.py`(断点续跑)。

#### 验收([phone])
文件数 1000 · manifest 一一对应 · 8 genre 各 125 · 随机解码正常(48kHz/30.0s) · 坏文件 0 —— 全部通过

#### 存放
- Mac:`~/Developer/crossgen_incoming/acestep_batch/`(flac + manifest.csv);
- Seagate 归档:`musicdeepfake/2_corpora_ai/generators/acestep_batch_1000`([phone]);共同规格包 `frank-suno-round1/crossgen_add`

#### 用途 / 下一步
1. 过 `crossgen_prep` 对齐共同规格(10s/16k/LUFS)→ 上复旦服务器;
2. [[生成器混淆]] 矩阵加一行(Suno-训练探针测 ACE-Step:迁移好 → 制作轴主导;~50% → Suno 指纹主导);
3. LOGO 池加一员,重测"留出 Suno"——**44.9% 是否大降 = 家族覆盖假设的判决**。
