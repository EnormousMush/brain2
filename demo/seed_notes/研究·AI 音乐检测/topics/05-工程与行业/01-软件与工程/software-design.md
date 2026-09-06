# software design

**一句直觉：让非法状态根本没法被表达出来**

这份笔记是两条互相支撑的原则。第一条是 make-illegal-states-unrepresentable（构造即合法）：让非法状态在数据结构层面就根本无法表达，而不是先允许它存在、再在运行时去拦。它体现为两个具体做法：derived field（由其他字段计算得出、不独立采样，从源头消除「和来源不一致」的可能）和 single source of truth（信息只在一处声明、他处引用或计算，避免多副本各自漂移）。

**correct-by-construction 对立 generate-then-filter**

第二条把上面这个思想推到生成流程上。旧办法是各字段独立随机生成、拼起来撞了冲突就整条拒绝、重摇、再加一条规则，规则无限膨胀。新办法是先锚定身份、再沿依赖顺序条件采样，后面的字段以前面为条件生成，结构上就不可能产出非法组合，冲突规则降级成一盏报警灯。本质是「事后校验 vs 构造时保证」，类型系统、数据库约束、不可变结构都属于这一派。这正是 [[probabilistic-modeling]] 里 ancestral sampling 对立 rejection sampling 的工程版本。

**几个配套概念**

- DSL：为窄领域设计的小语言（比如声明冲突规则）配一个求值器统一解释，好处是规则和执行解耦、声明集中。
- blast radius（爆炸半径）：一次改动波及的范围，好架构让它小且可枚举。
- separation of concerns：模块只依赖另一模块的稳定接口（如合法的 SongSpec），不依赖其内部实现，上游重构不影响下游。

**重构的高频第一步：把隐式结构显式化**

老代码里字段的采样顺序本身就是一张事实依赖图，把它抠出来写成可校验的显式声明（yaml + 无环校验器），再逐条审。这张 DAG 有两种边要区分：派生/锁定边（父定子被算出、不采样、确定性）vs 条件采样边（父把子的分布收窄了，但仍然要抽样）。

**一句话总结**：好设计的核心是「让非法状态无法被表达」，从 derived field/single source of truth 到 correct-by-construction 都在把校验前移到构造时，重构则从「把隐式的依赖 DAG 显式化」开始。

## 关联

[[agent-security]]
[[probabilistic-modeling]]
