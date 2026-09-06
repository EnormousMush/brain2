# harness engineering

**一句直觉：把「裸模型」包装成「能真干活的系统」的全部工程**

一个裸的大模型只会吐 token，要让它真去干活，外面得套一大圈工程：工具调用接口、上下文管理（何时截断/压缩）、错误处理和重试、多 agent 调度、eval gate（评估关卡）、记忆系统的读写。这一整套就是 harness engineering。Anthropic 内部说 Claude Code 的 harness，就是这个意思。

**和 prompt / loop engineering 是同一件事的不同粒度**

- prompt engineering：单次调用怎么问。
- loop engineering：多次调用之间的循环结构，比如 plan → execute → reflect。
- harness engineering：把上面这些连同工具、记忆、护栏、调度全包进来的最外层系统。

范围从小到大是 prompt < loop < harness，loop 只是 harness 的一个子部件。

**一个产品化的例子**

GitHub 上的 affaan-m/ECC 项目把这套东西产品化了：67 个 agents + 271 个 skills，加上 rules、hooks、memory persistence、以及 AgentShield 安全扫描，可以直接接进 Claude Code/Cursor/Codex 复用别人踩过的坑。它的各个组成部分正好对应你其他几份笔记：工具接口是 [[mcp]]、记忆是 [[agent-memory]]、护栏是 [[agent-security]]、上下文管理是 [[llm-api]]。

**一句话总结**：harness 是「模型 → 可用产品」之间那层工程总和，prompt 和 loop 都只是它内部的一环，工具、记忆、护栏、调度合起来才让裸模型变成能干活的 agent。

## 关联

[[agent-memory]]
[[agent-security]]
[[llm-api]]
[[mcp]]
