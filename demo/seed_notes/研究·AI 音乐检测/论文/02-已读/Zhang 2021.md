# Zhang 2021

**定位**：OC-Softmax:单类反欺骗的开山

**《One-Class Learning Towards Synthetic Voice Spoofing Detection》(IEEE SPL 2021)——单类反欺骗的开山之作。**

#### 方法
OC-Softmax 损失:嵌入空间里让真语音抱成紧凑一团,同时用角度余量(angular margin)
把假语音推出边界之外。打分 = 嵌入与"真语音方向向量"的余弦相似度。
核心思想的正式起点:**"别学假货的样子,学真货的边界"**——假货日新月异,真货相对恒定。

#### 关键数字
ASVspoof 2019 LA eval EER **2.19%**,当时所有单系统最强;
对未知攻击的泛化显著优于普通 softmax / AM-softmax。

#### 与我们的关系(流匹配相关实验及想法 第一阶)
整条"单类/真实流形"路线的哲学祖先,引用绕不开。
注意光谱位置:它**训练时仍看假样本**(推 margin 用),不是纯 real-only;
我们的第一阶(fma-train 密度模型)在光谱最极端处。
"全监督 → 单类损失(本篇)→ 质心只认真样本([[Kim 2024]])→ 纯密度(我们)"
这条谱系本身可画成论文里的一张图。

## 关联

[[deepfake-detection]]
[[loss-functions]]
