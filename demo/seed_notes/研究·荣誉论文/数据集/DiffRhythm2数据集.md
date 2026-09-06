**自产的第 7 个 AI 数据源:Block Flow Matching 族的代表**(与 ACE-Step 分属两个现代架构族)。
[phone] 夜与 [[ACE-Step数据集]] 同批在第二台 RTX 4090 上生成,双现代族一起补齐
[[生成器混淆]] 的家族覆盖缺口。

#### 关键技巧:骗出官方尚不支持的 instrumental
DiffRhythm 2 是**歌词驱动的歌曲生成器**,官方 TODO 里 instrumental 还没打勾。绕法:
- 歌词文件只放**结构标记、零歌词行**:`[start][intro][inst][solo][inst][outro][end]`;
- 风格提示 = Suno caption + ", instrumental, no vocals";
- **producer 耳朵验收通过**([phone]):听感质量偏低,但**确实无人声**
  ——"质量偏低"本身也是数据:它在制作现代度轴上的位置比 ACE-Step 低,正好多一个刻度。

#### 设计与配置
- 采样与 [[ACE-Step数据集]] **完全同源**(种子 0、同 1000 条 prompt、同 audio_id 序号)→ 三方逐条可比;
- 模型:ASLP-lab/DiffRhythm2(+ VAE),cfg 2.0 / 16 步 / max 40 秒 / mp3 48kHz;
- 注意:无 seed 参数(官方 inference.py 不支持)→ 单首不可精确复现,但 prompt 清单固定(batch1000.jsonl 已存);
- 速度:**14.5 秒/首**,1000 首 4 小时 02 分;成本约 $3;完工由看门狗自动关机。

#### 验收([phone])
文件数 1000 · 8 genre 各 125 · 随机解码正常(48kHz/40.0s) · 坏文件 0 —— 全部通过

#### 存放
- Mac:`~/Developer/crossgen_incoming/dr2_batch/`(mp3 + batch1000.jsonl);
- Seagate 归档:`musicdeepfake/2_corpora_ai/generators/dr2_batch_1000`([phone]);共同规格包 `frank-suno-round1/crossgen_add`;
  桌面 `试听batch/` 含 8 首样品。

#### 用途 / 下一步
与 [[ACE-Step数据集]] 完全一致:对齐规格 → 上服务器 → 矩阵加行 + LOGO 池加员。
两个现代族一起进池后,"留出 Suno"那行的变化即是**家族覆盖假设的完整判决**
(一个族有效还是要两个族?哪个族贡献大?)。
