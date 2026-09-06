# aws bedrock agentcore

**① 它解决什么问题(6-26)**

AgentCore 是 AWS 2025 下半年正式发布(GA)的**生产级 agent 平台**。它的卖点一句话戳中痛点:**"搭一个 agent 很快,但把它安全、可扩展地部署到生产环境才是真正的难点。"** ——它专治后者。你在 demo 里跑通一个 agent 是一回事,让它扛住真实流量、不出安全事故、能弹性扩展,是完全另一回事。

---

**② 框架无关 + 模型无关(6-26)**

两个"无关"是它的核心灵活性:

- **框架无关**:支持 Strands / LangGraph / CrewAI / LlamaIndex / Google ADK / OpenAI Agents SDK——你用哪个 agent 框架写的都行。
- **模型无关**:底层模型可以用 Bedrock / Anthropic / OpenAI / Gemini。

好处是**同一份代码,从本地开发到生产部署不用重写**。不把你锁死在某个框架或某个模型上。

---

**③ 模块化七组件(6-26)**

可以单独用、也可以组合用:

- **Runtime**:无服务器部署 + 弹性扩展,类似 Lambda,底层用 **microVM**(轻量虚拟机做隔离)。
- **Memory**:记忆层(正好对应你 agent-memory 那份笔记的落地形态)。
- **Gateway**:见下。
- **Identity**:身份认证(对应你 agent-security 笔记里"每次工具调用都认证")。
- **Observability**:全链路可观测(也是 agent-security 笔记的治理支柱之一)。
- **Code Interpreter**:沙箱里执行代码(隔离,不让 agent 乱跑坏东西)。
- **Browser**:云端浏览器,让 agent 做网页交互。

---

**④ Gateway 干嘛的(6-26)**

把你**现有的 API / Lambda / OpenAPI spec 包装成"任何 MCP 兼容 agent 都能调的工具"**,不用重写后端。说白了——你后端已经有一堆接口了,Gateway 给它们套个 MCP 的壳,agent 立刻就能当工具调。省去为了接 agent 而重构后端的活。

---

**⑤ 入口:CLI(6-26)**

现在推荐从命令行进:`npm i -g @aws/agentcore`,工作流是 `agentcore create / dev / deploy / invoke`(建→本地跑→部署→调用)。环境要求 **Node 20+ 和 Python 3.10+**。

---

**⑥ Policy 组件——最该划重点的一条(6-26)**

Policy 提供**实时、确定性**的控制,在 **agent 代码之外**主动拦截未授权操作。

这条直接呼应你 **agent-security 笔记的核心理念**:用**确定性的外部机制**框住**概率性的大脑**。Policy 就是那道"agent 看不到也说服不了的外部护栏"——安全检查放在 agent 上下文之外,prompt injection 再怎么忽悠也绕不过它。AgentCore 把这个理念做成了现成组件。

## 关联

[[agent-memory]] 
[[agent-security]] 
[[harness-engineering]] 
[[maas]] 
[[mcp]]
