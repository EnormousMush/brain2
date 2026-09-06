**1000 首 InspireMusic(阿里 FunAudioLLM)纯音乐,与全体生成器逐条同 prompt。**

#### 基本参数
- 模型:InspireMusic-1.5B-Long(Qwen2.5 AR transformer + **流匹配**渲染 + 声码器)
  ——**LM+流匹配家族第 4 员、第 3 家独立实验室(阿里)**;天生纯音乐(唱歌是
  另一个 InspireSong 模型的事)
- 生成:RunPod A40,[phone]/30,54 秒/首,1000/1000 **零失败**,总花费 ~$8
- prompt:同一份冻结采样计划(seed 0,125/genre)+ 后缀 ", instrumental, no vocals"
  (干跑 A/B 发现无后缀会漏"人声感"音色,加后缀后压住——用户耳测拍板);
- 逐首 seed=1e6+i(torch.manual_seed);30 秒/首,48kHz 立体声 wav;
- 脚本 part1_extraction/inspiremusic_generate.py(模型加载一次循环,断点续跑)。

#### 环境雷记录(复现照抄)
yaml 内嵌相对路径(sed 成绝对)、代码硬编码 flash_attention_2(sed 成 sdpa)、
Matcha-TTS 是 git submodule(要 --init)、peft 需 ≥0.17、torch 2.13+cu130 超驱动
(降 2.6+cu124)、flash-attn/deepspeed 从 requirements 剔除(训练件,推理不需要)。

#### 质检([phone])
全量 1000 扫时长 + 峰值:**零超短、零静音**——首个无次品交付的开源生成器。

#### 位置
- Seagate:`musicdeepfake/2_corpora_ai/generators/inspire_batch_1000/`(wav + manifest.csv);Mac 无副本
- 共同规格:`frank-suno-round1/crossgen_add_inspire/`(10s/16k,offset 10)

#### 用途(Batch 8)
[[生成器混淆]] 家族故事的加固钉:铁三角(Suno/ACE-Step/LeVo)之后的**第四员**——
若它也被 Suno 探针近域内抓住,家族结论四家实验室背书;它的渲染器是**教科书式流匹配**,
也为 [[流匹配相关实验及想法]] 第三阶(生成流形打分)提供了 ACE-Step 之外的备用模型。
