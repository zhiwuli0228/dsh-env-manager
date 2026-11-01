# DSH 企业环境与服务上下文插件：Brainstorm 纪要

> 文档性质：需求头脑风暴 / 产品与架构探索，**不是最终技术设计或已实现功能说明**  
> 日期：2026-11-01  
> 目标读者：产品设计者、DSH 插件开发 Agent、后续技术评审人员  
> 暂定名称：**DSH Environment & Service Registry**（亦可称 Environment Manager）

## 1. 背景与问题定义

起始问题是寻找 GitHub 或现网上现成的“DSH 环境管理系统”。讨论很快澄清：这里的“环境”**不是** DSH 的 Profile、插件运行配置或 AI CLI 环境，而是企业内部用于服务部署、问题定位和运维验证的**远程运行环境**。

日常任务可能涉及：连接虚机或物理机、访问服务器 Web 管理地址、查看日志、上传文件、部署服务、替换 JAR、重启服务、安装网元代理，以及对 Kubernetes / Docker 部署执行相关操作。用户不希望每次在新的 DSH 会话中重新解释环境拓扑、登录入口、服务 Git 地址、文件路径、执行方法与操作规范。

现成工具各有所长，例如 JumpServer 偏重堡垒机和凭据访问，Termix 偏重 SSH/SFTP 主机管理，NetBox 偏重资产拓扑，Portainer 偏重容器环境管理；但它们**不能直接等价于**讨论中的企业内部定制 DSH 插件。由此决定自研，并以 **TypeScript DSH 插件**为首要交付形态。

### 核心诉求（一句话）

为 DSH 的每一个会话提供可查询、可解析、可追溯的**企业环境 + 服务 + 部署规则 + 操作 Skill + 历史经验**上下文，让 Agent 能更快、更准确、更安全地完成运维任务，并在任务结束后积累经验。

## 2. 需求演进轨迹

| 阶段 | 新增认识 | 对设计的影响 |
|---|---|---|
| 1. 环境资产 | 需要保存服务器、IP、用户、密码、URL、部署方式及逻辑拓扑 | 从“DSH Profile 管理”纠正为“企业运行环境管理” |
| 2. DSH 原生化 | 第一版采用 DSH 插件，手工配置，所有会话可读取 | 不另起复杂服务；先做共享资产库和会话工具 |
| 3. 服务与规则 | 需要记录服务 Git 地址、日志目录、class/JAR 路径，依据服务动态拼接 | 引入 Service Catalog、Rule Resolver 和 Deployment Binding |
| 4. 记忆联动 | 部署、日志查询、故障处理应沉淀下来，不断演进 | 增加操作事件、证据、知识候选与规则变更提案 |
| 5. Skill 路由 | 安装代理、安装服务、替换重启、重新部署等操作希望直达指定 Skill | 引入 Operation Skill Registry，按上下文确定性匹配 Skill |

**结果：**从“环境清单”演进为**企业运维上下文中心**，但 V1 仍应严格控制范围，避免把所有远程执行与自动学习功能一次性做完。

## 3. 目标场景

### 3.1 环境类型与拓扑

- 原生虚机/物理机上的服务；通过 SSH、SFTP、Web URL 访问。
- Docker 容器承载的业务服务。
- Kubernetes 集群和相应业务节点、控制平面节点、工作负载、容器。
- 管理面、业务面、扩展节点等逻辑角色。
- **合设**：管理面与业务面可能是同一台机器；一个节点也可以承担多个角色。不能强制按树形结构分离成不同机器。
- 同一个服务可能部署于多个环境；同一个环境也可能包含多个部署实例。

### 3.2 常见操作

- 部署或安装服务、网元代理安装。
- 替换服务包并重启、重新部署、升级与回滚。
- 登录服务器、在浏览器打开后台、查询日志、健康检查。
- 上传/下载文件，定位 JAR、Class、配置目录。
- 结合 Git 仓库定位代码、构建制品与部署版本。
- 从历史记忆查找同类问题与有效排障步骤。

### 3.3 理想交互

> “重新部署测试环境 A 的 aicoservice。”

