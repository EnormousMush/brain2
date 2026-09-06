**jamendo2025 — 同生态、只变年代的现代人类对照语料**([phone]/10 采集,年代混淆终审主力)。

| 项 | 值 |
| --- | --- |
| 规模 | 2943 首(8 genre × ~375;双 genre 重复 57 首已在导出侧去重) |
| 年代 | 2024-01 ~ 2026-08 发行(Jamendo API `datebetween` 按发行日采) |
| 歌手 | ~1700 位,单歌手 ≤2–4 首(逐级放宽) |
| **正式口径** | **instrumental 2050 首**(API musicinfo 逐曲核查:inst 2050 / vocal 723 / 未标 170;SSL 实验一律 `--inst-only`,名单 `diagnostics/jamendo_instrumental.txt`) |
| 切片 | 每首取**正中 10s**,共同规格(见 [[数据初硬性统一]]);split 按歌手 md5 70/15/15 |
| 授权 | CC(API 按 license 过滤) |
| 位置 | Seagate `1_corpora_real/jamendo2025/`(原始 mp3 + manifest + jam_vocalinstrumental.json);服务器 `crossgen_export`(共同规格) |
| 脚本 | `part1_extraction/jamendo_fetch.py`、`diagnostics/jamendo_export.py` |

**设计意图**:与 FMA 同属独立/CC 生态,主变量=年代 → 年代红旗直测([[年代混淆]] §9–10)。
**后记([phone])**:Batch I 显示 fma↔jamendo 的残余差异主要是**平台/制作生态味**而非年代
([[人类音乐集混淆]] §11 判决 2)。
**采集技术账**:API `include` 多值用空格(`+` 会变 %2B 报废查询)、空页重试、代理断线自动重启循环。
主战场:[[年代混淆]]、[[人类音乐集混淆]]、[[图谱分析 H1]](Jamendo 版图谱)、[[特征图谱分析 H2]]。
