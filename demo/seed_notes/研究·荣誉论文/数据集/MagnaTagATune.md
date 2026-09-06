候选的**制作/年代对照**人类语料(Magnatune 厂牌,~2000 年代)。路径 `magnatagatune/`。

#### 磁盘上有什么
- **音频已解压:25,863 首 mp3**(在 `mp3.zip/` 目录下,按 hex `0`–`f` 分桶;名字叫 .zip 其实是目录)
- 每首是 **~29 秒的片段**(不是整曲)
- `annotations_final.csv`:**25,863 clip × 188 标签**(tab 分隔,二值多标签)
- `clip_info_final.csv`:31,382 行元数据(title/artist/album/url/segmentStart/End)
- 还有未合并的 `mp3.zip.001/.002/.003` 分卷(原始压缩包)

#### 数据集性质
- **厂牌策展、艺术家池很小**:仅 **270 个艺术家 / 517 张专辑** → 制作风格高度同质(适合当"制作"对照)
- 标注是**扁平多标签**,混了 genre + 乐器 + 情绪:平均 **3.46 标签/clip**,其中 **4,221 个 clip 零标签**
- 年代:MagnaTagATune 数据集 2009 年发布,曲目为 Magnatune ~2000 年代目录

#### Top 标签(总体,前 20;genre/乐器/情绪混合)

| 标签 | clip 数 | | 标签 | clip 数 |
| --- | --- | --- | --- | --- |
| guitar | 4,852 | | synth | 1,717 |
| classical | 4,272 | | female | 1,474 |
| slow | 3,547 | | indian | 1,395 |
| techno | 2,954 | | opera | 1,296 |
| strings | 2,729 | | male | 1,279 |
| drums | 2,598 | | singing | 1,211 |
| electronic | 2,519 | | vocals | 1,184 |
| rock | 2,371 | | no vocals | 1,158 |
| fast | 2,306 | | harpsichord | 1,093 |
| piano | 2,056 | | loud | 1,086 |
| ambient | 1,956 | | quiet | 1,055 |
| beat | 1,906 | | flute | 1,025 |
| violin | 1,826 | | pop | 995 |
| vocal | 1,729 | | … | … |

#### 只看 genre 类标签(clip 数)

| genre      | clip  |     | genre     | clip |
| ---------- | ----- | --- | --------- | ---- |
| classical  | 4,272 |     | new age   | 650  |
| techno     | 2,954 |     | dance     | 649  |
| electronic | 2,519 |     | country   | 541  |
| rock       | 2,371 |     | metal     | 505  |
| ambient    | 1,956 |     | choral    | 490  |
| indian     | 1,395 |     | jazz      | 439  |
| opera      | 1,296 |     | baroque   | 297  |
| pop        | 995   |     | hard rock | 274  |

→ **重度偏 classical / techno / electronic / rock / ambient**;古典与电子占绝对主导,vocal/opera 也多。


之前评估过用它/MTG 做 genre-era 匹配对照,**优先级判为低**(对控住真正Genre混淆帮助有限);此处仅存档其分布,备用。