期望 Agent 自动完成上下文准备：

1. 找到环境和服务。
2. 解析实际部署实例、节点、集群、namespace、workload、路径等。
3. 根据环境、服务、操作类型找到**明确绑定**的 Skill，而非全局重复搜索。
4. 检索适用的历史经验、限制与注意事项。
5. 执行前校验 Skill 可用性及权限；涉及重启/替换/生产写操作需要授权。
6. 执行完成后记录结构化结果、证据及可复用经验；必要时生成待审核的规则/Skill 改进建议。

> 注意：上述描述是目标能力；V1 并不承诺具备完整远程执行链路。

## 4. 核心领域模型

总体上分为四类配置事实，另有操作路由和记忆桥接：

```text
DSH Agent / Session
       |
       v
Environment Context Resolver
       |
       +--> Environment Registry ----> Environment / Host / Cluster / Role
       +--> Service Catalog ---------> Service / Git / Artifact
       +--> Deployment Binding ------> Service <-> Environment <-> Runtime
       +--> Rule Resolver -----------> Paths / Log Sources / Config / Runtime Rules
       +--> Operation Skill Router --> Operation -> Skill Reference
       |
       +<-> Memory Bridge <---------> Memories / Evidence / Operations / Proposals
```

### 4.1 Environment Registry：环境资产

字段建议：

- `environmentId`、名称、别名、环境类别（开发/测试/预发/生产）、说明。
- 节点 Host：主机名、地址、OS、IP、SSH 端口、所属环境。
- Cluster：集群 ID、Kubernetes API 入口、节点和集群关系。
- Logical Role：`management`、`business`、`extension` 等，支持自定义角色。
- Access Endpoint：SSH、Web URL、K8s API、Docker 连接端等。
- `credentialRef`：指向加密凭据库，不直接内嵌密码或 SSH 私钥。

**结构重点：环境、节点、集群、逻辑角色是不同实体；角色与节点之间可多对多绑定。**

### 4.2 Service Catalog：服务定义

存储与部署环境无关的服务信息：

- `serviceId`、名称、别名、服务类别。
- Git 仓库 URL、默认分支、可选模块路径。
- 构建方式（如 Maven）、Artifact 名称、可用部署模式。
- `ruleProfileRefs`：适用的通用规则集合。
- 可选择配置企业专属操作及服务级 Skill 绑定。

Git 仓库相关信息在 V1 先手工维护；从 `pom.xml`、Dockerfile、Helm Chart 自动提取信息属于后续扩展。

### 4.3 Deployment Binding：实际部署关系

描述**哪个服务、以何种部署形式，运行在哪个环境/节点/集群上**：

- `deploymentId`、`environmentId`、`serviceId`。
- `runtimeMode`: `native` / `docker` / `kubernetes`。
- Native：主机、进程或 systemd 服务、安装目录。
- Docker：宿主机、container、volume 关联。
- Kubernetes：cluster、namespace、workload kind/name、container 等。
- 可选的实例级变量及规则覆盖。

一个服务可在同一环境有多个实例，因此不能仅用 `(environmentId, serviceId)` 唯一识别部署。

### 4.4 Rule Catalog / Resolver：动态运维规则

需求包括：

- 安装根目录与服务目录。
- 日志目录、日志文件名称或容器日志来源。
- JAR 制品路径、class 目录或 JAR 内 Class 路径。
- 配置文件、脚本目录、进程匹配规则。
- 根据服务、环境、部署实例动态解析模板。

示例（**示意路径，非公司真实路径**）：

```yaml
ruleProfiles:
  - id: java-common
    variables:
      installRoot: /opt/company/services
    paths:
      serviceHome: "${installRoot}/${service.name}"
      jar: "${paths.serviceHome}/lib/${service.artifact}"
      logDir: "${paths.serviceHome}/logs"
      applicationLog: "${paths.logDir}/${service.name}.log"
```

规则覆盖层级建议：

1. 全局通用规则。
2. 服务级规则。
3. 环境级覆盖。
4. 部署实例级覆盖（最高）。

