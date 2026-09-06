#### MuQ(编码器)

`OpenMuQ/MuQ-large-msd-iter` · 音乐 SSL(腾讯 AI Lab)· round-1 **最强(EER 0.00%)**。

#### 身份
- HF id:`OpenMuQ/MuQ-large-msd-iter`(`pip install muq`)
- 类型:**音乐**自监督基础模型,**Mel-RVQ**(Mel 残差向量量化)作为预测目标
- 采样率 **24 kHz** · **~300M 参数** · 大模型(large 变体,隐维 ~1024)· 逐层 hidden states 可取
- 训练:**Million Song Dataset(MSD)**;论文 *MuQ: Self-Supervised Music Representation Learning with Mel-RVQ* (2025)

#### 我们怎么用
- **归类**:自成一派(代码 kind=`muq`,`pip install muq`)。**不用 HF 那套 processor**,直接把原始波形张量 `[1, T]` 丢给它。
- **喂之前**:它也要 **24kHz**,和我们一致。
- **接数字**:调用时加 `output_hidden_states=True`,把每一层都接下来;同样 `encode_all_layers` 压成"每层 mean‖std"的指纹。
- **做实验**:和别人一样,逐层训逻辑回归、比 EER。
- **留后手**:同样能 `encode_frames` 存单层时间序列。
- **注意**:它的"叫起来"方式和 HF 那几个不一样(不喂 processor、直接喂波形);服务器离线要先把模型下到 `.hfcache`。

#### round-1 结果
- **best test EER 0.00%**,**每一层(含 layer 0)都 0.00%** —— 最极端的 gross-confound 签名。
- 判读:数据几乎被任何表示线性可分 → **不能用它在混淆数据上做选型**;去混淆后才有意义。

参考:huggingface.co/OpenMuQ/MuQ-large-msd-iter · github.com/tencent-ailab/MuQ
