# Cros Vila 2025

**定位**：「检测器在学捷径」的领域背书

#### The AI Music Arms Race: On the Detection of AI-Generated Music

**引用:** TISMIR(tismir.254)。**把"检测器在学捷径不是学 AI"钉死的那篇——我们混淆方法论的领域背书。**

#### TL;DR
用 Suno/Udio(2 万 AI)+ MSD(1 万人类)训 CLAP-embedding 分类器,然后系统性拆穿:
检测器强烈依赖**平台管线特征**(采样率/码率/高频),跨平台就崩,重采样一下就翻车。
原话:*"合理的结论不是我们在可靠地检测 AI 音乐,而是在检测'该文件是否符合 Suno/Udio 生产管线的特征'。"*

#### 捷径证
- **采样率**:Suno/Udio 固定 48kHz vs MSD 60% 是 44.1kHz → **光靠采样率就 83% precision**;
- **码率**:Suno **固定 192kbps**、Udio **固定 320kbps** vs 人类 141±43 可变;
- **脆弱性**:**仅重采样到 22.05kHz 就让所有被测检测器输出翻转**(IRCAM Amplify 把全部 Suno 判成人类);
- 频谱:Suno kurtosis 210±354 vs MSD 49±622;删掉 <500Hz 或 >10kHz 内容 F1 就掉;
- **跨平台不对称**:训 Suno→测 Udio F1 **0.629**(同源 0.995);训 Udio→测 Suno 却 0.972;
- **OOD 崩溃**:商用 IRCAM Amplify 测 Boomy 50 首只检出 **3** 首;他们自己的 SVM 检出 6 首。

## 关联

[[confounder]]
[[deepfake-detection]]