**要求：**按字段合并覆盖；能够解释每个最终值的来源（`provenance`）；支持预览、冲突检测、变量循环检测、未定义变量报错。模板引擎不执行 JavaScript 或 Shell。

不同运行时采用结构化日志描述，而非将一切强行解析成文件路径：

```yaml
logSources:
  native:
    kind: file
    path: "${paths.applicationLog}"
  docker:
    kind: container-stdout
    container: "${deployment.containerName}"
  kubernetes:
    kind: pod-logs
    namespace: "${deployment.namespace}"
    workload: "${deployment.workload.name}"
```

注意 class 的具体位置可以是编译输出、部署目录或 JAR 内的条目，必须区分来源类型。

## 5. Operation Skill Registry：按操作精确绑定 Skill

### 5.1 设计动机

企业运维操作已有或未来会有专门 Skill，如网元代理安装、服务安装、JAR 替换重启、K8s 重新部署、日志采集和健康检查。用户希望一句自然语言之后即可定位对应 Skill，减少重复查找及 Token 成本。

**Skill Router 负责“用哪个 Skill”，Environment Registry 负责“在哪做”，Memory 负责“过去的经验”。**

### 5.2 标准操作及扩展

建议标准化操作 ID：

- `install`、`deploy`、`redeploy`、`replace`、`restart`、`upgrade`、`rollback`、`uninstall`。
- `collect-logs`、`health-check`、`inspect`、`upload`、`download`。
- 企业自定义如 `install-ne-agent`、`sync-ne-config`。

### 5.3 绑定规则示例

```yaml
operationBindings:
  - id: binding-001
    operation: redeploy
    match:
      serviceId: aicoservice
      deploymentMode: kubernetes
      environmentId: test-a
    skill:
      name: redeploy-k8s-service
      expectedSource: null
      expectedDigest: null
    parameters:
      namespace: "${deployment.namespace}"
      workload: "${deployment.workload.name}"
      cluster: "${deployment.clusterId}"
    policy:
      requiresApproval: true
      allowProduction: false
    enabled: true
```

示例 Skill 名均为**占位名称**，不代表实际存在或已安装。

匹配优先级：

1. 部署实例级。
2. 环境 + 服务级。
3. 服务级。
4. 服务类型 + 部署模式级。
5. 全局默认。

同级冲突须显式报错，不随机选择；绑定的 Skill 不存在、不可用或来源不符时，应返回清晰诊断信息，不静默切到另一个会改变环境的 Skill。

Skill 绑定是**发现和选择指令**，不是执行授权。Skill 中的参数映射是给 Agent 的结构化上下文；实际执行仍需具体工具及权限策略。DSH Skill 注册表、加载 API、跨工作区可见性、同名覆盖策略和版本元数据须在目标版本中核实。

### 5.4 推荐操作接口

```ts
env_resolve_operation({
  environmentId: "test-a",
  serviceId: "aicoservice",
  operation: "redeploy"
});
```

返回应包含 Skill 名称、来源与可用性、部署参数、匹配规则、规则版本、审批策略及失败原因。不要把所有 Skill 文档一次性注入会话上下文；按需加载目标 Skill。

## 6. Session Context：所有会话可读

V1 目标是一个 DSH 实例下的统一资产库，允许多个会话按权限读取。至少支持：

- `env_list`：环境清单。
- `env_get`：环境与拓扑详情。
- `env_find`：按环境名称、IP、服务名检索。
- `env_resolve` / `env_get_service_context`：组合环境、服务、实例和规则，返回可用 Service Context。
- `env_resolve_operation`：操作路由与 Skill 解析。
- `env_set_context`：设置当前会话默认环境（需要验证持久化机制）。

**全局资产数据与会话上下文分离**：会话绑定不能修改其他会话默认环境，也不能改变共享配置。查询结果只能提供安全字段，例如 `credentialRef` 和凭据状态，绝不能把密钥明文暴露给模型。

解析结果必须区分：

- 手工声明或配置的事实。
- 基于规则推导的路径。
- 已经过在线操作验证的事实。
- 某次特定时间产生的历史观测。

V1 没有远程验证能力时，不能宣称某个推导出的日志文件必然存在。

