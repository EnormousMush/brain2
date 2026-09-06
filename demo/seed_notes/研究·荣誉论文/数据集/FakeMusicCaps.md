#### FakeMusicCaps 2024 — TTM 检测与归因数据集

**引用:** arXiv 2409.10684(Politecnico di Milano,DARPA 资助)。**5 个开源生成器的现成数据——
我们跨生成器战役的第一发免费弹药。**

#### 数据集构造
- 拿 **MusicCaps 的 5.5k 条 caption**,喂给 5 个开源 TTM 模型各生成一遍:
  **MusicGen**(1.5B, EnCodec)/ **MusicLDM** / **AudioLDM2**(音乐 checkpoint)/
  **Stable Audio Open** / **Mustango**;
- 共 **27,605 条 / ~77 小时**;每条 **10 秒、mono、16kHz、32-bit float wav**;
- 任务:**检测**(真 vs 假)+ **归因**(哪个生成器);**闭集** + **开集**(未见生成器 = SunoCaps/Suno)。

#### 基线结果(要点)
| 场景 | 最好模型 | 成绩 |
| --- | --- | --- |
| 闭集检测 | ResNet18+Spec | **1.00**(全指标满分) |
| 开集(阈值法) | ResNet18+Spec | balanced acc 0.85 |
| 开集(SVM 法) | ResNet18+Spec | **0.48(崩)** |
- 开集下 ResNet18 **把未见的 Suno 全判成真音乐**("Suno 最真实,情理之中");
- AudioLDM2 和 Mustango(都是扩散系)互相混淆 → **同架构族指纹相近**。

#### 局限
- **10 秒短片、16kHz** —— 和我们 30s/24k 管线不匹配,直接混用会引入新混淆(时长/采样率),
  要么统一裁剪重采样、要么单独评;
- 无 Suno/Udio(商用)在训练侧 —— 恰好和我们互补(我们有 21,500 首 Suno)。
