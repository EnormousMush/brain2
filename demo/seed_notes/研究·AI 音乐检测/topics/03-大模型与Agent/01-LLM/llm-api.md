# llm api

**system prompt：每次调用都拼在最前的「角色+规则」**

system prompt 是每次调用时拼在最前面的一段文本，定义模型的角色和规则。用户看不见它，但它永远在场。它占 token，所以越短越省钱。

**prompt cache：重复前缀能打骨折**

prompt cache 会缓存重复的前缀（比如那段固定的 system prompt），命中之后这部分大约按 1/10 的价钱算。有意思的推论是：精简 prompt 实际省下的钱比账面看着要少，因为省掉的那部分本来就是被缓存打过折的。

**context window：一次能看的 token 上限**

context window 是单次调用能看进去的最大 token 数，超了就得截断或压缩。这里有个隐性代价：system prompt 太长，会挤占对话历史和工具结果的空间。窗口内的信息交给 [[attention]] 处理，窗口外的东西就得靠 [[rag]] 或 [[agent-memory]] 另外补进来。工具调用怎么标准化，见 [[mcp]]。

**一句话总结**：system prompt、prompt cache、context window 是用好 LLM API 的三个基本量，核心权衡都绕着「token 就是钱、窗口就是稀缺空间」这一条转。

## 关联

[[agent-memory]]
[[attention]]
[[mcp]]
[[rag]]