## 7. Memory Manager 联动：从操作到经验

之前规划的独立记忆插件拥有结构化记忆区，如 `decision`、`knowledge`、`api-catalog`、`process`、`open-questions`、`constraints`、`runtime-base`、`playbooks`、`assets`。本次讨论决定**复用而不再造一套记忆库**，增加结构化操作事件与观测记录。

### 7.1 三方职责

| 子系统 | 权威数据与职责 |
|---|---|
| Environment Manager | 环境、节点、服务、Git 地址、部署绑定、规则、凭据引用 |
| Memory Manager | 历史经验、知识、决策、限制、排障 Playbook、证据引用 |
| Operation Skill Router | 操作类型与具体 Skill 的绑定、路由、来源校验与参数解析 |

Memory 不应复制或维护另一份 IP、密码、仓库 URL；通过稳定 `environmentId/serviceId/deploymentId` 引用。

### 7.2 闭环

```text
新任务
  -> 检索环境/服务/Skill 绑定
  -> 查询适用的 Memory（先查再执行）
  -> 授权后执行操作
  -> 结构化记录操作 + 脱敏证据
  -> 提炼知识/Playbook/待解决问题
  -> 生成规则或 Skill 改进提案
  -> 校验、审核、发布（非直接覆盖）
  -> 后续会话复用
```

### 7.3 Operation Record

建议建立结构化事件：

```ts
interface OperationRecord {
  id: string;
  sessionId: string;
  environmentId: string;
  serviceId?: string;
  deploymentId?: string;
  operation: string;
  skillRef?: string;
  startedAt: string;
  finishedAt?: string;
  outcome: "success" | "failure" | "unknown";
  evidenceRefs: string[];
  summary: string;
}
```

应记录命令/步骤类别、目标、时间、结果、相关错误与脱敏摘要；日志、密钥和敏感业务数据不能无节制持久化。**不能将 Agent 的事后总结等同于完整审计**；未来真正的执行工具需通过明确的事件上报接口传递执行结果。

### 7.4 Memory Scope 与证据

知识必须携带 `environmentId`、`serviceId`、`deploymentId`、可选服务版本/运行时版本与时间有效性，并提供来源操作/证据引用。单环境结论不能自动扩大为全局规则。`verified`、置信度必须有明确的校验依据，不能只靠模型自由判断。

新的或调整后的记忆类别可包括：

- `operation`：详细操作记录（优先存入事件存储，供记忆检索）。
- `observation`：某时刻的环境观察，带时间、有效期与证据。
- `knowledge` / `playbooks`：验证后的稳定排障知识和可复用流程。
- `open-questions`：无法确认的原因或配置差异。
- `decision` / `constraints`：设计决定与环境安全约束。

### 7.5 改进目标分流

| 经验发现 | 应更新对象 |
|---|---|
| 某节点日志路径与默认值不一致 | 环境/服务规则的覆盖提案 |
| 某安装流程缺少环境前置检查 | Skill 变更提案 |
| 某种失败拥有稳定可验证的排查流程 | Memory Playbook |
| 根因不明确 | Open Question，而非强行归纳知识 |

规则与 Skill 的**自动进化 = 自动发现候选 + 证据校验 + 影响分析 + 审核发布 + 可回滚**，不是模型直接改写配置或工作流。

## 8. 安全与治理约束

本插件会管理公司内部网络资产和可能的生产系统，因此安全为基础设计要求：

1. **凭据隔离**：密码、SSH Key、K8s token、kubeconfig 以加密 Vault 存放；Environment 和 Memory 仅保留引用，不向 Agent 回传明文。
2. **最小权限**：只读查询与远程写操作分离；凭据引用不等于自动授权使用。
3. **高风险操作确认**：服务重启、替换包、安装、删除、生产部署等需要显式授权；同时保留审计。
4. **作用域隔离**：会话默认环境是会话级数据；跨会话共享以访问控制为前提。
5. **敏感内容脱敏**：操作日志与上传的证据必须处理 Token、密码和敏感业务数据。
6. **规则安全**：变量模板解析不执行任意 JS/Shell；阻止循环引用、未定义引用和潜在危险的路径拼接。
7. **事实和推断分开**：来自规则的路径为“推导结果”，远程检查之后才可标记“已验证”。
8. **安全失败**：Skill 冲突、来源不符合、权限不足、凭据不可用时停止，不静默选择高风险替代方案。

