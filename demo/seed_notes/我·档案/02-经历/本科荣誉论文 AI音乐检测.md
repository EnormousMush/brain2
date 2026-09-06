# 本科荣誉论文 AI音乐检测

**一句话**：构建一个严谨、去混淆的 AI 生成音乐检测器（针对 Suno 及其他模型），并通过生成器与检测器的对抗循环，探究哪些「机器制造」的特征只是可被抹去的表层痕迹，哪些是难以去除的深层指纹。

- **时间**：2026 年 2 月至今（英文 CV 写 Directed Research, Undergraduate Researcher, Feb 2026 – Present）
- **导师**：[[Blase Ur]]（UChicago 计算机系副教授）
- **指导**：[[Qile He]]（复旦大学）
- **正式题目**：Adversarial Analysis of AI-Music Detection and the Limits of "Humanness"

## 背景（来自 proposal1.pdf）

你的立项动机写得很清楚，而且不是从技术出发的：

> 作为一个音乐制作者，我在自己做音乐的过程中碰到了 Suno，被它做出像样曲子的能力震到了。

然后你把它推到了一个伦理问题上：如果 AI 音乐越来越普遍，会不会有一天我们听到的一切都很像？到那时人类音乐里的 humanness 会不会就没了？而要回答这个，得先问：人类音乐里的 humanness 到底是什么？能不能用一个量化指标把它测出来？

引的数据：CISAC 2024 预测，到 2028 年生成式 AI 音乐将占流媒体收入约 20%、音乐库收入约 60%，音乐创作者 24% 的收入面临风险。

## 方法（proposal 里的四部分）

- **Part 1 建数据集**：AI 侧限定 Suno（按类型名当 prompt 通过 API 批量生成）；人类侧取 FMA、MagnaTagATune、GTZAN、MTG-Jamendo 四个 MIR 常用基准。两侧都覆盖 Luminate 2025 年终报告里最流行的八个类型，按类型配平。训练测试约 7 比 3。
- **Part 2 找伪影**：从 BPM、调性这类基础量，到 MFCC 均值、色度熵均值这类复杂量，先列全部候选再按可编程性和相关性筛。相关性靠 200 首 Suno 加 200 首人类的小规模试跑来判断。选中的量归入 dynamics、spectral、timbral、rhythm 四组，每组一条 Python pipeline 输出 CSV。统计分三步：描述统计、双样本检验（Welch t 或 Mann-Whitney U，分类量用卡方）、效应量（Cohen's d 或秩二列相关）。
- **Part 3 建分类器**：**故意做成简单可解释的**，直接架在伪影目录上。每个被标记的量手工定一个「AI 特征区间」，按判别力赋权重，输出是加权聚合。你在 proposal 里明写了这个取舍：牺牲一部分性能，换「任何一次判定都能回溯到具体伪影」。
- **Part 4 对抗**：设计三类 prompt 变体去攻击自己的分类器（伪影感知型、类型错位型如「hyperpop 标签下要原声民谣编配」、非常规曲式/变速/配器型），看哪些伪影扛得住提示词、哪些只是典型提示模式的副产品。

## 实际做出来的东西（来自 CV）

- 用 Python pipeline 大规模分析 AI 生成音乐的伪影，具体包括 Crest Mean（峰值因数均值）、MFCC Delta Mean Abs（MFCC 一阶差分均值绝对值）、Chroma Entropy Mean（色度熵均值）、Centroid-to-Rolloff Ratio（频谱质心与滚降频率之比）等
- 构建针对 Suno 生成音乐的检测器，并用 prompt engineering 做优化

## 时间线（proposal 里的计划）

Spring 2026 做 Part 1，Summer 2026 做 Part 2 和 3，Fall 2026 做 Part 4，Winter 2027 写稿。

## 结果

**待补。** 实验结论在 brain_honors-thesis 里，但那些是实验记录，不是「能拿出去说的话」。等你说要不要把它们提炼过来。

## 能拿来说的素材

**待补。** 现在能确定可引用的只有 proposal 里的设计取舍那一条：分类器故意做成可解释的，牺牲性能换可回溯性。这在面试里是个好答案，因为它是一个有代价的选择而不是默认选项。

## 关联

[[Blase Ur]]
[[Qile He]]

来源：proposal1.pdf、cv.pdf、cv-zh.pdf、durunbao.com 的 research 一节。
