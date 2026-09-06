**1000 首 DiffRhythm 1(v1.2)instrumental,与 Suno/ACE-Step/DiffRhythm2 逐条同 prompt。**

#### 基本参数
- 模型:DiffRhythm v1.2 base(ASLP-lab,全曲一次性流匹配,95 秒/首,44.1kHz 立体声 flac)
- 生成:RunPod 4090,[phone],**3–4 秒/首**(全场最快),1000/1000 零失败,总花费约 $2
- prompt:冻结 Suno prompt 采样计划(seed 0,125/genre × 8),与其他生成器完全一致
- instrumental 做法:空 lrc + style 后缀 ", instrumental, no vocals"(v1 无结构标签机制)
- 逐首 seed=1e6+i 固定,可复现;脚本 part1_extraction/dr1_generate.py

#### 验收
- 干跑 10 首人工试听:**无人声**,音质正常;
- **风格跟随弱**:blues prompt 听感不太 blues——v1 的风格控制只走一个 MuLan 文本嵌入,
  粒度粗。判定为该模型自身属性,如实记录,不影响真/假探针协议;
- Seagate 归档核验:1000 flac 与 manifest 一一对应,无缺失,最小 4.1MB。

#### 位置
- Seagate:`musicdeepfake/2_corpora_ai/generators/dr1_batch_1000/`(flac + manifest.csv);Mac 无副本
- 共同规格导出待做:crossgen_prep **--gen-offset 40**(95 秒歌取中段 10 秒)

#### 用途(Batch 7)
[[生成器混淆]] 的 BlockFM 族第 2 员实验:
- 它与 [[DiffRhythm2数据集]] **同实验室、同数据谱系、不同架构**(全曲 FM vs Block FM)
  ——全池唯一能拆"族=架构还是族=训练数据"的对照对;
- LOGO 里 diffrhythm2 被留出时 28%(池内无同族):加入 DR1 后若大降,
  家族覆盖假设从 Suno 族推广到第二个族。
