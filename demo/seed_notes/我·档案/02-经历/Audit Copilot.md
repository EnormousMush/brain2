# Audit Copilot

**一句话**：给 FDLAMT 做的 LLM 质检 agent，帮中文流行乐多轨数据集快速入库：把验收员每首歌要跑几小时的质检自动化成 17 态的 state machine，主观判断处阻塞交还人工。

- **时间**：2026 年 5 月至 7 月
- **团队**：你和 [[杨航]] 一起动手做，[[Yunjia Li]] 监督（[phone] 口述）；[[Qile He]] 同实验室但当时不在这个组
- **实验室**：FDLAMT（复旦音乐音频技术实验室；你在 SOI 里拼作 FD-LAMT）

## 项目总体（基于你自己写的介绍，破折号按 vault 风格改成了括号）

Audit Copilot 是 FDLAMT 为构建大规模中文流行乐多轨数据集（人声 / 分轨 / MIDI / 混音工程）开发的内部 LLM agent 工具，数据集用于训练下一代音乐生成模型。它把原本需要验收员逐首歌手动跑几小时的质检流程（文件命名 / 目录结构 / WAV 格式 / 时长对齐 / 编曲检查）自动化成一个 17 态的 state machine SOP：LLM agent 跑客观检查，涉及主观判断（混音质量 / 节奏 / 结构）时阻塞交还人工。原流程每首歌约三十项人工属性核对。

**架构**：Electron 桌面端 + Python FastAPI sidecar，agent 跑在 Electron main 进程、通过 MCP 调用工具；LLM 用 **DeepSeek**（token 优化就是按它的 prompt cache 命中率实测的）。

按你 [phone] 的说法，这个数据集计划**卖给比亚迪**。**注意：这是实验室的商业安排，写进任何公开材料（简历、SOP、面试）之前，先跟实验室确认能不能说。**

## 我具体做了什么（六条，数字全是实测）

1. **全栈跨进程调试**：Electron main / renderer、Python FastAPI sidecar、stdio 的 MCP tool server 三层排障。修过一个 React hook 顺序 bug：`useRef` 被放在条件 early-return 分支里，导致整个 renderer 黑屏崩溃，挪出来恢复 hook 数量一致性
2. **macOS 原生输入修复**：Electron 的 `setApplicationMenu(null)` 只在 Darwin 上会静默关掉文本框的 Cmd+C / V / X / A（Windows 的 Chromium 原生处理，所以原作者没发现），补回一个带标准 Edit role 的最小应用菜单恢复；并协调文件树自己的 `keydown` 监听：存在文本选区时（`window.getSelection()` 非空）让位给文本复制
3. **Phase B 的 17 步 state-machine SOP 重设计**（`agent_workflow.md`）：三个重复的「听感质量」检查并成一个；两个状态从强制 mixer 窗口解耦，改用用户偏好的 Finder / 外部 DAW；把二元回答换成三选项模板 `pass / minor issue (see note) / fail`；加了防 LLM 跨状态污染的硬性不变量（2.6 vs 2.7）
4. **prompt token 量化优化**：`agent_workflow.md` 从 40,674 压到 36,893 字符（**-9.3%**），分两次提交（一次低风险清理、一次高风险去重），**每次 LLM 调用省约 2,200 input tokens**，用 DeepSeek 的 prompt cache 命中率在真实日志里量出来的；重复的不变量（如 `simulate → execute`）重构为单一出处引用
5. **human_check 决策卡 UI 迭代**：含 note 的选项延迟翻页、自动聚焦文本框、高亮输入边框，用户不会一点就错过填写；MIDI 结构标签长串（`Intro(00:02)→Verse(00:16)→…`）溢出卡片，在可选中文本区域用 `break-all` 修掉
6. **MIDI viewer 缩放对齐 AudioViewer**：magenta.js 钢琴卷帘（`<webview>` 内嵌）加滚轮缩放 + 鼠标锚定的视口保持；把 `PIXELS_PER_STEP` 改成运行时变量，重渲染管线穿过 **13 个依赖的 DOM 测量**和全部 magenta 可视化重建

## 项目卡怎么摆（你自己定的方案，[phone]）

- 标题（原文照录）：`Audit Copilot — LLM Agent for Multi-track Audio Dataset QC`
- 副标题：Contributor at FDLAMT (Fudan Lab of Audio & Music Tech), driving prompt SOP and UI iterations from a QA-reviewer's angle
- 你的建议：选 bullet **1 / 3 / 4 / 6**（架构 / prompt SOP / token 量化 / MIDI 具体产出），既显广度又有量化指标；-9.3%、~2,200 tokens、13 DOM measurements 这些数字对招聘者最有说服力
- 底部一句话：**Prompt / SOP / UI, at the boundary between the LLM and the human reviewer.**（中文版：在 LLM 和真人验收员之间，做 prompt、SOP 和 UI 的翻译。）

## 结果

**待补的只剩总量指标**：一共入库多少首、人工耗时降了多少、工具现在还在不在用。

## 关联

[[杨航]]
[[Yunjia Li]]
[[Qile He]]

来源：durunbao.com 的 build 一节；比亚迪信息来自 Frank 口述（[phone]）；团队分工、项目总体介绍、六条技术细节与项目卡方案来自 Frank 提供的项目简介（[phone]）。
