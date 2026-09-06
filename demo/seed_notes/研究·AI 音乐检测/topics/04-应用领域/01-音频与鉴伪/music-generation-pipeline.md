# music generation pipeline

**一句直觉:所有音乐生成模型都是两段式,先在一个压缩过的表示里「作曲」,再把它「还原」成波形。指纹住在第二段。**

**为什么必须两段式**

10 秒 16kHz 单声道音频就是 16 万个数字。没有模型能直接凭空吐出 16 万个数字还让它听起来像音乐。所以所有生成器都先在一个压缩过的中间表示里生成,再还原。这个中间表示统称潜空间(latent space)。

前半段决定音乐内容(旋律、和声、编曲),后半段决定声音本身长什么样。**指纹来自后半段**,因为还原器留下的痕迹是它自己构造的副产品,和你生成的是什么歌无关。

**潜空间的两个流派**

**离散 token**:把音频切成小帧,每帧只能用一本码本里的一个编号来表示,于是一段音乐变成一串「词」。RVQ(残差量化)是常见做法,叠多层小码本逐层逼近。EnCodec、WavTokenizer 走这条路。细节见 [[audio-tokenizer]]。

**连续潜向量**:每帧是一串小数(比如 64 维),可以取任意值,没有码本。VAE 系(Oobleck VAE、Mel-VAE、DCAE)走这条路,见 [[vae]]。

这个区分决定了用什么生成:离散 token 就是「预测下一个词」,可以直接套语言模型那一套;连续潜向量得用扩散或流匹配,在连续空间里去噪、搬运。

**LM 在管线里的两种角色**

同样叫「用了 LM」,干的活可以完全不同:

- **LM 就是作曲本身**:在离散 token 上自回归,一个接一个吐 token。MusicGen 直出 EnCodec 的 4 层 RVQ token,InspireMusic 是 Qwen2.5 在 WavTokenizer token 上自回归;
- **LM 只做规划**:ACE-Step 的 LM Composer 负责「写谱」,真正出声的是后面在连续潜空间上跑的 DiT 流匹配。

**超分:先出粗版再补细节**

超分(super-resolution)就是先做一个低质量版本,再用一个模型把它放大加细节。图像侧是 480p 变 4K,音频侧是先出 16kHz 粗版再补出更高的采样率和高频细节。关键是超分模型不参与作曲,只管把已经定好的内容变清晰。InspireMusic 的流匹配就只干这个。

**还原阶段**

把潜表示变回波形的那一步,见 [[neural-vocoder]]。可能是声码器(HiFi-GAN)、编解码器的解码端(EnCodec decoder)、或者 VAE 的解码器。

**几家生成器的管线拆解**

| 生成器 | 作曲阶段 | 还原阶段 |
| --- | --- | --- |
| ACE-Step v1.5 | LM Composer 规划 | DiT 流匹配在 Oobleck VAE 的 25Hz 连续潜空间直接渲染 |
| LeVo(腾讯) | LeLM 双轨,规划用离散 RVQ token | Flow1dVAE 连续流渲染 |
| InspireMusic(阿里) | Qwen2.5 在 WavTokenizer 离散 token 上自回归 | 流匹配只做超分,再过 CosyVoice 血统的声码器 |
| DiffRhythm 1/2 | 无 LM,文本条件直接生成 | CFM 直渲连续 VAE 潜空间(全曲版 / 分块版) |
| MusicGen | AR 直出 EnCodec 4 码本 RVQ token | EnCodec 解码器 |
| audioldm2 / musicldm / mustango | Mel-VAE 潜空间扩散 | HiFi-GAN 声码器 |
| stable_audio_open | DiT over Oobleck 连续 VAE | 同上 VAE 解码 |
| Suno / Udio / Mureka | 未公开 | 未公开,Suno 由指纹聚类推断为连续渲染 |

**为什么这张表对鉴伪是核心**

在 honors 论文的实验里,同 prompt 锁死内容后,Suno 训练的探针抓 ACE-Step 只要 3.79% EER,抓 DiffRhythm2 要 37%,差十倍。两者同代、同 prompt,唯一的差别是渲染管线。所以检测器学到的所谓「Suno 专属指纹」其实是**架构族指纹**。

更精确的一条:族的边界由**渲染管线的实质**定义,不由技术标签定义。InspireMusic 官方也挂「LM + 流匹配」的招牌,却只被抓到 21.2%,卡在中间地带,因为它的流匹配只做超分,真正的还原器是另一台机器。所以「用没用流匹配」这个问法太粗,「流匹配在管线里干什么活」才是指纹的来源。

**一句话总结**:音乐生成 = 在离散或连续的潜空间里作曲 + 用一台还原器出声,检测器抓到的指纹几乎全部来自那台还原器,所以指纹按渲染管线分族,不按公司、训练数据或技术标签分。

## 关联

[[audio-tokenizer]]
[[neural-vocoder]]
[[vae]]
[[flow-matching]]
[[diffusion]]
[[transformer]]
[[deepfake-detection]]
[[audio-ml]]
[[pitch-representation]]
