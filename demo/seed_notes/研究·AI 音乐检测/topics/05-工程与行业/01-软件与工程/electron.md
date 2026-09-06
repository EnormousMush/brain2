# electron

**① Electron 是干嘛的**

一句话:**把网页技术(HTML + CSS + JS)打包成桌面 app**。你会写网页,就能用同一套技能做出 Windows/Mac 上的桌面软件(VS Code、Slack、Discord 都是这么做的)。省得为桌面端另学一套原生开发。

---

**② 两个进程,分工不同**

Electron 内部拆成两类进程:

- **Main 进程(主进程)**:跑 **Node.js**,是"管家"。管**窗口、文件读写、子进程**这些**操作系统层面**的重活。它有系统权限,能碰你电脑的真实资源。
- **Renderer 进程(渲染进程)**:跑**网页 UI**,就是用户看到、点来点去的那个界面。它本质是个浏览器环境,负责显示。

为什么要分?**安全 + 隔离**——界面(可能加载不可信内容)和系统权限**分开**,界面那边不能直接乱碰你的文件系统,得通过下面的 IPC 打报告。

---

**③ IPC:两个进程怎么对话**

Main 和 Renderer 各跑各的,要协作就得通信,靠 **IPC(Inter-Process Communication,进程间通信)**。

比如用户在界面上点"保存文件"——Renderer 自己没权限写文件,就通过 IPC **喊一声**给 Main,Main 来实际执行写盘。

**注意**:IPC 是**通用概念,不限于 Electron**——任何"多个进程要协作"的系统都用它(你 agent 笔记里 Code Interpreter 沙箱、FastAPI sidecar 之间的通信也是广义的进程间通信)。

---

**④ Sidecar:旁边单开一个后台干重活**

**Sidecar(边车)= 主程序旁边单独跑的一个后台进程**,专门承担**重活**,通过 **HTTP 等方式**和主程序通信。

你的 Audit-Copilot 就是典型——Electron+React 是前端,旁边挂一个 **Python FastAPI sidecar** 专门跑 AI/agent 逻辑。为什么这么设计?两个好处:

- **崩了不连累主程序**:sidecar 挂了,主界面还在,不会整个 app 一起死。
- **可独立升级**:想更新那个 Python 后台,不用动前端,单独换掉就行。

打个比方:主程序是主驾驶舱,sidecar 是挂在旁边的"边车"(摩托车侧斗),脏活累活丢给边车,边车翻了主车照跑。

## 关联

[[frontend]]
[[software-design]]
[[software-engineering]]
