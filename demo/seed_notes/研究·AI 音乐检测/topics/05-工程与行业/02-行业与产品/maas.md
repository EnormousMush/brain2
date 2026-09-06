# maas

**一句直觉：把训练好的模型当水电一样按量卖**

MaaS（Model as a Service）是 SaaS 概念的延伸：把训练好的模型作为服务、通过 API 提供出去。用户不用自己买 GPU、部署、维护，按量付费调用就行，训练、优化、扩容、版本迭代全由提供方负责。

**通常打包成一站式平台**

提供方一般不会只给个裸模型，而是配套打包一批开发工具（WebSearch/Embedding/Rerank），凑成一站式平台，进一步降低企业接入 AI 的门槛。

**例子和定位**

Claude 本身就是 MaaS 的例子（按 token 计费调 API，不用自己部署权重，见 [[llm-api]]），国内智谱 BigModel 把 GLM 系列的文本/多模态/语音模型打包成 API 也是同一套（多模态部分见 [[multimodal]]）。它的门槛比「企业自建 AI 团队从头训练」低太多，是目前主流大模型厂商最主流的商业化路径。

要和 [[aws-bedrock-agentcore]] 区分开：后者卖的是 agent 的部署运维层，而 MaaS 卖的是模型本身。成本这条线也和 [[scaling-law]] 相关（推理成本决定定价空间）。

**一句话总结**：MaaS 把「用模型」从「自建团队+买卡+部署」压缩成「调个 API 按量付费」，是大模型厂商最主流的变现方式，卖的是模型能力本身。

## 关联

[[aws-bedrock-agentcore]]
[[llm-api]]
[[multimodal]]
[[scaling-law]]
