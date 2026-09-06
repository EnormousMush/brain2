FMA 音频分布(Seagate 盘,[phone] 扫描)
人类音乐来源之一,当前 round-1 的人类侧就取自它。路径 `fma/`,元数据 `fma/fma_metadata/`

#### 磁盘上有什么
- **`fma_large/` = 106,574 首 mp3(已解压,全集)** ← 我们从这里取样
- `fma_small/`(8,000)、`fma_medium/` 也已解压;对应 `.zip` 也在盘上
- 元数据齐全:`tracks.csv`(106,574 行)、`raw_tracks.csv`、`genres.csv`、`features.csv` 等
- 官方子集是嵌套的:small 8,000 ⊂ medium 25,000 ⊂ large 106,574

#### 曲风分布(`genre_top`,全 106k)
只有 **49,598 首有顶层 genre**(**56,976 首缺失 genre_top**)。有标注的里:

| genre_top | 数量 | 占已标注 |
| --- | --- | --- |
| Rock | 14,182 | 28.6% |
| Experimental | 10,608 | 21.4% |
| Electronic | 9,372 | 18.9% |
| Hip-Hop | 3,552 | 7.2% |
| Folk | 2,803 | 5.7% |
| Pop | 2,332 | 4.7% |
| Instrumental | 2,079 | 4.2% |
| International | 1,389 | 2.8% |
| Classical | 1,230 | 2.5% |
| Jazz | 571 | 1.2% |
| Old-Time/Historic | 554 | 1.1% |
| Spoken | 423 | 0.9% |
| Country | 194 | 0.4% |
| Soul-RnB | 175 | 0.4% |
| Blues | 110 | 0.2% |
| Easy Listening | 24 | 0.05% |

→ **重度偏 Rock / Experimental / Electronic(前三占 ~69%)**,和 Suno 的 8 类均衡流行分布完全对不齐。

#### Genre
- `album date_released`:70,294 首非空(66%)。**min 1902 · 25% 2009 · 中位 2011 · 75% 2014 · max 2021**
- `track date_recorded`:几乎全空(仅 6,159 首,5.8%)→ **FMA 无法按录音年份精确对齐**
- `album date_created`(入库时间,非音乐年代):2008–2017

#### 时长
- 中位 **216 秒(3.6 分)**,均值 278s(有长尾,max 18,350s)→ 预处理统一裁到 30s。

#### mu q目前实际用的 instrumental 子集(`raw_tracks.csv` 中 `track_instrumental==1`)
- **6,106 首被标为 instrumental,其中 6,045 首磁盘上存在** ← round-1 从这里取 3,000
- 曲风分布(多标签,top):

| genre | clip 数 |
| --- | --- |
| Electronic | 2,131 |
| Soundtrack | 1,335 |
| Instrumental | 1,305 |
| Ambient | 904 |
| Experimental | 843 |
| Classical | 761 |
| Ambient Electronic | 438 |
| Jazz | 422 |
| Avant-Garde | 384 |
| Folk | 301 |

→ instrumental 子集更偏 **Electronic / Soundtrack / Ambient / Classical / Experimental**,几乎没有 vocal-pop/rock,和 Suno 差异更大。
