**1000 首 LeVo(腾讯 SongGeneration-large)纯音乐,与全体生成器逐条同 prompt。**

#### 基本参数
- 模型:SongGeneration-large(LeVo v1,arXiv 2506.07520;分层 LM + 扩散渲染,
  **Suno 同架构族第 3 员**,腾讯出品 = 家族第 3 家独立实验室)
- 生成:RunPod A40,[phone]/29,~1.2 分钟/首,总花费 ~$10
- 输入:同一份冻结 prompt(seed 0,125/genre)进 `descriptions`;
  `gt_lyric` 全器乐短结构 `[intro-short] ; [inst-medium] ; [outro-short]` + `--bgm` 双保险
- 时长中位 33s(范围 24–270s,结构标签只被松散跟随);44.1kHz 立体声 flac
- **无逐首 seed**(LeVo 不暴露,manifest 记 -1)——同 prompt 协议的已知偏差,论文注明

#### 为什么不是 LeVo 2(v2-large)
v2 权重的条件词表(151652)与开源推理代码(151646)不匹配——官方只放了权重没同步
v2 代码,硬对齐会 token 错位。退用 v1:代码原生支持、论文正主、家族身份等价。
(环境雷共 6 个:sh/bash、Python 3.12×hydra、torch2.6 weights_only、git-lfs 指针、
uv 无 setuptools、setuptools≥70 删 pkg_resources——已全部记档,复现照抄 runbook。)

#### 质检([phone])
- 全量 1000 扫时长 + 响度:**5 首次品**(2 首纯静音 max<-50dB,全是 classical;
  3 首 <12s)——静音是 Müller 2021 式捷径源,必须清除;
- 5 首用原 prompt 重造替换,复验通过;次品率 0.5%。

#### 位置
- Seagate:`musicdeepfake/2_corpora_ai/generators/levo_batch_1000/`(flac + manifest.csv);Mac 无副本
- 共同规格导出:crossgen_prep 按各曲实际时长取中段(变长,`--gen-offset` 需按曲计算或用中段逻辑)

#### 用途(Batch 7)
[[生成器混淆]] 家族假设的**一锤定音实验**:ACE-Step 的 3.79% 是家族共性还是个案?
LeVo(独立实验室、同族)若同样被 Suno 探针近域内抓住 → 家族指纹铁证;
若不被抓住 → 族边界比"LM+扩散渲染"的架构分类更细,同样是发现。
