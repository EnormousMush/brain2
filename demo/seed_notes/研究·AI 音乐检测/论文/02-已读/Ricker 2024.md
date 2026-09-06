# Ricker 2024

**定位**：AEROBLADE:零训练 AE 重建误差,'假货重建得更准'实证

**《AEROBLADE: Training-Free Detection of Latent Diffusion Images Using Autoencoder Reconstruction Error》(Ricker, Lukovnikov, Fischer, CVPR 2024)——阶段 2 预注册方向的图像侧背书。**

#### 方法
零训练。潜扩散模型自带的**自编码器**(图像↔潜空间的那对编解码器)拿来量重建误差,
发现:**生成图像被 AE 重建得比真实图像更准**——生成过程本来就发生在这个潜空间里,
产出天然是 AE 的"舒适区"。误差直接当分数,性能接近重训练的检测器
(Stable Diffusion / Midjourney 均有效);附赠:误差图还能定位 inpainting 区域。
代码开源(github.com/jonasricker/aeroblade)。

#### 与我们的关系
- **"假货更好压"的方向在图像侧已被验证**——重建探针 (流匹配阶段2） 预注册主假设
  的最强文献支撑;Batch 11 若命中,我们是"AEROBLADE 现象的音乐版 + 中立编解码器版"
  (EnCodec 不属于任何生成器,比自家 AE 更公平、覆盖非扩散家族);
- **升级思路(已记进阶段 2 发散钩子)**:若中立版翻车,换**生成器自家 VAE 挨个试**
  (ACE-Step DCAE / DR VAE / Mel-VAE):谁家 AE 重建你最轻松,你就是谁家产出
  ——real-only 家族归因,重建线与家族考古线在此合流,文献空白;
- 与 [[Wang 2023]] 的分工:AEROBLADE 用 AE(便宜、零训练)、DIRE 用完整扩散往返
  (贵、更忠实)——恰好对应我们的第二阶 vs 第三阶。

## 关联

[[diffusion]]
[[deepfake-detection]]
