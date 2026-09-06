**1000 首 Mureka V9(商用 API)instrumental,与全体生成器逐条同 prompt——商用第 3 家。**

#### 基本参数
- 模型:mureka-9(auto 档自动选中,BGM/instrumental 端点),架构未公开 = **商用盲盒**
- 提取:官方 API,[phone]/31,~60 秒/首(1 并发档),$0.045/首,总花费 **$45**
- prompt:同一份冻结采样计划(seed 0,125/genre),n=1 单曲输出(已验证不双倍计费)
- 时长中位 176s(28.8–约 270s),44.1kHz mp3;API 无 seed 参数(manifest 记录,协议偏差同 LeVo)
- 脚本 part1_extraction/mureka_generate.py(串行轮询 + 断点续跑 + 连败熔断;
  key 走 MUREKA_API_KEY 环境变量)

#### 提取一波三折(记档防复踩)
余额精确耗尽在 658 首($30 充值 ÷ $0.045≈666,分毫不差)→ 429 拒绝;
Mac 系统代理指着未启动的本地端口 → ProxyError 全灭(解:unset 代理变量);
失败请求不扣费、不写 manifest,续跑自动补齐。

#### 质检([phone])
全量扫时长 + 中段峰值:**零超短、零静音**——与 InspireMusic 并列零次品交付。

#### 位置
- Seagate:`musicdeepfake/2_corpora_ai/generators/mureka_batch_1000/`(mp3 + manifest.csv);Mac 无副本
- 共同规格:`frank-suno-round1/crossgen_add_mureka/`(10s/16k,offset 15)

#### 用途
[[生成器混淆]] 的**商用盲盒行**:14 家版图的最后一块。
- 矩阵/LOGO 老流程入场考试(Batch 8 第二波);
- **家族转移矩阵里单独成行/成列**:各族探针对它的抓取模式 = 对未公开架构的
  指纹考古读数——它像谁,谁抓得住它,就是它的架构血统证词。

#### 开盒结论(Batch 9,[phone])
**Mureka = Suno 族第 4 员。** 三编码器两方向证词一致:Suno 探针抓它
MuQ 6.0% / MERT 4.7%(全场被抓最准);Mureka-only 探针抓 suno 7.0%、
acestep 15.9%、levo 18.1%,抓其余家族 33–54%。断代为"LM+连续渲染"族。
另:MERT 对它绝对反超 MuQ(共振档案的新线索);离 suno 本尊最近,
蒸馏/数据污染假说不可排除(limitation)。
详见 [[生成器混淆#13. Batch 9([phone],复旦服务器):三分支收官——对称性证实 + Mureka 开盒|生成器混淆 §13]]、[[编码器生成器共振假说]]。

Batch 12 补强([phone]):XLS-R 的 Suno 探针抓它 4.26%——**第四个编码器确认
Mureka-Suno 亲缘**;同时它是"**MuQ 特异性盲点**"的主角(五编码器交互表里
MuQ 对它 Γ=+0.81*,其余四家全为负)。

Batch 14 几何盖章([phone]):五个编码器的指纹箭头阵里,**Mureka 的最近邻
无一例外是 suno 本尊**(cos:MuQ 0.50 / XLS-R 0.46 / MERT 0.42 / EnCodec 0.40 /
w2v 0.34,全部断层第一)——族籍结论获得独立于转移 EER 的第二类证据。
MuQ 盲点同时破案:它空间里 mureka-suno 族的超额对齐全场最低(+0.067),
Suno 族磁铁恰好扫不到;非表征缺失(MuQ 专职抓它 0.00%)。
详见 [[编码器生成器共振假说]] Batch 14 终审。
