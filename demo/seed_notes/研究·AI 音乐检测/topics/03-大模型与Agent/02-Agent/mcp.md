# mcp

**一句直觉：给 LLM 调工具定一套统一的插座标准**

MCP（Model Context Protocol，Anthropic 提出）规范了 LLM 调工具的全过程：怎么列出有哪些工具、怎么调、怎么把结果传回来。工具那一端叫 MCP server，LLM 那一端用 MCP client，两边对齐同一套协议，工具就能即插即用，不用每接一个都重写胶水。

**tool call 到底怎么发生**

关键一点：LLM 自己不执行工具。它只是吐出一个结构化的 tool_use（工具名 + 参数），由外面的框架去真正执行，再把 result 塞回上下文让它继续推理。而且一轮里它可以并行发好几个 tool_use。

**它在整个体系里的位置**

MCP 就是 [[harness-engineering]] 里「工具调用接口」那一层的标准化，也是 [[aws-bedrock-agentcore]] 的 Gateway 把现有 API 包装成 agent 可调工具时对齐的协议。安全上要配合 [[agent-security]] 的网关层做检查，因为 server 返回的内容属于「外部数据」，不能无条件当可信指令。

**一句话总结**：MCP 是 LLM 与工具之间的统一协议，让工具即插即用，机制上是「模型吐 tool_use、框架执行、结果回填」的循环，是 harness 里工具层的标准。

## 关联

[[agent-security]]
[[aws-bedrock-agentcore]]
[[harness-engineering]]
