> 统计来源:`part1_extraction/manifests/`(batch2 + batch3 + jazz 三个 manifest),
> 每个生成 job = 一个 prompt → 产出 2 首(`_1` + `_2`)。

#### 21,500 首

- **10,750 个生成 job**,全部 `status = done`(**0 失败**)
- 每个 job 出 2 首 → `10,750 × 2 = 21,500` 首 mp3
- 覆盖 **8 个 genre**

#### 按 genre 分布

| genre      | jobs       | 歌曲数        |
| ---------- | ---------- | ---------- |
| rock       | 1500       | 3000       |
| pop        | 1500       | 3000       |
| jazz       | 1500       | 3000       |
| classical  | 1250       | 2500       |
| electronic | 1250       | 2500       |
| hiphop     | 1250       | 2500       |
| blues      | 1250       | 2500       |
| country    | 1250       | 2500       |
| **合计**     | **10,750** | **21,500** |

#### 备注
- 模型版本:多数 `chirp-v5`,jazz 部分为 `chirp-v4-5+`。
- 生成时间:[phone] ~ 05-26。