## 9. V1 范围与演进路线

### P0：第一版必须实现

1. DSH TypeScript 插件基本骨架及本地共享数据持久化。
2. 手动配置环境、主机、K8s/Docker 资源、角色及合设关系。
3. 手动配置 Service Catalog、Git 地址与部署关系。
4. 通用模板规则 + 分层覆盖 + 规则来源解释。
5. 操作与 Skill 明确绑定、按作用域路由与可用性检查。
6. 所有 DSH 会话按需检索和解析 Service Context。
7. 最小 Web 配置界面或先以可验证的配置文件/管理接口实现，再补完整 UI。

### P1：形成最小经验闭环

1. 与独立 Memory 插件建立稳定公共契约。
2. 查询与当前服务、环境、操作相关的历史记忆。
3. 显式记录 Operation Record、Evidence Reference，生成候选知识。
4. 将潜在规则/Skill 改进建议放入待审核队列。
5. 实现会话默认环境的可靠持久化和恢复（以实际 DSH API 为准）。

### V1.1 / V2：持续演进

- SSH/SFTP、Web 浏览器、Docker/Kubernetes 远程执行适配器。
- 执行工具事件自动采集、日志脱敏、证据去重。
- 从 Git、Maven、Dockerfile、Helm 自动提取服务信息。
- Skill/规则修改提案、回归校验、影响分析、发布与回滚。
- 远程资产自动发现、多实例同步、多人协作与更完善的授权审计。

### 明确不在 V1 内承诺

- 全自动部署与自愈；
- 无人审核的生产环境规则修改或 Skill 自修改；
- 所有外部 SSH、浏览器插件操作自动且完整地纳入审计；
- 通过配置推导替代实际检查；
- 建设一整套独立的堡垒机/CMDB/集中调度平台。

## 10. 建议工程模块划分

```text
dsh-environment-manager/
├── src/
│   ├── domain/
│   │   ├── environment/
│   │   ├── service/
│   │   ├── deployment/
│   │   ├── rules/
│   │   └── operation-skill/
│   ├── storage/              # Registry 持久化、版本与加密凭据引用
│   ├── resolver/             # Context / Path / LogSource / Operation
│   ├── tools/                # DSH Agent 可调用的只读查询与路由工具
│   ├── session/              # 会话上下文绑定
│   ├── memory-bridge/        # 独立、可选的 Memory Adapter
│   └── web/                  # 手工配置与规则预览 UI
├── tests/
└── package.json
```

技术倾向：TypeScript + Node.js、Zod 校验、本地 JSON 原子写入（初期）、Vitest 测试。存储技术为**候选实现**，未作最终决策。规则和凭据应分离存储；跨 Profile 与跨 DSH 实例的共享边界需明确。

## 11. 初版验收场景

| ID | 验收任务 | 预期结果 |
|---|---|---|
| AC-01 | 新建“测试环境 A”，配置一台同时承担管理面和业务面的主机 | 能保存多角色绑定，无重复主机资产 |
| AC-02 | 配置 K8s 集群、业务工作负载和 Docker 实例 | 可查询它们与环境、服务的部署关系 |
| AC-03 | 新建 aicoservice，指定 Git 地址与制品名 | 新会话可以检索统一 Service Catalog |
| AC-04 | 配置 Java 通用日志/JAR 规则与特定环境覆盖 | 正确计算路径并显示来源/覆盖关系 |
| AC-05 | 给测试环境的 aicoservice 绑定 redeploy Skill | `env_resolve_operation` 准确返回绑定及上下文 |
| AC-06 | 同时匹配两个同级 Skill | 系统报告冲突，不随机执行 |
| AC-07 | 新开两个会话读取同一环境，各自设置默认环境 | 数据共享，但会话上下文互不干扰 |
| AC-08 | Agent 查询某环境凭据 | 仅获取凭据引用和状态，不返回明文 |
| AC-09 | 完成一次日志检查并显式记录结果 | 记忆桥接可存储脱敏的操作摘要及证据引用 |
| AC-10 | 从经验提出路径规则变更 | 产生待审提案，不自动修改生产规则 |

## 12. 待确认问题与技术验证事项

以下不是阻断产品方向的问题，但进入编码前需要明确：

1. **DSH API**：目标 DSH 版本的插件注册、Tool 注册、Skill 发现/加载、Web UI 扩展点、会话元数据及插件服务依赖的实际接口。
2. **资产存储边界**：单机 DSH_HOME、多个 Profile、多个 DSH 实例之间的数据是否需要共享；并发写入与备份策略。
3. **凭据保管**：本机密钥管理方案、解锁策略、凭据轮换、只读查看权限与审计。
4. **角色与部署类型**：是否需要更多企业特有逻辑面、节点类别、服务组合或合设关系。
5. **Skill 生命周期**：同名 Skill 解析优先级、来源绑定、内容校验、版本兼容与权限检查。
6. **Memory Contract**：原先独立记忆插件的接口稳定性、记忆归属、证据存储、去重和回写审批机制。
7. **日志与路径约定**：真实服务的日志/JAR/Class/配置目录规范及其例外情况。
8. **操作语义**：`replace`、`redeploy`、`restart` 的企业内部具体边界，以及需要审批的动作集。

## 13. 当前共识与推荐下一步

### 已形成的方向共识

- **自研** DSH 原生 TypeScript 插件，服务企业内部定制场景。
- **手工配置优先**；所有会话支持按需查询。
- 环境拓扑不能简化成文件夹树，必须支持管理面、业务面与节点合设。
- 服务、Git、部署关系和日志/JAR/Class 规则独立建模，规则可以动态解析。
- 操作到 Skill 的绑定和精确路由为 V1 核心价值，不应等到后期。
- 与此前独立 Memory 插件协作，形成先查、执行、记录、提炼、审核回写闭环。
- Memory 不维护第二份环境事实；生产配置变更不允许凭单次观察自动生效。

### 推荐开发顺序

1. 固化 `EnvironmentRef`、`ServiceRef`、`DeploymentRef`、`RuleProfile`、`OperationBinding`、`SkillReference` 等 Schema。
2. 实现**纯 TypeScript** 的 Context Resolver、Rule Resolver、Operation Skill Router，先用测试数据验证组合逻辑与冲突处理。
3. 适配 DSH 插件入口、持久化、Tool 注册，让任意会话能实际检索。
4. 实现手工配置 UI 与路径/Skill 匹配预览。
5. 定义与 Memory 的公共契约（`OperationRecord`、`EvidenceRef`、`MemoryScope`、`RuleChangeProposal`），先跑通显式记录与查询。
6. 选一套真实但非生产环境的服务作为 PoC，以具体部署、日志路径和 Skill 绑定验证模型，再根据数据调整。

---

## 附录 A：建议的最小 Service Context 输出

```json
{
  "environmentId": "test-a",
  "serviceId": "aicoservice",
  "deploymentId": "deploy-001",
  "runtimeMode": "kubernetes",
  "source": {
    "gitUrl": "https://git.example.internal/team/aicoservice.git"
  },
  "location": {
    "clusterId": "cluster-01",
    "namespace": "dv-sop",
    "workload": { "kind": "Deployment", "name": "aicoservice" }
  },
  "logSource": {
    "kind": "pod-logs",
    "namespace": "dv-sop",
    "workload": "aicoservice"
  },
  "resolvedBy": {
    "ruleProfile": "company-java",
    "status": "configured-not-verified"
  },
  "credentials": [{ "credentialRef": "cred-001", "status": "configured" }]
}
```

> 所有环境地址、Git URL、路径、服务与 Skill 名仅作建模示例，不代表现网真实数据。

## 附录 B：一句话总结

**这是一个让 DSH Agent 理解“去哪个环境、找哪个服务、用哪些规则、调用哪个 Skill、参考哪些经验”，并在操作后持续积累可信知识的企业运维上下文插件。**
