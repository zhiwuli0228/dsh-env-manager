window.__ModuleLoader__.load({
  id: 'dsh-env-manager-plugin',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useState } = React;

    const MESSAGES = {
      en: {
        title: 'Environment Manager',
        subtitle: 'Environments, services, deployments and operation routing.',
        overview: 'Overview',
        records: 'Records',
        context: 'Context',
        operations: 'Operations',
        overviewHint: 'Registry health and the latest validation run.',
        environmentsHint: 'Every environment, host, account and login audit. Start here to add a new environment.',
        recordsHint: 'Services, deployments, rule profiles and operation bindings. Environments live on the Environments tab.',
        contextHint: 'Resolve layered variables and inspect their provenance. The environment is optional: omit it to resolve the service-level context.',
        operationsHint: 'Resolve the Skill bound to an operation and context. The environment is required: pick it first, then the operation and target service. Environment-scoped operations (deploy-environment) do not need a service.',
        refresh: 'Refresh',
        validate: 'Validate',
        save: 'Save',
        remove: 'Delete',
        newRecord: 'New record',
        environments: 'Environments',
        services: 'Services',
        deployments: 'Deployments',
        ruleProfiles: 'Rule profiles',
        operationBindings: 'Operation bindings',
        runtime: 'Runtime',
        dataDir: 'Data directory',
        totalRecords: 'Total records',
        warnings: 'Warnings',
        noWarnings: 'No warnings.',
        validation: 'Validation',
        validationPassed: 'Registry is valid',
        validationFailed: 'Registry has errors',
        noDiagnostics: 'No diagnostics.',
        selectRecord: 'Select a record from the list.',
        selectRecordHint: 'Choose a record to edit its YAML, or create one from a template.',
        selectEnvironmentHint: 'Choose an environment to inspect hosts, accounts and login audit, or add a new one.',
        emptyRecords: 'No records yet',
        emptyRecordsHint: 'Create one from a template, or refresh.',
        emptyEnvironments: 'No environments yet',
        emptyEnvironmentsHint: 'Add the first environment, or refresh.',
        emptyRegistry: 'Empty registry',
        gettingStarted: 'Get started',
        gettingStartedHint: 'Register an environment first, then its services, deployments and operation bindings. Context resolution and routing become available as soon as records exist.',
        openRecords: 'Open environments',
        backToRecords: 'Back to environments',
        basicInfo: 'Basic info',
        loginRecords: 'Login records',
        endpoints: 'Endpoints',
        rawYaml: 'YAML',
        editYaml: 'Edit YAML',
        environmentOverview: 'Environment overview',
        allNodes: 'All nodes',
        allNodesHint: 'Every host in this environment, regardless of plane.',
        nodeSearch: 'Search nodes',
        nodeSearchPlaceholder: 'Name, IP, role, kind, cluster or login',
        nodeKind: 'Node type',
        hostKindVm: 'VM',
        hostKindPhysical: 'Physical',
        hostKindK8sAllInOne: 'K8s all-in-one',
        hostKindK8sWorker: 'K8s worker',
        hostKindPodHost: 'Pod host',
        nodeAccess: 'Command access',
        accessSsh: 'SSH',
        accessKubectl: 'kubectl',
        accessDocker: 'docker',
        nodeKindHint: 'All-in-one means control plane and worker on one machine; Pod host means a host running pods and operated with docker exec.',
        nodeAccessHint: 'Record the command surfaces available on this node. This is capability metadata, not a credential.',
        k8sCluster: 'K8s cluster',
        k8sClusterRequired: 'K8s node types require a cluster.',
        k8sClusterUnknown: 'Select an existing cluster.',
        clusters: 'Kubernetes / clusters',
        clusterCount: 'Clusters',
        k8sNodeCount: 'K8s / Pod nodes',
        addCluster: 'Add cluster',
        editCluster: 'Edit cluster',
        clusterId: 'Cluster ID',
        clusterName: 'Cluster name',
        clusterKind: 'Cluster type',
        clusterTopology: 'Topology',
        topologyAllInOne: 'All-in-one',
        topologySeparate: 'Separate',
        topologyExternal: 'External',
        clusterApiEndpoint: 'API endpoint',
        clusterNamespaces: 'Namespaces',
        clusterNodeCount: 'Nodes',
        clusterRequired: 'Cluster id and name are required.',
        clusterIdExists: 'That cluster id already exists.',
        noClusters: 'No clusters yet',
        noClustersHint: 'Add a K8s cluster before assigning K8s or Pod-host nodes.',
        clustersHint: 'Clusters group K8s all-in-one, worker and Pod-host nodes.',
        addNode: 'Add node',
        editNode: 'Edit node',
        batchImport: 'Batch import',
        batchImportHint: 'One node per line: IP, name, roles, port, user. Separate multiple roles with | or /. No passwords are imported.',
        batchPlaceholder: '10.20.30.52,db-02,database,22,root\n10.20.30.53,app-01,business|management,22,root',
        importNodes: 'Import nodes',
        batchCredentialsHint: 'Batch import creates nodes and optional accounts without secrets. Bind passwords later per node.',
        nodeCount: 'Nodes',
        planeSummary: 'Nodes by plane',
        roleManagement: 'Management',
        roleBusiness: 'Business',
        roleDatabase: 'Database',
        roleExtension: 'Expansion / other',
        rolesRequired: 'Select at least one role.',
        nodeFieldsRequired: 'Fill in node name and select at least one role.',
        nodeAccountIncomplete: 'Enter both login user and password, or leave both empty.',
        nodeAccountHint: 'Optional. Enter both username and password to create a password account; YAML keeps only the credential reference.',
        nodeAccountEditHint: 'Leave username and password empty to keep existing accounts. Filling both adds a new password account.',
        batchEmpty: 'Paste at least one node line.',
        batchInvalid: 'Some lines are invalid. Check the IP, roles and comma-separated fields.',
        duplicateIp: 'That IP already exists in this environment.',
        duplicateNodeId: 'That node id already exists in this environment.',
        invalidIp: 'Enter a valid IPv4 address.',
        invalidPort: 'Enter a port between 1 and 65535.',
        unknownRole: 'Unknown role.',
        nodesImported: 'Nodes imported',
        nodeAdded: 'Node added',
        nodeUpdated: 'Node updated',
        clusterAdded: 'Cluster added',
        clusterUpdated: 'Cluster updated',
        noNodes: 'No nodes yet',
        noNodesHint: 'Add the first node and assign one or more planes.',
        noNodesForPlane: 'No nodes in this plane',
        noNodesForPlaneHint: 'Add a node to this plane or import several at once.',
        accountScopeHint: 'Account ids are unique within this environment and form the credential reference.',
        accessSummary: 'Access summary',
        loginSummary: 'Login summary',
        hostCount: 'Hosts',
        name: 'Name',
        kind: 'Kind',
        target: 'Target',
        port: 'Port',
        accountCount: 'Accounts',
        endpointCount: 'Endpoints',
        latestLogin: 'Latest login',
        failedLogins: 'Failed logins',
        never: 'Not recorded',
        active: 'Active',
        inactive: 'Inactive',
        host: 'Host',
        accounts: 'Accounts',
        adminUser: 'Admin user',
        platform: 'Platform',
        ipAddress: 'IP address',
        roles: 'Roles',
        credentialRef: 'Credential ref',
        purpose: 'Purpose',
        protocol: 'Protocol',
        authType: 'Auth',
        username: 'Username',
        source: 'Source',
        note: 'Note',
        result: 'Result',
        success: 'Success',
        failure: 'Failure',
        time: 'Time',
        category: 'Category',
        aliases: 'Aliases',
        description: 'Description',
        createdAt: 'Created',
        updatedAt: 'Updated',
        noAccounts: 'No login accounts on this host.',
        noLoginRecords: 'No login records',
        noLoginRecordsHint: 'Login audit entries appear here once they are recorded.',
        noEndpoints: 'No access endpoints',
        noEndpointsHint: 'Add SSH, web or API endpoints in the YAML tab.',
        authPassword: 'Password',
        authPrivateKey: 'Private key',
        authAgent: 'Agent',
        authToken: 'Token',
        authOther: 'Other',
        editBasic: 'Edit info',
        addAccount: 'Add account',
        addWebLogin: 'Add web login',
        editAccount: 'Edit account',
        webLoginUrl: 'Web login URL',
        webLoginHint: 'For a web console, enter its login URL and username. The password is written once to the DSH credential service; YAML keeps only credentialRef.',
        accountPasswordHint: 'Leave blank to keep the existing credential reference. Enter a password to write a new credential value.',
        webLoginUrlInvalid: 'Web login URL must start with http:// or https://.',
        accountAdded: 'Account added',
        accountUpdated: 'Account updated',
        addLogin: 'Add login record',
        cancel: 'Cancel',
        hostId: 'Node id',
        hostname: 'Node name',
        os: 'OS',
        sshPort: 'SSH port',
        loginAt: 'Login time',
        loginUser: 'Login user',
        loginResult: 'Result',
        selectHost: 'Select a host',
        accountId: 'Account id',
        invalidForm: 'Fill in the required fields first.',
        action: 'Actions',
        optional: 'Optional',
        yaml: 'YAML',
        resolve: 'Resolve',
        route: 'Route',
        environmentId: 'Environment id',
        serviceId: 'Service id',
        deploymentId: 'Deployment id (optional)',
        operation: 'Operation',
        parameters: 'Parameters',
        result: 'Result',
        emptyResult: 'Fill in the ids and run Resolve.',
        emptyRoute: 'Choose an operation and run Route.',
        saved: 'Saved',
        deleted: 'Deleted',
        confirmDelete: 'Delete this record? A backup is kept.',
        loading: 'Loading…',
        panelUnavailable: 'The panel API is unavailable.',
        newEnvironment: 'New environment',
        newEnvironmentHint: 'Create the environment shell first, then add nodes by plane.',
        environmentIdOptional: 'Environment id (optional)',
        password: 'Password',
        createEnvironment: 'Create environment',
        fillEnvironmentShell: 'Fill in the environment name.',
        defaultRoles: 'Default planes',
        defaultRolesHint: 'Management, business, database and expansion are created by default. Add nodes to each plane after creating the environment.',
        envIdExists: 'That environment id already exists.',
        environmentCreated: 'Environment created',
      },
      zh: {
        title: '环境管理器',
        subtitle: '环境、服务、部署与操作路由。',
        overview: '概览',
        records: '记录',
        context: '上下文',
        operations: '操作',
        overviewHint: '注册表健康状态与最近一次校验结果。',
        environmentsHint: '所有环境、主机、账号与登录审计；新增环境从这里开始。',
        recordsHint: '服务、部署、规则集与操作绑定；环境请在「环境」页维护。',
        contextHint: '解析分层变量，并查看每个值的来源。环境可选：不填时解析服务级上下文。',
        operationsHint: '解析操作在指定上下文下绑定的 Skill。环境必选：先选环境，再选择操作与目标服务；环境级操作（如 deploy-environment）无需服务。',
        refresh: '刷新',
        validate: '校验',
        save: '保存',
        remove: '删除',
        newRecord: '新建记录',
        environments: '环境',
        services: '服务',
        deployments: '部署',
        ruleProfiles: '规则集',
        operationBindings: '操作绑定',
        runtime: '运行状态',
        dataDir: '数据目录',
        totalRecords: '记录总数',
        warnings: '警告',
        noWarnings: '无警告。',
        validation: '校验',
        validationPassed: '注册表有效',
        validationFailed: '注册表存在错误',
        noDiagnostics: '无诊断信息。',
        selectRecord: '请选择一条记录。',
        selectRecordHint: '从左侧选择记录编辑 YAML，或从模板新建。',
        selectEnvironmentHint: '从左侧选择环境查看主机、账号与登录审计，或新增环境。',
        emptyRecords: '暂无记录',
        emptyRecordsHint: '从模板新建一条，或刷新列表。',
        emptyEnvironments: '还没有环境',
        emptyEnvironmentsHint: '新增第一套环境，或刷新列表。',
        emptyRegistry: '注册表为空',
        gettingStarted: '开始使用',
        gettingStartedHint: '先注册环境，再补充服务、部署和操作绑定；有记录后即可解析上下文和路由操作。',
        openRecords: '打开环境',
        backToRecords: '返回环境列表',
        basicInfo: '基本信息',
        loginRecords: '登录记录',
        endpoints: '访问端点',
        rawYaml: 'YAML',
        editYaml: '编辑 YAML',
        environmentOverview: '环境概览',
        allNodes: '全部节点',
        allNodesHint: '环境中的全部主机，不区分平面。',
        nodeSearch: '搜索节点',
        nodeSearchPlaceholder: '名称、IP、角色、类型、集群或登录',
        nodeKind: '节点类型',
        hostKindVm: '虚机',
        hostKindPhysical: '物理机',
        hostKindK8sAllInOne: 'K8s 合设',
        hostKindK8sWorker: 'K8s 工作节点',
        hostKindPodHost: 'Pod 宿主机',
        nodeAccess: '执行方式',
        accessSsh: 'SSH',
        accessKubectl: 'kubectl',
        accessDocker: 'docker',
        nodeKindHint: '合设指控制面与工作节点同机；Pod 宿主机指运行 Pod、通过 docker exec 操作的宿主机。',
        nodeAccessHint: '记录节点上可用的命令入口；这是能力元数据，不是凭据。',
        k8sCluster: 'K8s 集群',
        k8sClusterRequired: 'K8s 类型节点必须关联集群。',
        k8sClusterUnknown: '请选择已存在的集群。',
        clusters: 'K8s / 集群',
        clusterCount: '集群',
        k8sNodeCount: 'K8s / Pod 节点',
        addCluster: '添加集群',
        editCluster: '编辑集群',
        clusterId: '集群 ID',
        clusterName: '集群名称',
        clusterKind: '集群类型',
        clusterTopology: '拓扑',
        topologyAllInOne: '合设',
        topologySeparate: '控制面/工作节点分离',
        topologyExternal: '外部托管',
        clusterApiEndpoint: 'API 地址',
        clusterNamespaces: '命名空间',
        clusterNodeCount: '节点',
        clusterRequired: '请填写集群 ID 和名称。',
        clusterIdExists: '该集群 ID 已存在。',
        noClusters: '还没有集群',
        noClustersHint: '先添加 K8s 集群，再添加 K8s 或 Pod 宿主机节点。',
        clustersHint: '集群用于归组 K8s 合设、工作节点与 Pod 宿主机节点。',
        addNode: '添加节点',
        editNode: '编辑节点',
        batchImport: '批量导入',
        batchImportHint: '每行一个节点：IP、名称、角色、端口、用户；多角色用 | 或 / 分隔。不导入密码。',
        batchPlaceholder: '10.20.30.52,db-02,database,22,root\n10.20.30.53,app-01,business|management,22,root',
        importNodes: '导入节点',
        batchCredentialsHint: '批量导入只创建节点和可选账号，不含密码；密码后续按节点绑定。',
        nodeCount: '节点',
        planeSummary: '节点分布',
        roleManagement: '管理面',
        roleBusiness: '业务面',
        roleDatabase: '数据库',
        roleExtension: '扩容 / 其他',
        rolesRequired: '请至少选择一个角色。',
        nodeFieldsRequired: '请填写节点名，并至少选择一个角色。',
        nodeAccountIncomplete: '登录用户和密码要么都填，要么都留空。',
        nodeAccountHint: '可选。填写登录用户和密码会创建密码账号；YAML 只保存凭据引用。',
        nodeAccountEditHint: '登录用户和密码留空会保留现有账号；两者都填会新增一个密码账号。',
        batchEmpty: '请至少粘贴一行节点。',
        batchInvalid: '存在无效行，请检查 IP、角色和逗号分隔格式。',
        duplicateIp: '该 IP 已存在于本环境。',
        duplicateNodeId: '该节点 ID 已存在于本环境。',
        invalidIp: '请输入合法的 IPv4 地址。',
        invalidPort: '请输入 1–65535 之间的端口。',
        unknownRole: '未知角色。',
        nodesImported: '节点已导入',
        nodeAdded: '节点已添加',
        nodeUpdated: '节点已更新',
        clusterAdded: '集群已添加',
        clusterUpdated: '集群已更新',
        noNodes: '暂无节点',
        noNodesHint: '添加第一个节点，可同时选择多个平面。',
        noNodesForPlane: '该平面暂无节点',
        noNodesForPlaneHint: '向该平面添加节点，或批量导入多个节点。',
        accountScopeHint: '账号 ID 在本环境内唯一，并用于生成凭据引用。',
        accessSummary: '访问概况',
        loginSummary: '登录概况',
        hostCount: '主机',
        name: '名称',
        kind: '类型',
        target: '目标',
        port: '端口',
        accountCount: '账号',
        endpointCount: '端点',
        latestLogin: '最近登录',
        failedLogins: '失败次数',
        never: '未记录',
        active: '启用',
        inactive: '停用',
        host: '主机',
        accounts: '账号',
        adminUser: '管理员',
        platform: '平台',
        ipAddress: 'IP 地址',
        roles: '角色',
        credentialRef: '凭据引用',
        purpose: '用途',
        protocol: '协议',
        authType: '认证',
        username: '用户名',
        source: '来源',
        note: '备注',
        result: '结果',
        success: '成功',
        failure: '失败',
        time: '时间',
        category: '类别',
        aliases: '别名',
        description: '描述',
        createdAt: '创建时间',
        updatedAt: '更新时间',
        noAccounts: '该主机还没有登录账号。',
        noLoginRecords: '暂无登录记录',
        noLoginRecordsHint: '登记 loginRecords 后会在这里显示登录审计。',
        noEndpoints: '暂无访问端点',
        noEndpointsHint: '在 YAML 页补充 SSH、Web 或 API 端点。',
        authPassword: '密码',
        authPrivateKey: '私钥',
        authAgent: 'Agent',
        authToken: 'Token',
        authOther: '其他',
        editBasic: '编辑信息',
        addAccount: '添加账号',
        addWebLogin: '添加 Web 登录',
        editAccount: '编辑账号',
        webLoginUrl: 'Web 登录 URL',
        webLoginHint: 'Web 控制台请填写登录 URL 和用户名；密码只写入 DSH 凭据服务一次，YAML 仅保留 credentialRef。',
        accountPasswordHint: '留空保留现有凭据引用；填写密码会写入新的凭据值。',
        webLoginUrlInvalid: 'Web 登录 URL 必须以 http:// 或 https:// 开头。',
        accountAdded: '账号已添加',
        accountUpdated: '账号已更新',
        addLogin: '登记登录',
        cancel: '取消',
        hostId: '节点 ID',
        hostname: '节点名',
        os: '操作系统',
        sshPort: 'SSH 端口',
        loginAt: '登录时间',
        loginUser: '登录用户',
        loginResult: '结果',
        selectHost: '选择主机',
        accountId: '账号 ID',
        invalidForm: '请先填写必填项。',
        action: '操作',
        optional: '可选',
        yaml: 'YAML',
        resolve: '解析',
        route: '路由',
        environmentId: '环境 ID',
        serviceId: '服务 ID',
        deploymentId: '部署 ID（可选）',
        operation: '操作',
        parameters: '参数',
        result: '结果',
        emptyResult: '填写 ID 后点击“解析”。',
        emptyRoute: '选择操作后点击“路由”。',
        saved: '已保存',
        deleted: '已删除',
        confirmDelete: '删除该记录？会保留备份。',
        loading: '加载中…',
        panelUnavailable: '面板 API 不可用。',
        newEnvironment: '新建环境',
        newEnvironmentHint: '先创建环境壳，再按平面添加节点。',
        environmentIdOptional: '环境 ID（可选）',
        password: '密码',
        createEnvironment: '创建环境',
        fillEnvironmentShell: '请填写环境名称。',
        defaultRoles: '默认平面',
        defaultRolesHint: '默认创建管理面、业务面、数据库和扩容四类；创建后在各自平面添加节点。',
        envIdExists: '该环境 ID 已存在。',
        environmentCreated: '环境已创建',
      },
    };
    const lang = String(navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const t = (key) => MESSAGES[lang][key] || MESSAGES.en[key] || key;

    const KINDS = ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding'];
    const RECORD_KINDS = KINDS.filter((kind) => kind !== 'environment');
    const DEFAULT_ROLES = [
      { id: 'management', name: 'Management Plane' },
      { id: 'business', name: 'Business Plane' },
      { id: 'database', name: 'Database' },
      { id: 'extension', name: 'Expansion / other' },
    ];
    const ROLE_KEYS = {
      management: 'roleManagement',
      business: 'roleBusiness',
      database: 'roleDatabase',
      extension: 'roleExtension',
    };
    const HOST_KINDS = ['vm', 'physical', 'k8s-all-in-one', 'k8s-worker', 'pod-host'];
    const HOST_KIND_KEYS = {
      vm: 'hostKindVm',
      physical: 'hostKindPhysical',
      'k8s-all-in-one': 'hostKindK8sAllInOne',
      'k8s-worker': 'hostKindK8sWorker',
      'pod-host': 'hostKindPodHost',
    };
    const K8S_NODE_KINDS = new Set(['k8s-all-in-one', 'k8s-worker']);
    const HOST_ACCESS_METHODS = ['ssh', 'kubectl', 'docker'];
    const HOST_ACCESS_KEYS = {
      ssh: 'accessSsh',
      kubectl: 'accessKubectl',
      docker: 'accessDocker',
    };
    const CLUSTER_TOPOLOGIES = ['all-in-one', 'separate', 'external'];
    const CLUSTER_TOPOLOGY_KEYS = {
      'all-in-one': 'topologyAllInOne',
      separate: 'topologySeparate',
      external: 'topologyExternal',
    };
    const DEFAULT_HOST_ACCESS = {
      vm: ['ssh'],
      physical: ['ssh'],
      'k8s-all-in-one': ['ssh', 'kubectl', 'docker'],
      'k8s-worker': ['ssh', 'kubectl'],
      'pod-host': ['ssh', 'docker'],
    };
    const hostKindLabel = (value) => t(HOST_KIND_KEYS[value] || 'hostKindVm');
    const hostAccessLabel = (value) => t(HOST_ACCESS_KEYS[value] || value);
    const topologyLabel = (value) => t(CLUSTER_TOPOLOGY_KEYS[value] || value);
    const defaultHostAccess = (kind) => [...(DEFAULT_HOST_ACCESS[kind] || ['ssh'])];
    const hostKindOf = (host) => (host && HOST_KIND_KEYS[host.kind] ? host.kind : 'vm');
    const hostAccessOf = (host) => (Array.isArray(host && host.access) ? host.access : []);
    const KIND_LABEL = {
      environment: 'environments',
      service: 'services',
      deployment: 'deployments',
      ruleProfile: 'ruleProfiles',
      operationBinding: 'operationBindings',
    };
    const CATEGORY_LABELS = {
      en: { dev: 'Development', test: 'Test', staging: 'Staging', production: 'Production', custom: 'Custom' },
      zh: { dev: '开发', test: '测试', staging: '预发', production: '生产', custom: '自定义' },
    };
    function categoryLabel(value) {
      return (CATEGORY_LABELS[lang] || CATEGORY_LABELS.en)[value] || value || '—';
    }
    function slugify(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63);
    }
    function stableSlug(value, prefix) {
      const slug = slugify(value);
      if (slug) return slug;
      let hash = 7;
      for (const char of String(value || '')) {
        hash = ((hash * 31) + char.codePointAt(0)) >>> 0;
      }
      return prefix + '-' + hash.toString(36);
    }
    function formatTime(value) {
      if (!value) return t('never');
      const time = new Date(value);
      if (Number.isNaN(time.getTime())) return value;
      return time.toLocaleString();
    }
    function authLabel(value) {
      const keys = {
        password: 'authPassword',
        'private-key': 'authPrivateKey',
        agent: 'authAgent',
        token: 'authToken',
        other: 'authOther',
      };
      return value ? t(keys[value] || value) : '—';
    }

    async function call(op, payload) {
      let response;
      try {
        response = await fetch('/env-manager/api', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-env-manager-request': '1',
          },
          body: JSON.stringify({ op, payload: payload || {} }),
        });
      } catch (error) {
        throw new Error(t('panelUnavailable'));
      }
      const data = await response.json().catch(() => null);
      if (!data || data.ok !== true) {
        const error = new Error((data && data.error && data.error.message) || response.statusText);
        error.code = data && data.error ? data.error.code : 'HTTP_' + response.status;
        error.details = data && data.error ? data.error.details : undefined;
        throw error;
      }
      return data.data;
    }

    const STYLE_ID = 'dsh-env-manager-styles';

    const CSS = `
.dem-root{height:100%;min-height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:28px 32px 48px;box-sizing:border-box;font:13px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.dem-root *{box-sizing:border-box}
.dem-shell{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
.dem-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dem-header-actions{display:flex;align-items:center;gap:8px;padding-top:2px}
.dem-heading{display:flex;align-items:flex-start;gap:12px;min-width:0}
.dem-mark{width:38px;height:38px;flex:none;display:flex;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-brand-primary)}
.dem-heading-copy{min-width:0}
.dem-title{margin:0;font-size:22px;font-weight:650;letter-spacing:-.01em;line-height:1.25}
.dem-sub{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;max-width:720px}
.dem-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l1);overflow-x:auto}
.dem-tab{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:9px 12px;margin-bottom:-1px;border-bottom:2px solid transparent;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
.dem-tab:hover{color:var(--dsw-alias-label-primary)}
.dem-tab[aria-selected="true"]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}
.dem-view{display:flex;flex-direction:column;gap:14px;min-width:0}
.dem-toolbar{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.dem-toolbar-copy{min-width:0}
.dem-section-title{margin:0;font-size:15px;font-weight:650;line-height:1.35}
.dem-hint{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.dem-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dem-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 12px;font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}
.dem-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.dem-btn:disabled{opacity:.5;cursor:default}
.dem-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.dem-btn-primary:hover{background:var(--dsw-alias-brand-primary);filter:brightness(1.06)}
.dem-btn-danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:transparent}
.dem-btn-danger:hover{background:var(--dsw-alias-bg-layer-2)}
.dem-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.dem-stat{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:14px 16px;min-width:0}
.dem-stat-label{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dem-stat-value{margin-top:6px;font-size:26px;font-weight:650;line-height:1.1;font-variant-numeric:tabular-nums}
.dem-two{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:14px;align-items:stretch}
.dem-card{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:16px 18px;min-width:0}
.dem-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.dem-pill{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:3px 9px;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);white-space:nowrap}
.dem-pill.ok{color:var(--dsw-alias-state-success-primary)}
.dem-pill.err{color:var(--dsw-alias-state-error-primary)}
.dem-pill.warn{color:var(--dsw-alias-state-warn-primary)}
.dem-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px 16px;margin:0;font-size:12px}
.dem-kv dt{color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dem-kv dd{margin:0;overflow-wrap:anywhere}
.dem-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.dem-empty{border:1px dashed var(--dsw-alias-border-l1);border-radius:10px;padding:24px 16px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;min-height:96px}
.dem-empty strong{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600}
.dem-empty .dem-btn{margin-top:8px}
.dem-diag{display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px}
.dem-diag:last-child{border-bottom:0;padding-bottom:0}
.dem-diag:first-child{padding-top:0}
.dem-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);flex:none;margin-top:5px}
.dem-dot.err{background:var(--dsw-alias-state-error-primary)}
.dem-diag-body{min-width:0}
.dem-diag-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dem-diag-msg{overflow-wrap:anywhere}
.dem-alert{margin:0;padding:10px 12px;border:1px solid var(--dsw-alias-state-error-primary);border-left:3px solid var(--dsw-alias-state-error-primary);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary);font-size:12px;white-space:pre-wrap}
.dem-toast{margin:0;display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-state-success-primary);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-success-primary);font-size:12px}
.dem-loading{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px;padding:18px 0}
.dem-spinner{width:13px;height:13px;border:2px solid var(--dsw-alias-border-l1);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dem-spin .8s linear infinite;flex:none}
@keyframes dem-spin{to{transform:rotate(360deg)}}
.dem-subtabs{display:flex;gap:4px;flex-wrap:wrap;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);align-self:flex-start;max-width:100%}
.dem-subtab{border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:7px;padding:5px 9px;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dem-subtab:hover{color:var(--dsw-alias-label-primary)}
.dem-subtab[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dem-record-layout{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:14px;align-items:start}
.dem-list-card{padding:8px;display:flex;flex-direction:column;gap:2px;min-height:480px;max-height:calc(100vh - 300px);overflow:auto}
.dem-list-card>.dem-empty{flex:1;margin:4px}
.dem-list-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 8px 8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dem-list-title{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600}
.dem-list-item{width:100%;display:flex;flex-direction:column;gap:2px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;padding:8px 10px;font:inherit;cursor:pointer;min-width:0}
.dem-list-item:hover{background:var(--dsw-alias-bg-layer-2)}
.dem-list-item[data-active="true"]{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 2px 0 var(--dsw-alias-brand-primary)}
.dem-item-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dem-item-meta{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dem-editor{padding:14px 16px;display:flex;flex-direction:column;gap:10px;min-height:480px}
.dem-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dem-editor-title{font-size:14px;font-weight:650;overflow-wrap:anywhere}
.dem-editor-sub{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.dem-textarea{width:100%;flex:1;min-height:420px;resize:vertical;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:11px 12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;tab-size:2}
.dem-empty-editor{min-height:480px;display:flex;align-items:center;justify-content:center;padding:20px}
.dem-empty-editor .dem-empty{min-height:220px;width:100%}
.dem-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.dem-form-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.dem-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.dem-label{color:var(--dsw-alias-label-secondary);font-size:12px}
.dem-input{width:100%;min-width:0;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:7px 9px;font:inherit;font-size:12px}
.dem-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.dem-result{margin:0;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;max-height:520px;overflow:auto}
.dem-flow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px}
.dem-flow-step{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:5px 10px;background:var(--dsw-alias-bg-layer-2);font-size:12px;white-space:nowrap}
.dem-flow-index{width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary)}
.dem-flow-arrow{color:var(--dsw-alias-label-secondary);font-size:12px}
.dem-flow-actions{display:flex;justify-content:flex-end;margin-top:12px}
.dem-detail{display:flex;flex-direction:column;gap:14px}
.dem-detail-top{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.dem-back{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:2px 0;font:inherit;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.dem-back:hover{color:var(--dsw-alias-label-primary)}
.dem-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.dem-detail-identity{display:flex;align-items:flex-start;gap:12px;min-width:0}
.dem-detail-mark{width:42px;height:42px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-primary);flex:none}
.dem-detail-title{margin:0;font-size:21px;font-weight:650;line-height:1.2;overflow-wrap:anywhere}
.dem-detail-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dem-detail-id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dem-detail-tabs{display:flex;gap:2px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dem-detail-tab{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);padding:8px 10px;font:inherit;font-size:12px;cursor:pointer;margin-bottom:-1px;white-space:nowrap}
.dem-detail-tab:hover{color:var(--dsw-alias-label-primary)}
.dem-detail-tab[aria-selected="true"]{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-brand-primary);font-weight:600}
.dem-detail-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(250px,.75fr);gap:14px;align-items:start}
.dem-detail-main,.dem-detail-rail{display:flex;flex-direction:column;gap:14px;min-width:0}
.dem-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 22px}
.dem-info-item{min-width:0}
.dem-info-label{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.4}
.dem-info-value{margin-top:2px;font-size:12px;overflow-wrap:anywhere}
.dem-info-value.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dem-info-wide{grid-column:1/-1}
.dem-chips{display:flex;gap:5px;flex-wrap:wrap}
.dem-chip{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);padding:2px 8px;font-size:11px}
.dem-host-card{display:flex;flex-direction:column;gap:10px}
.dem-host-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dem-host-name{font-size:13px;font-weight:650;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.dem-host-meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:3px}
.dem-host-meta code,.dem-code-inline{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}
.dem-link{color:var(--dsw-alias-brand-primary);text-decoration:none;word-break:break-all}
.dem-link:hover{text-decoration:underline}
.dem-account-url{display:block;margin-top:2px;font-size:11px}
.dem-node-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dem-node-search{flex:1;min-width:180px;max-width:320px}
.dem-plane-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.dem-plane-card{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:inherit;padding:10px 11px;text-align:left;font:inherit;cursor:pointer;min-width:0}
.dem-plane-card:hover{border-color:var(--dsw-alias-brand-primary)}
.dem-plane-card[data-active="true"]{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.dem-plane-name{display:block;color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dem-plane-count{display:block;font-size:20px;font-weight:650;line-height:1.2;margin-top:3px;font-variant-numeric:tabular-nums}
.dem-check-grid{display:flex;flex-wrap:wrap;gap:6px}
.dem-check{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);padding:5px 9px;font-size:12px;cursor:pointer;white-space:nowrap}
.dem-check input{margin:0;accent-color:var(--dsw-alias-brand-primary)}
.dem-batch-example{margin:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;color:var(--dsw-alias-label-secondary)}
.dem-form-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.45}
.dem-table-wrap{overflow-x:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:9px}
.dem-table{width:100%;border-collapse:collapse;font-size:12px;min-width:560px}
.dem-table th{text-align:left;font-weight:500;color:var(--dsw-alias-label-secondary);font-size:11px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap;background:var(--dsw-alias-bg-layer-2)}
.dem-table td{padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);vertical-align:top;overflow-wrap:anywhere}
.dem-table tr:last-child td{border-bottom:0}
.dem-table .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}
.dem-table-empty{padding:14px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;text-align:center}
.dem-detail-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.dem-detail-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:9px 10px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.dem-detail-stat b{display:block;font-size:18px;line-height:1.2;font-weight:650;font-variant-numeric:tabular-nums}
.dem-detail-stat span{display:block;color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dem-inline-form{border:1px dashed var(--dsw-alias-border-l1);border-radius:10px;padding:12px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:12px}
.dem-wizard .dem-inline-form{margin-top:14px}
.dem-inline-form .dem-textarea-sm{min-height:64px}
.dem-form-foot{display:flex;justify-content:flex-end;gap:8px}
.dem-status{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dem-status::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-secondary)}
.dem-status.active{color:var(--dsw-alias-state-success-primary)}
.dem-status.active::before{background:var(--dsw-alias-state-success-primary)}
.dem-status.inactive{color:var(--dsw-alias-state-error-primary)}
.dem-status.inactive::before{background:var(--dsw-alias-state-error-primary)}
.dem-btn:focus-visible,.dem-tab:focus-visible,.dem-subtab:focus-visible,.dem-list-item:focus-visible,.dem-input:focus-visible,.dem-textarea:focus-visible,.dem-back:focus-visible,.dem-detail-tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
@media (max-width:820px){.dem-root{padding:20px 16px 36px}.dem-two{grid-template-columns:1fr}.dem-record-layout{grid-template-columns:1fr}.dem-list-card{max-height:280px;min-height:0}.dem-detail-grid{grid-template-columns:1fr}.dem-info-grid{grid-template-columns:1fr}.dem-form-grid,.dem-form-grid-3{grid-template-columns:1fr}}
`;

    function ensureStyles() {
      if (typeof document === 'undefined') return;
      try {
        let tag = document.getElementById(STYLE_ID);
        if (!tag) {
          tag = document.createElement('style');
          tag.id = STYLE_ID;
          document.head.appendChild(tag);
        }
        tag.textContent = CSS;
      } catch (error) {
        // Styling is cosmetic; a failed injection must not break the panel.
      }
    }

    function Button(props) {
      const className = [
        'dem-btn',
        props.variant === 'primary' ? 'dem-btn-primary' : '',
        props.variant === 'danger' ? 'dem-btn-danger' : '',
        props.className || '',
      ].filter(Boolean).join(' ');
      return h('button', {
        type: 'button',
        className,
        onClick: props.onClick,
        disabled: props.disabled,
        title: props.title,
      }, props.children);
    }

    function Field(props) {
      return h('label', { className: 'dem-field' },
        h('span', { className: 'dem-label' }, props.label),
        h('input', {
          className: 'dem-input',
          type: props.type || 'text',
          value: props.value,
          placeholder: props.placeholder || '',
          required: props.required || false,
          disabled: props.disabled || false,
          autoComplete: props.autoComplete || 'off',
          inputMode: props.inputMode,
          onChange: (event) => props.onChange(event.target.value),
        }));
    }

    function Select(props) {
      return h('label', { className: 'dem-field' },
        h('span', { className: 'dem-label' }, props.label),
        h('select', {
          className: 'dem-input',
          value: props.value,
          onChange: (event) => props.onChange(event.target.value),
        }, (props.options || []).map((option) =>
          h('option', { key: option.value, value: option.value }, option.label))));
    }

    function TextArea(props) {
      return h('label', { className: 'dem-field', style: props.wide ? { gridColumn: '1 / -1' } : undefined },
        h('span', { className: 'dem-label' }, props.label),
        h('textarea', {
          className: 'dem-textarea dem-textarea-sm',
          value: props.value,
          placeholder: props.placeholder || '',
          onChange: (event) => props.onChange(event.target.value),
          rows: props.rows || 3,
        }));
    }

    function ErrorBox(props) {
      if (!props.error) return null;
      return h('div', { className: 'dem-alert', role: 'alert' }, props.error.message || String(props.error));
    }

    function Toast(props) {
      if (!props.message) return null;
      return h('div', { className: 'dem-toast', role: 'status' }, props.message);
    }

    function DiagnosticsList(props) {
      const items = props.items || [];
      if (!items.length) {
        return h('div', { className: 'dem-empty' },
          h('strong', null, t('noDiagnostics')));
      }
      return h('div', null, items.map((item, index) =>
        h('div', { key: index, className: 'dem-diag' },
          h('span', { className: 'dem-dot' + (item.severity === 'error' ? ' err' : '') }),
          h('div', { className: 'dem-diag-body' },
            h('div', { className: 'dem-diag-code' }, item.code),
            h('div', { className: 'dem-diag-msg' }, item.message)))));
    }

    function countFor(meta, kind) {
      const key = kind === 'ruleProfile' ? 'ruleProfiles'
        : kind === 'operationBinding' ? 'operationBindings'
          : kind + 's';
      return Number((meta.counts || {})[key] || 0);
    }

    function Overview(props) {
      const [meta, setMeta] = useState(null);
      const [report, setReport] = useState(null);
      const [error, setError] = useState(null);
      const [loading, setLoading] = useState(true);
      const load = useCallback(async () => {
        setLoading(true);
        try {
          setError(null);
          setMeta(await call('meta'));
        } catch (next) {
          setError(next);
        } finally {
          setLoading(false);
        }
      }, []);
      useEffect(() => { load(); }, [load]);
      const validate = async () => {
        try {
          setError(null);
          setReport(await call('validate'));
        } catch (next) {
          setError(next);
        }
      };
      const toolbar = h('div', { className: 'dem-toolbar' },
        h('div', { className: 'dem-toolbar-copy' },
          h('h2', { className: 'dem-section-title' }, t('overview')),
          h('p', { className: 'dem-hint' }, t('overviewHint'))),
        h('div', { className: 'dem-actions' },
          h(Button, { onClick: load, disabled: loading }, t('refresh')),
          h(Button, { onClick: validate, variant: 'primary' }, t('validate'))));
      if (!meta) {
        return h('div', { className: 'dem-view' }, toolbar,
          error ? h(ErrorBox, { error }) : h('div', { className: 'dem-loading' }, h('span', { className: 'dem-spinner' }), t('loading')));
      }
      const total = KINDS.reduce((sum, kind) => sum + countFor(meta, kind), 0);
      const warnings = meta.warnings || [];
      return h('div', { className: 'dem-view' },
        toolbar,
        error ? h(ErrorBox, { error }) : null,
        h('div', { className: 'dem-stats' }, KINDS.map((kind) =>
          h('div', { key: kind, className: 'dem-stat' },
            h('div', { className: 'dem-stat-label' }, t(KIND_LABEL[kind])),
            h('div', { className: 'dem-stat-value' }, String(countFor(meta, kind)))))),
        h('div', { className: 'dem-two' },
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('runtime')),
              h('span', { className: 'dem-pill' }, 'v' + meta.version)),
            h('dl', { className: 'dem-kv' },
              h('dt', null, t('dataDir')),
              h('dd', { className: 'dem-code' }, meta.dataDir),
              h('dt', null, t('totalRecords')),
              h('dd', null, String(total)))),
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('warnings')),
              h('span', { className: 'dem-pill' + (warnings.length ? ' warn' : ' ok') }, String(warnings.length))),
            warnings.length
              ? h(DiagnosticsList, { items: warnings })
              : h('div', { className: 'dem-empty' },
                h('strong', null, t('noWarnings')),
                h('span', null, t('validationPassed'))))),
        total === 0 ? h('div', { className: 'dem-card' },
          h('div', { className: 'dem-section-head' },
            h('h3', { className: 'dem-section-title' }, t('gettingStarted')),
            h('span', { className: 'dem-pill' }, t('emptyRegistry'))),
          h('p', { className: 'dem-hint' }, t('gettingStartedHint')),
          h('div', { className: 'dem-flow' },
            KINDS.filter((kind) => kind !== 'ruleProfile').map((kind, index) =>
              h(React.Fragment, { key: kind },
                index > 0 ? h('span', { className: 'dem-flow-arrow' }, '→') : null,
                h('span', { className: 'dem-flow-step' },
                  h('span', { className: 'dem-flow-index' }, String(index + 1)),
                  t(KIND_LABEL[kind]))))),
          h('div', { className: 'dem-flow-actions' },
            h(Button, { onClick: props.onCreateEnvironment, variant: 'primary' }, t('newEnvironment')))) : null,
        report ? h('div', { className: 'dem-card' },
          h('div', { className: 'dem-section-head' },
            h('h3', { className: 'dem-section-title' }, t('validation')),
            h('span', { className: 'dem-pill ' + (report.ok ? 'ok' : 'err') },
              report.ok ? t('validationPassed') : t('validationFailed'))),
          h(DiagnosticsList, { items: report.diagnostics })) : null);
    }

    const TEMPLATES = {
      environment: 'id: new-env\nschemaVersion: 1\nname: New Environment\naliases: []\ncategory: test\nroles:\n  - id: management\n    name: Management Plane\n  - id: business\n    name: Business Plane\n  - id: database\n    name: Database\n  - id: extension\n    name: Expansion / other\nhosts: []\nclusters: []\nendpoints: []\n',
      service: 'id: new-service\nschemaVersion: 1\nname: New Service\naliases: []\ncategory: backend\ngit:\n  url: https://example.invalid/repo.git\n  defaultBranch: main\ndeployModes: [kubernetes]\nruleProfileRefs: []\n',
      deployment: 'id: new-deployment\nschemaVersion: 1\nenvironmentId: new-env\nserviceId: new-service\nruntimeMode: kubernetes\nlocation:\n  kind: kubernetes\n  clusterRef: k8s-01\n  namespace: default\n  workload:\n    kind: Deployment\n    name: new-service\n',
      ruleProfile: 'id: new-rule\nschemaVersion: 1\ndescription: New rule profile\nvariables: {}\npaths: {}\n',
      operationBinding: 'id: new-binding\nschemaVersion: 1\noperation: redeploy\nmatch:\n  environmentId: new-env\n  serviceId: new-service\nskill:\n  name: example-skill\nparameters: {}\npolicy:\n  requiresApproval: true\n  allowProduction: false\nenabled: true\n',
    };

    function EnvironmentDetail(props) {
      const [tab, setTab] = useState('overview');
      const [editing, setEditing] = useState(null);
      const [draft, setDraft] = useState({});
      const [saving, setSaving] = useState(false);
      const [formError, setFormError] = useState(null);
      const [nodeQuery, setNodeQuery] = useState('');
      const [batchText, setBatchText] = useState('');
      const [expandedHost, setExpandedHost] = useState(null);
      const record = props.record || {};
      const hosts = record.hosts || [];
      const accounts = hosts.flatMap((host) => (host.accounts || []).map((account) => ({ host, account })));
      const logins = [...(record.loginRecords || [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const latest = logins[0] || null;
      const lastAccountLogin = accounts.reduce((latestAt, entry) => {
        const value = entry.account.lastLoginAt;
        return value && (!latestAt || Date.parse(value) > Date.parse(latestAt)) ? value : latestAt;
      }, '');
      const failed = logins.filter((item) => item.result === 'failure').length;
      const endpoints = record.endpoints || [];
      const clusters = record.clusters || [];
      const declaredRoles = record.roles || [];
      const roleCatalog = [...declaredRoles];
      for (const role of DEFAULT_ROLES) {
        if (!roleCatalog.some((item) => item.id === role.id)) roleCatalog.push(role);
      }
      const roleById = new Map(roleCatalog.map((role) => [role.id, role]));
      const roleName = (id) => {
        const role = roleById.get(id);
        if (ROLE_KEYS[id]) return t(ROLE_KEYS[id]);
        return (role && role.name) || id;
      };
      const countByRole = (roleId) => hosts.filter((host) => (host.roles || []).includes(roleId)).length;
      const hostById = new Map(hosts.map((host) => [host.id, host]));
      const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
      const endpointTarget = (endpoint) => {
        if (endpoint.hostRef) {
          const host = hostById.get(endpoint.hostRef);
          return host ? host.name + ' (' + endpoint.hostRef + ')' : endpoint.hostRef;
        }
        return endpoint.clusterRef || endpoint.url || '—';
      };

      const field = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
      const toIso = (value) => {
        if (!value) return undefined;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
      };
      const localNow = () => {
        const now = new Date();
        return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      };
      const isIpv4 = (value) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(String(value || '').trim());
      const rolesForSave = (selectedIds) => {
        const nextRoles = [...declaredRoles];
        for (const id of selectedIds) {
          if (!nextRoles.some((role) => role.id === id)) {
            const standard = DEFAULT_ROLES.find((role) => role.id === id);
            if (standard) nextRoles.push({ ...standard });
          }
        }
        return nextRoles;
      };
      const uniqueAccountId = (hostId, username) => {
        const base = stableSlug(hostId + '-' + username, 'account');
        let candidate = base;
        let suffix = 2;
        while (accounts.some((entry) => entry.account.id === candidate)) {
          candidate = base + '-' + suffix;
          suffix += 1;
        }
        return candidate;
      };
      const saveNext = async (next, cleanupRef) => {
        setSaving(true);
        setFormError(null);
        try {
          const normalized = { ...next };
          if (!Array.isArray(normalized.roles) || normalized.roles.length === 0) {
            normalized.roles = DEFAULT_ROLES.map((role) => ({ ...role }));
          }
          await props.onSaveRecord(normalized);
          setEditing(null);
          setNodeQuery('');
          return true;
        } catch (nextError) {
          setFormError(nextError);
          if (cleanupRef && props.onCredentialUnset) {
            await props.onCredentialUnset(cleanupRef).catch(() => {});
          }
          return false;
        } finally {
          setSaving(false);
        }
      };

      const openBasic = () => {
        setEditing('basic');
        setDraft({
          name: record.name || '',
          aliases: (record.aliases || []).join(', '),
          category: record.category || 'test',
          description: record.description || '',
        });
      };
      const submitBasic = () => {
        if (!String(draft.name || '').trim()) return;
        saveNext({
          ...record,
          name: String(draft.name).trim(),
          aliases: String(draft.aliases || '').split(',').map((item) => item.trim()).filter(Boolean),
          category: draft.category || 'custom',
          description: String(draft.description || '').trim() || undefined,
        });
      };

      const openHost = (roleId) => {
        setFormError(null);
        setEditing('host');
        setDraft({
          id: '',
          name: '',
          kind: 'vm',
          access: defaultHostAccess('vm'),
          clusterRef: '',
          ip: '',
          sshPort: '22',
          platform: '',
          adminUser: '',
          credentialRef: '',
          roles: roleId ? [roleId] : [],
          username: '',
          password: '',
        });
      };
      const openEditHost = (host) => {
        setFormError(null);
        setEditing('host-edit:' + host.id);
        setDraft({
          id: host.id,
          name: host.name || '',
          kind: hostKindOf(host),
          access: hostAccessOf(host).length ? hostAccessOf(host) : defaultHostAccess(hostKindOf(host)),
          clusterRef: host.clusterRef || '',
          ip: host.ip || '',
          sshPort: host.sshPort ? String(host.sshPort) : '22',
          platform: host.platform || host.os || '',
          adminUser: host.adminUser || '',
          credentialRef: host.credentialRef || '',
          roles: [...(host.roles || [])],
          username: '',
          password: '',
        });
      };
      const changeHostKind = (kind) => {
        setDraft((current) => ({
          ...current,
          kind,
          access: defaultHostAccess(kind),
          clusterRef: K8S_NODE_KINDS.has(kind) || kind === 'pod-host' ? current.clusterRef : '',
        }));
      };
      const toggleHostAccess = (method) => {
        setDraft((current) => {
          const access = Array.isArray(current.access) ? current.access : [];
          return {
            ...current,
            access: access.includes(method)
              ? access.filter((item) => item !== method)
              : [...access, method],
          };
        });
      };
      const submitHost = async (existingHost) => {
        const name = String(draft.name || '').trim();
        const id = existingHost
          ? existingHost.id
          : stableSlug(String(draft.id || '').trim() || name, 'node');
        const selectedRoles = Array.isArray(draft.roles) ? draft.roles : [];
        if (!name || selectedRoles.length === 0) {
          setFormError({ message: t('nodeFieldsRequired') });
          return;
        }
        if (!existingHost && hosts.some((host) => host.id === id)) {
          setFormError({ message: t('duplicateNodeId') + ' (' + id + ')' });
          return;
        }
        const ip = String(draft.ip || '').trim();
        if (ip && !isIpv4(ip)) {
          setFormError({ message: t('invalidIp') });
          return;
        }
        if (ip && hosts.some((host) => host.ip === ip && (!existingHost || host.id !== existingHost.id))) {
          setFormError({ message: t('duplicateIp') });
          return;
        }
        const username = String(draft.username || '').trim();
        const password = String(draft.password || '');
        if ((username && !password) || (!username && password)) {
          setFormError({ message: t('nodeAccountIncomplete') });
          return;
        }
        const kind = HOST_KIND_KEYS[draft.kind] ? draft.kind : 'vm';
        const access = Array.isArray(draft.access) ? draft.access : [];
        const clusterRef = String(draft.clusterRef || '').trim();
        if (K8S_NODE_KINDS.has(kind) && !clusterRef) {
          setFormError({ message: t('k8sClusterRequired') });
          return;
        }
        if (clusterRef && !clusters.some((cluster) => cluster.id === clusterRef)) {
          setFormError({ message: t('k8sClusterUnknown') });
          return;
        }
        const port = draft.sshPort ? Number(draft.sshPort) : undefined;
        if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
          setFormError({ message: t('invalidPort') });
          return;
        }
        const host = {
          ...(existingHost || {}),
          id,
          name,
          kind,
          access,
          clusterRef: clusterRef || undefined,
          ip: ip || undefined,
          sshPort: Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined,
          platform: String(draft.platform || '').trim() || undefined,
          adminUser: String(draft.adminUser || '').trim() || undefined,
          credentialRef: String(draft.credentialRef || '').trim() || undefined,
          roles: selectedRoles,
          isActive: existingHost ? existingHost.isActive : true,
          accounts: existingHost ? [...(existingHost.accounts || [])] : [],
        };
        let cleanupRef = null;
        if (username && password) {
          const accountId = uniqueAccountId(id, username);
          const credentialRef = 'env-manager/' + record.id + '/' + accountId;
          try {
            await props.onCredential(credentialRef, password);
          } catch (next) {
            setFormError(next);
            return;
          }
          cleanupRef = credentialRef;
          if (!host.credentialRef) host.credentialRef = credentialRef;
          host.accounts = host.accounts.concat([{
            id: accountId,
            username,
            purpose: existingHost ? 'added from node edit' : 'ssh login',
            protocol: 'ssh',
            port: host.sshPort || 22,
            authType: 'password',
            credentialRef,
          }]);
        }
        const nextHosts = existingHost
          ? hosts.map((item) => item.id === existingHost.id ? host : item)
          : [...hosts, host];
        const ok = await saveNext({
          ...record,
          roles: rolesForSave(selectedRoles),
          hosts: nextHosts,
        }, cleanupRef);
        if (ok && props.onMessage) props.onMessage(t(existingHost ? 'nodeUpdated' : 'nodeAdded'));
      };

      const openCluster = (existingCluster) => {
        setFormError(null);
        setEditing(existingCluster ? 'cluster-edit:' + existingCluster.id : 'cluster');
        setDraft({
          id: existingCluster ? existingCluster.id : '',
          name: existingCluster ? existingCluster.name : '',
          kind: existingCluster ? existingCluster.kind : 'kubernetes',
          topology: existingCluster ? (existingCluster.topology || '') : 'all-in-one',
          apiEndpoint: existingCluster ? existingCluster.apiEndpoint || '' : '',
          namespaces: existingCluster ? (existingCluster.namespaces || []).join(', ') : '',
          credentialRef: existingCluster ? existingCluster.credentialRef || '' : '',
          note: existingCluster ? existingCluster.note || '' : '',
        });
      };
      const submitCluster = async (existingCluster) => {
        const name = String(draft.name || '').trim();
        const id = existingCluster
          ? existingCluster.id
          : stableSlug(String(draft.id || '').trim() || name, 'cluster');
        if (!name || !id) {
          setFormError({ message: t('clusterRequired') });
          return;
        }
        if (!existingCluster && clusters.some((cluster) => cluster.id === id)) {
          setFormError({ message: t('clusterIdExists') });
          return;
        }
        const cluster = {
          ...(existingCluster || {}),
          id,
          name,
          kind: draft.kind || 'kubernetes',
          topology: draft.kind === 'docker' ? undefined : (draft.topology || undefined),
          apiEndpoint: String(draft.apiEndpoint || '').trim() || undefined,
          namespaces: String(draft.namespaces || '').split(',').map((item) => item.trim()).filter(Boolean),
          credentialRef: String(draft.credentialRef || '').trim() || undefined,
          note: String(draft.note || '').trim() || undefined,
        };
        const next = existingCluster
          ? clusters.map((item) => item.id === existingCluster.id ? cluster : item)
          : [...clusters, cluster];
        const ok = await saveNext({ ...record, clusters: next });
        if (ok && props.onMessage) props.onMessage(t(existingCluster ? 'clusterUpdated' : 'clusterAdded'));
      };

      const openAccount = (host, existingAccount, presetProtocol) => {
        const protocol = existingAccount
          ? (existingAccount.protocol || 'ssh')
          : (presetProtocol || 'ssh');
        setFormError(null);
        setExpandedHost(host.id);
        setEditing(existingAccount
          ? 'account-edit:' + host.id + ':' + existingAccount.id
          : 'account:' + host.id);
        setDraft({
          id: existingAccount ? existingAccount.id : '',
          username: existingAccount ? existingAccount.username : '',
          purpose: existingAccount ? existingAccount.purpose || '' : '',
          protocol,
          authType: existingAccount ? (existingAccount.authType || 'other') : (protocol === 'web' ? 'password' : 'private-key'),
          loginUrl: existingAccount ? existingAccount.loginUrl || '' : '',
          credentialRef: existingAccount ? existingAccount.credentialRef || '' : '',
          lastLoginAt: existingAccount ? existingAccount.lastLoginAt || '' : '',
          lastLoginFrom: existingAccount ? existingAccount.lastLoginFrom || '' : '',
          password: '',
        });
      };
      const submitAccount = async (host, existingAccount) => {
        const username = String(draft.username || '').trim();
        if (!username) {
          setFormError({ message: t('invalidForm') });
          return;
        }
        const id = existingAccount
          ? existingAccount.id
          : (String(draft.id || '').trim() || uniqueAccountId(host.id, username));
        if (!existingAccount && accounts.some((entry) => entry.account.id === id)) {
          setFormError({ message: t('accountId') + ': ' + id });
          return;
        }
        const loginUrl = String(draft.loginUrl || '').trim();
        if (loginUrl && !/^https?:\/\//i.test(loginUrl)) {
          setFormError({ message: t('webLoginUrlInvalid') });
          return;
        }
        const protocol = draft.protocol || 'ssh';
        const password = String(draft.password || '');
        let credentialRef = String(draft.credentialRef || '').trim() || undefined;
        let cleanupRef = null;
        if (password) {
          const existingRef = existingAccount && existingAccount.credentialRef;
          const ref = existingRef && existingRef.startsWith('env-manager/')
            ? existingRef
            : 'env-manager/' + record.id + '/' + id;
          try {
            await props.onCredential(ref, password);
          } catch (next) {
            setFormError(next);
            return;
          }
          if (ref !== existingRef) cleanupRef = ref;
          credentialRef = ref;
        }
        const account = {
          ...(existingAccount || {}),
          id,
          username,
          purpose: String(draft.purpose || '').trim() || undefined,
          protocol,
          loginUrl: loginUrl || undefined,
          port: protocol === 'ssh' ? (host.sshPort || 22) : undefined,
          authType: password ? 'password' : (draft.authType || 'other'),
          credentialRef,
          lastLoginAt: toIso(draft.lastLoginAt),
          lastLoginFrom: String(draft.lastLoginFrom || '').trim() || undefined,
        };
        const nextAccounts = existingAccount
          ? (host.accounts || []).map((item) => item.id === existingAccount.id ? account : item)
          : [...(host.accounts || []), account];
        const ok = await saveNext({
          ...record,
          hosts: hosts.map((item) => item.id === host.id
            ? { ...item, accounts: nextAccounts }
            : item),
        }, cleanupRef);
        if (ok && props.onMessage) props.onMessage(t(existingAccount ? 'accountUpdated' : 'accountAdded'));
      };

      const submitBatch = async () => {
        const lines = String(batchText || '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
        if (lines.length === 0) {
          setFormError({ message: t('batchEmpty') });
          return;
        }
        const nextHosts = [];
        const usedIps = new Set(hosts.map((host) => host.ip).filter(Boolean));
        const usedIds = new Set(hosts.map((host) => host.id));
        const usedRoles = new Set();
        const problems = [];
        for (const [index, line] of lines.entries()) {
          const parts = line.split(',').map((part) => part.trim());
          if (parts.length < 3 || parts.length > 5) {
            problems.push((index + 1) + ': ' + line);
            continue;
          }
          const [ip, rawName, rawRoles, rawPort, rawUser] = parts;
          const roleIds = rawRoles.split(/[|/]/).map((role) => role.trim()).filter(Boolean);
          const unknown = roleIds.filter((role) => !roleById.has(role));
          if (!ip || !isIpv4(ip) || roleIds.length === 0 || unknown.length) {
            problems.push((index + 1) + ': ' + (ip && !isIpv4(ip) ? t('invalidIp') : line));
            continue;
          }
          if (usedIps.has(ip)) {
            problems.push((index + 1) + ': ' + t('duplicateIp') + ' ' + ip);
            continue;
          }
          const port = rawPort ? Number(rawPort) : 22;
          if (!Number.isInteger(port) || port < 1 || port > 65535) {
            problems.push((index + 1) + ': ' + line);
            continue;
          }
          const name = rawName || 'node-' + ip;
          const baseId = stableSlug(name, 'node');
          let id = baseId;
          let suffix = 2;
          while (usedIds.has(id)) {
            id = baseId + '-' + suffix;
            suffix += 1;
          }
          usedIds.add(id);
          usedIps.add(ip);
          for (const role of roleIds) usedRoles.add(role);
          const account = rawUser ? {
            id: id + '-' + stableSlug(rawUser, 'user'),
            username: rawUser,
            purpose: 'ssh login',
            protocol: 'ssh',
            port,
            authType: 'password',
          } : undefined;
          nextHosts.push({
            id,
            name,
            ip,
            sshPort: port,
            roles: roleIds,
            kind: 'vm',
            access: ['ssh'],
            isActive: true,
            accounts: account ? [account] : [],
          });
        }
        if (problems.length) {
          setFormError({ message: t('batchInvalid') + '\n' + problems.slice(0, 3).join('\n') });
          return;
        }
        const ok = await saveNext({
          ...record,
          roles: rolesForSave([...usedRoles]),
          hosts: [...hosts, ...nextHosts],
        });
        if (ok) {
          setBatchText('');
          if (props.onMessage) props.onMessage(t('nodesImported') + ': ' + nextHosts.length);
        }
      };

      const openLogin = () => {
        setEditing('login');
        setDraft({
          at: localNow(),
          username: '',
          hostRef: '',
          accountId: '',
          protocol: 'ssh',
          sourceIp: '',
          result: 'success',
          note: '',
        });
      };
      const submitLogin = () => {
        const username = String(draft.username || '').trim();
        const at = toIso(draft.at);
        if (!username || !at) return;
        const entry = {
          id: 'login-' + Date.now(),
          at,
          username,
          hostRef: draft.hostRef || undefined,
          accountId: draft.accountId || undefined,
          protocol: draft.protocol || 'ssh',
          sourceIp: String(draft.sourceIp || '').trim() || undefined,
          result: draft.result === 'failure' ? 'failure' : 'success',
          note: String(draft.note || '').trim() || undefined,
        };
        const hosts = (record.hosts || []).map((host) => ({
          ...host,
          accounts: (host.accounts || []).map((account) => {
            if (entry.result !== 'success') return account;
            const matches = entry.accountId
              ? account.id === entry.accountId && (!entry.hostRef || entry.hostRef === host.id)
              : entry.hostRef === host.id && account.username === entry.username;
            if (!matches) return account;
            const previous = account.lastLoginAt ? Date.parse(account.lastLoginAt) : 0;
            if (previous > Date.parse(entry.at)) return account;
            return {
              ...account,
              lastLoginAt: entry.at,
              lastLoginFrom: entry.sourceIp || account.lastLoginFrom,
            };
          }),
        }));
        saveNext({
          ...record,
          hosts,
          loginRecords: [entry, ...(record.loginRecords || [])],
        });
      };

      const info = (label, value, options = {}) => h('div', {
        className: 'dem-info-item' + (options.wide ? ' dem-info-wide' : ''),
      },
        h('div', { className: 'dem-info-label' }, label),
        h('div', { className: 'dem-info-value' + (options.mono ? ' mono' : '') },
          value === undefined || value === null || value === '' ? '—' : value));

      const planeSummary = h('div', { className: 'dem-plane-grid' }, roleCatalog.map((role) =>
        h('button', {
          key: role.id,
          type: 'button',
          className: 'dem-plane-card',
          'data-active': tab === 'role:' + role.id ? 'true' : 'false',
          onClick: () => setTab('role:' + role.id),
        },
          h('span', { className: 'dem-plane-name' }, roleName(role.id)),
          h('span', { className: 'dem-plane-count' }, String(countByRole(role.id))))));

      const basicForm = h('div', { className: 'dem-inline-form' },
        h('div', { className: 'dem-form-grid dem-form-grid-3' },
          h(Field, { label: t('name'), value: draft.name || '', onChange: field('name') }),
          h(Field, { label: t('aliases'), value: draft.aliases || '', onChange: field('aliases'), placeholder: 'ta, test-a' }),
          h(Select, {
            label: t('category'),
            value: draft.category || 'test',
            onChange: field('category'),
            options: ['dev', 'test', 'staging', 'production', 'custom'].map((value) => ({ value, label: categoryLabel(value) })),
          }),
          h(TextArea, { label: t('description'), value: draft.description || '', onChange: field('description'), rows: 2, wide: true })),
        h('div', { className: 'dem-form-foot' },
          h(Button, { onClick: () => setEditing(null) }, t('cancel')),
          h(Button, { onClick: submitBasic, variant: 'primary', disabled: saving }, t('save'))));

      const overview = h('div', { className: 'dem-detail-grid' },
        h('div', { className: 'dem-detail-main' },
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('basicInfo')),
              h('div', { className: 'dem-actions' },
                h('span', { className: 'dem-pill' }, categoryLabel(record.category)),
                h(Button, { onClick: openBasic, disabled: editing === 'basic' }, t('editBasic')))),
            editing === 'basic' ? basicForm : h('div', { className: 'dem-info-grid' },
              info('ID', record.id, { mono: true }),
              info(t('category'), categoryLabel(record.category)),
              info(t('name'), record.name),
              info(t('aliases'), (record.aliases || []).join(', ') || '—'),
              info(t('description'), record.description, { wide: true }),
              info(t('createdAt'), formatTime(record.createdAt)),
              info(t('updatedAt'), formatTime(record.updatedAt)),
              info(t('hostCount'), String(hosts.length)),
              info(t('accountCount'), String(accounts.length)))),
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('planeSummary')),
              h(Button, { onClick: () => openHost(), variant: 'primary' }, t('addNode'))),
            planeSummary),
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('allNodes')),
              h('span', { className: 'dem-pill' }, String(hosts.length))),
            hosts.length
              ? h('div', { className: 'dem-chips' }, hosts.map((host) =>
                h('span', { key: host.id, className: 'dem-chip' }, host.name + ' · ' + (host.ip || host.id))))
              : h('div', { className: 'dem-empty' },
                h('strong', null, t('noNodes')),
                h('span', null, t('noNodesHint')),
                h(Button, { onClick: () => openHost(), variant: 'primary' }, t('addNode'))))),
        h('div', { className: 'dem-detail-rail' },
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('accessSummary'))),
            h('div', { className: 'dem-detail-stats' },
              h('div', { className: 'dem-detail-stat' },
                h('b', null, String(hosts.length)), h('span', null, t('hostCount'))),
              h('div', { className: 'dem-detail-stat' },
                h('b', null, String(accounts.length)), h('span', null, t('accountCount'))),
              h('div', { className: 'dem-detail-stat' },
                h('b', null, String(endpoints.length)), h('span', null, t('endpointCount'))),
              h('div', { className: 'dem-detail-stat' },
                h('b', null, String(clusters.length)), h('span', null, t('clusterCount'))),
              h('div', { className: 'dem-detail-stat' },
                h('b', null, String(hosts.filter((host) => !['vm', 'physical'].includes(hostKindOf(host))).length)),
                h('span', null, t('k8sNodeCount'))),
              h('div', { className: 'dem-detail-stat' },
                h('b', null, String(failed)), h('span', null, t('failedLogins')))),
            h('div', { className: 'dem-info-item', style: { marginTop: '12px' } },
              h('div', { className: 'dem-info-label' }, t('latestLogin')),
              h('div', { className: 'dem-info-value' },
                latest ? formatTime(latest.at) : (lastAccountLogin ? formatTime(lastAccountLogin) : t('never'))))),
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('roles'))),
            h('div', { className: 'dem-chips' }, roleCatalog.map((role) =>
              h('span', { key: role.id, className: 'dem-chip', title: role.id },
                roleName(role.id) + ' · ' + countByRole(role.id)))))));

      const hostForm = (existingHost) => h('div', { className: 'dem-inline-form' },
        h('div', { className: 'dem-form-grid dem-form-grid-3' },
          h(Field, {
            label: t('hostId'),
            value: draft.id || '',
            onChange: field('id'),
            placeholder: 'node-01',
            disabled: Boolean(existingHost),
          }),
          h(Field, { label: t('hostname'), value: draft.name || '', onChange: field('name'), placeholder: 'node-01' }),
          h(Select, {
            label: t('nodeKind'),
            value: draft.kind || 'vm',
            onChange: changeHostKind,
            options: HOST_KINDS.map((value) => ({ value, label: hostKindLabel(value) })),
          }),
          h(Select, {
            label: t('k8sCluster'),
            value: draft.clusterRef || '',
            onChange: field('clusterRef'),
            options: [{ value: '', label: '—' }].concat(clusters.map((cluster) => ({
              value: cluster.id,
              label: cluster.name || cluster.id,
            }))),
          }),
          h(Field, { label: t('ipAddress'), value: draft.ip || '', onChange: field('ip'), placeholder: '10.0.1.10' }),
          h(Field, { label: t('sshPort'), value: draft.sshPort || '', onChange: field('sshPort'), type: 'number', inputMode: 'numeric' }),
          h(Field, { label: t('platform'), value: draft.platform || '', onChange: field('platform'), placeholder: 'Linux / x86_64' }),
          h(Field, { label: t('adminUser'), value: draft.adminUser || '', onChange: field('adminUser'), placeholder: 'root' }),
          h(Field, { label: t('credentialRef'), value: draft.credentialRef || '', onChange: field('credentialRef'), placeholder: 'cred-host-root' })),
        h('div', { className: 'dem-field' },
          h('span', { className: 'dem-label' }, t('roles')),
          h('div', { className: 'dem-check-grid' }, roleCatalog.map((role) =>
            h('label', { key: role.id, className: 'dem-check' },
              h('input', {
                type: 'checkbox',
                checked: (draft.roles || []).includes(role.id),
                onChange: () => setDraft((current) => {
                  const selected = current.roles || [];
                  return {
                    ...current,
                    roles: selected.includes(role.id)
                      ? selected.filter((id) => id !== role.id)
                      : [...selected, role.id],
                  };
                }),
              }),
              roleName(role.id))))),
        h('div', { className: 'dem-field' },
          h('span', { className: 'dem-label' }, t('nodeAccess')),
          h('div', { className: 'dem-check-grid' }, HOST_ACCESS_METHODS.map((method) =>
            h('label', { key: method, className: 'dem-check' },
              h('input', {
                type: 'checkbox',
                checked: (draft.access || []).includes(method),
                onChange: () => toggleHostAccess(method),
              }),
              hostAccessLabel(method))))),
        h('p', { className: 'dem-hint' }, t('nodeKindHint') + ' ' + t('nodeAccessHint')),
        h('div', { className: 'dem-form-grid dem-form-grid-3' },
          h(Field, { label: t('loginUser'), value: draft.username || '', onChange: field('username'), placeholder: 'root', autoComplete: 'username' }),
          h(Field, { label: t('password'), value: draft.password || '', onChange: field('password'), type: 'password', autoComplete: 'new-password' })),
        h('p', { className: 'dem-hint' }, existingHost ? t('nodeAccountEditHint') : t('nodeAccountHint')),
        formError ? h('div', { className: 'dem-form-error' }, formError.message || String(formError)) : null,
        h('div', { className: 'dem-form-foot' },
          h(Button, { onClick: () => { setEditing(null); setFormError(null); } }, t('cancel')),
          h(Button, { onClick: () => submitHost(existingHost), variant: 'primary', disabled: saving }, t('save'))));

      const accountForm = (host, existingAccount) => h('div', { className: 'dem-inline-form' },
        h('p', { className: 'dem-hint' }, existingAccount ? t('editAccount') : t('addAccount')),
        h('div', { className: 'dem-form-grid' },
          h(Field, {
            label: t('accountId'),
            value: draft.id || '',
            onChange: field('id'),
            placeholder: 'root',
            disabled: Boolean(existingAccount),
          }),
          h(Field, { label: t('username'), value: draft.username || '', onChange: field('username'), placeholder: 'root', autoComplete: 'username' }),
          h(Field, {
            label: t('webLoginUrl'),
            value: draft.loginUrl || '',
            onChange: field('loginUrl'),
            placeholder: 'https://console.example.com/login',
          }),
          h(Field, { label: t('purpose'), value: draft.purpose || '', onChange: field('purpose'), placeholder: 'DBA / admin' }),
          h(Select, {
            label: t('protocol'), value: draft.protocol || 'ssh', onChange: (value) => setDraft((current) => ({
              ...current,
              protocol: value,
              authType: value === 'web' ? 'password' : current.authType,
            })),
            options: ['ssh', 'rdp', 'web', 'k8s-api', 'docker', 'custom'].map((value) => ({ value, label: value.toUpperCase() })),
          }),
          h(Select, {
            label: t('authType'), value: draft.authType || 'private-key', onChange: field('authType'),
            options: ['password', 'private-key', 'agent', 'token', 'other'].map((value) => ({ value, label: authLabel(value) })),
          }),
          h(Field, {
            label: t('password'),
            value: draft.password || '',
            onChange: field('password'),
            type: 'password',
            placeholder: t('optional'),
            autoComplete: 'new-password',
          }),
          h(Field, { label: t('credentialRef'), value: draft.credentialRef || '', onChange: field('credentialRef'), placeholder: 'cred-host-root' }),
          h(Field, { label: t('latestLogin'), value: draft.lastLoginAt || '', onChange: field('lastLoginAt'), type: 'datetime-local' }),
          h(Field, { label: t('source'), value: draft.lastLoginFrom || '', onChange: field('lastLoginFrom'), placeholder: '10.0.8.21' })),
        h('p', { className: 'dem-hint' }, t('webLoginHint') + ' ' + t('accountPasswordHint')),
        formError ? h('div', { className: 'dem-form-error' }, formError.message || String(formError)) : null,
        h('div', { className: 'dem-form-foot' },
          h(Button, { onClick: () => { setEditing(null); setFormError(null); } }, t('cancel')),
          h(Button, { onClick: () => submitAccount(host, existingAccount), variant: 'primary', disabled: saving }, t('save'))));

      const editingAccountFor = (host) => {
        if (!editing) return null;
        const prefix = 'account-edit:' + host.id + ':';
        if (!editing.startsWith(prefix)) return null;
        const accountId = editing.slice(prefix.length);
        return (host.accounts || []).find((account) => account.id === accountId) || null;
      };

      const nodesView = (roleId) => {
        const activeRole = roleId ? roleById.get(roleId) : null;
        const query = nodeQuery.trim().toLowerCase();
        const visibleHosts = hosts.filter((host) => {
          if (roleId && !(host.roles || []).includes(roleId)) return false;
          if (!query) return true;
          return [
            host.id,
            host.name,
            host.ip,
            host.platform,
            host.adminUser,
            hostKindOf(host),
            hostKindLabel(hostKindOf(host)),
            host.clusterRef,
            host.clusterRef ? ((clusterById.get(host.clusterRef) || {}).name || '') : '',
            ...hostAccessOf(host),
            ...hostAccessOf(host).map((method) => hostAccessLabel(method)),
            ...(host.accounts || []).flatMap((account) => [
              account.username,
              account.purpose,
              account.loginUrl,
            ]),
            ...(host.roles || []),
          ].filter(Boolean).join(' ').toLowerCase().includes(query);
        });
        const editingHost = editing && editing.startsWith('host-edit:')
          ? hosts.find((host) => host.id === editing.slice('host-edit:'.length))
          : null;
        return h('div', { className: 'dem-detail-main' },
          h('div', { className: 'dem-toolbar' },
            h('div', { className: 'dem-toolbar-copy' },
              h('h3', { className: 'dem-section-title' }, activeRole ? roleName(activeRole.id) : t('allNodes')),
              h('p', { className: 'dem-hint' },
                (activeRole ? roleName(activeRole.id) + ' · ' : '') + visibleHosts.length + ' ' + t('nodeCount'))),
            h('div', { className: 'dem-node-toolbar' },
              h('input', {
                className: 'dem-input dem-node-search',
                value: nodeQuery,
                placeholder: t('nodeSearchPlaceholder'),
                'aria-label': t('nodeSearch'),
                onChange: (event) => setNodeQuery(event.target.value),
              }),
              h(Button, { onClick: () => openHost(roleId), variant: 'primary' }, t('addNode')),
              h(Button, { onClick: () => { setFormError(null); setEditing('batch'); } }, t('batchImport')))),
          editing === 'host' || editingHost ? hostForm(editingHost) : null,
          editing === 'batch' ? h('div', { className: 'dem-inline-form' },
            h('p', { className: 'dem-hint' }, t('batchImportHint')),
            h('pre', { className: 'dem-batch-example' }, t('batchPlaceholder')),
            h('textarea', {
              className: 'dem-textarea dem-textarea-sm',
              value: batchText,
              placeholder: t('batchPlaceholder'),
              rows: 6,
              'aria-label': t('batchImport'),
              onChange: (event) => setBatchText(event.target.value),
              spellCheck: false,
            }),
            h('p', { className: 'dem-hint' }, t('batchCredentialsHint')),
            formError ? h('div', { className: 'dem-form-error' }, formError.message || String(formError)) : null,
            h('div', { className: 'dem-form-foot' },
              h(Button, { onClick: () => { setEditing(null); setFormError(null); } }, t('cancel')),
              h(Button, { onClick: submitBatch, variant: 'primary', disabled: saving }, t('importNodes')))) : null,
          visibleHosts.length
            ? visibleHosts.map((host) =>
              h('div', { key: host.id, className: 'dem-card dem-host-card' },
                h('div', { className: 'dem-host-head' },
                  h('div', null,
                    h('div', { className: 'dem-host-name' },
                      host.name || host.id,
                      host.isActive === true ? h('span', { className: 'dem-status active' }, t('active')) : null,
                      host.isActive === false ? h('span', { className: 'dem-status inactive' }, t('inactive')) : null),
                    h('div', { className: 'dem-host-meta' },
                      h('span', null, t('ipAddress') + ': ' + (host.ip || '—') + (host.sshPort ? ':' + host.sshPort : '')),
                      h('span', null, t('platform') + ': ' + (host.platform || host.os || '—')),
                      h('span', null, t('adminUser') + ': ' + (host.adminUser || '—')),
                      h('span', null, t('accountCount') + ': ' + (host.accounts || []).length),
                      host.clusterRef ? h('span', null, t('k8sCluster') + ': ' + ((clusterById.get(host.clusterRef) || {}).name || host.clusterRef)) : null,
                      host.credentialRef ? h('span', { className: 'dem-code-inline' }, t('credentialRef') + ': ' + host.credentialRef) : null)),
                  h('div', { className: 'dem-actions' },
                    h('div', { className: 'dem-chips' },
                      h('span', { className: 'dem-chip' }, hostKindLabel(hostKindOf(host))),
                      ...hostAccessOf(host).map((method) =>
                        h('span', { key: method, className: 'dem-chip' }, hostAccessLabel(method))),
                      ...(host.roles || []).map((role) =>
                        h('span', { key: role, className: 'dem-chip' }, roleName(role)))),
                    h(Button, { onClick: () => openEditHost(host) }, t('editNode')),
                    h(Button, {
                      onClick: () => setExpandedHost(expandedHost === host.id ? null : host.id),
                    }, t('accounts') + ' (' + (host.accounts || []).length + ')'),
                    h(Button, { onClick: () => { setExpandedHost(host.id); openAccount(host); } }, t('addAccount')),
                    h(Button, { onClick: () => { setExpandedHost(host.id); openAccount(host, null, 'web'); } }, t('addWebLogin')))),
                expandedHost === host.id || editing === 'account:' + host.id || editingAccountFor(host)
                  ? h(React.Fragment, null,
                    editing === 'account:' + host.id || editingAccountFor(host)
                      ? accountForm(host, editingAccountFor(host))
                      : null,
                    (host.accounts || []).length
                      ? h('div', { className: 'dem-table-wrap' },
                        h('table', { className: 'dem-table' },
                          h('thead', null, h('tr', null,
                            h('th', null, t('username')),
                            h('th', null, t('purpose')),
                            h('th', null, t('protocol')),
                            h('th', null, t('authType')),
                            h('th', null, t('credentialRef')),
                            h('th', null, t('latestLogin')),
                            h('th', null, t('source')),
                            h('th', null, t('action')))),
                          h('tbody', null, (host.accounts || []).map((account) =>
                            h('tr', { key: account.id },
                              h('td', null,
                                h('strong', null, account.username || account.id),
                                account.loginUrl
                                  ? h('a', {
                                    className: 'dem-link dem-account-url',
                                    href: account.loginUrl,
                                    target: '_blank',
                                    rel: 'noreferrer noopener',
                                  }, account.loginUrl)
                                  : null),
                              h('td', null, account.purpose || '—'),
                              h('td', { className: 'mono' }, (account.protocol || 'ssh').toUpperCase()),
                              h('td', null, authLabel(account.authType)),
                              h('td', { className: 'mono' }, account.credentialRef || '—'),
                              h('td', null, account.lastLoginAt ? formatTime(account.lastLoginAt) : t('never')),
                              h('td', { className: 'mono' }, account.lastLoginFrom || '—'),
                              h('td', null, h(Button, { onClick: () => openAccount(host, account) }, t('editAccount'))))))))
                      : h('div', { className: 'dem-table-empty' },
                        t('noAccounts') + ' ',
                        h(Button, { onClick: () => openAccount(host) }, t('addAccount')),
                        h(Button, { onClick: () => openAccount(host, null, 'web') }, t('addWebLogin'))))
                  : null))
            : h('div', { className: 'dem-card' },
              h('div', { className: 'dem-empty' },
                h('strong', null, activeRole ? t('noNodesForPlane') : t('noNodes')),
                h('span', null, activeRole ? t('noNodesForPlaneHint') : t('noNodesHint')),
                h(Button, { onClick: () => openHost(roleId), variant: 'primary' }, t('addNode')))));
      };

      const selectedHost = hosts.find((host) => host.id === draft.hostRef);
      const loginForm = h('div', { className: 'dem-card' },
        h('div', { className: 'dem-inline-form' },
          h('div', { className: 'dem-form-grid' },
            h(Field, { label: t('loginAt'), value: draft.at || '', onChange: field('at'), type: 'datetime-local' }),
            h(Field, { label: t('loginUser'), value: draft.username || '', onChange: field('username'), placeholder: 'root' }),
            h(Select, {
              label: t('host'), value: draft.hostRef || '', onChange: (value) => {
                setDraft((current) => ({ ...current, hostRef: value, accountId: '' }));
              },
              options: [{ value: '', label: t('selectHost') }].concat(hosts.map((host) => ({ value: host.id, label: host.name || host.id }))),
            }),
            h(Select, {
              label: t('accountId'), value: draft.accountId || '', onChange: (value) => {
                const account = ((selectedHost && selectedHost.accounts) || []).find((item) => item.id === value);
                setDraft((current) => ({
                  ...current,
                  accountId: value,
                  username: account ? account.username : current.username,
                }));
              },
              options: [{ value: '', label: '—' }].concat(((selectedHost && selectedHost.accounts) || []).map((account) => ({
                value: account.id,
                label: account.username + ' (' + account.id + ')',
              }))),
            }),
            h(Select, {
              label: t('protocol'), value: draft.protocol || 'ssh', onChange: field('protocol'),
              options: ['ssh', 'rdp', 'web', 'k8s-api', 'docker', 'custom'].map((value) => ({ value, label: value.toUpperCase() })),
            }),
            h(Field, { label: t('source'), value: draft.sourceIp || '', onChange: field('sourceIp'), placeholder: '10.0.8.21' }),
            h(Select, {
              label: t('loginResult'), value: draft.result || 'success', onChange: field('result'),
              options: [{ value: 'success', label: t('success') }, { value: 'failure', label: t('failure') }],
            }),
            h(Field, { label: t('note'), value: draft.note || '', onChange: field('note'), placeholder: t('optional') })),
          h('div', { className: 'dem-form-foot' },
            h(Button, { onClick: () => setEditing(null) }, t('cancel')),
            h(Button, { onClick: submitLogin, variant: 'primary', disabled: saving }, t('save')))));

      const loginsView = h('div', { className: 'dem-detail-main' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h3', { className: 'dem-section-title' }, t('loginRecords') + ' · ' + logins.length),
            h('p', { className: 'dem-hint' }, t('time') + ' · ' + t('result') + ' · ' + t('source'))),
          h(Button, { onClick: openLogin, variant: 'primary', disabled: editing === 'login' }, t('addLogin'))),
        editing === 'login' ? loginForm : null,
        h('div', { className: 'dem-card' },
          logins.length
            ? h('div', { className: 'dem-table-wrap' },
              h('table', { className: 'dem-table' },
                h('thead', null, h('tr', null,
                  h('th', null, t('time')),
                  h('th', null, t('result')),
                  h('th', null, t('username')),
                  h('th', null, t('host')),
                  h('th', null, t('source')),
                  h('th', null, t('protocol')),
                  h('th', null, t('note')))),
                h('tbody', null, logins.map((login) =>
                  h('tr', { key: login.id },
                    h('td', { className: 'mono' }, formatTime(login.at)),
                    h('td', null, h('span', { className: 'dem-status ' + (login.result === 'failure' ? 'inactive' : 'active') },
                      login.result === 'failure' ? t('failure') : t('success'))),
                    h('td', null, login.username),
                    h('td', null, login.hostRef ? ((hostById.get(login.hostRef) || {}).name || login.hostRef) : '—'),
                    h('td', { className: 'mono' }, login.sourceIp || '—'),
                    h('td', { className: 'mono' }, (login.protocol || 'ssh').toUpperCase()),
                    h('td', null, login.note || '—'))))))
            : h('div', { className: 'dem-empty' },
              h('strong', null, t('noLoginRecords')),
              h('span', null, t('noLoginRecordsHint')))));

      const clusterForm = (existingCluster) => h('div', { className: 'dem-inline-form' },
        h('div', { className: 'dem-form-grid dem-form-grid-3' },
          h(Field, {
            label: t('clusterId'),
            value: draft.id || '',
            onChange: field('id'),
            placeholder: 'k8s-01',
            disabled: Boolean(existingCluster),
          }),
          h(Field, { label: t('clusterName'), value: draft.name || '', onChange: field('name'), placeholder: 'k8s-prod' }),
          h(Select, {
            label: t('clusterKind'),
            value: draft.kind || 'kubernetes',
            onChange: field('kind'),
            options: ['kubernetes', 'docker'].map((value) => ({ value, label: value.toUpperCase() })),
          }),
          draft.kind === 'docker' ? null : h(Select, {
            label: t('clusterTopology'),
            value: draft.topology || '',
            onChange: field('topology'),
            options: [{ value: '', label: '—' }].concat(CLUSTER_TOPOLOGIES.map((value) => ({ value, label: topologyLabel(value) }))),
          }),
          h(Field, { label: t('clusterApiEndpoint'), value: draft.apiEndpoint || '', onChange: field('apiEndpoint'), placeholder: 'https://10.0.1.20:6443' }),
          h(Field, { label: t('clusterNamespaces'), value: draft.namespaces || '', onChange: field('namespaces'), placeholder: 'dv-sop, business' }),
          h(Field, { label: t('credentialRef'), value: draft.credentialRef || '', onChange: field('credentialRef'), placeholder: 'cred-k8s-prod' })),
        h(TextArea, { label: t('note'), value: draft.note || '', onChange: field('note'), rows: 2, wide: true }),
        formError ? h('div', { className: 'dem-form-error' }, formError.message || String(formError)) : null,
        h('div', { className: 'dem-form-foot' },
          h(Button, { onClick: () => { setEditing(null); setFormError(null); } }, t('cancel')),
          h(Button, { onClick: () => submitCluster(existingCluster), variant: 'primary', disabled: saving }, t('save'))));

      const editingCluster = editing && editing.startsWith('cluster-edit:')
        ? clusters.find((cluster) => cluster.id === editing.slice('cluster-edit:'.length))
        : null;
      const clusterRows = clusters.map((cluster) => {
        const nodeCount = hosts.filter((host) => host.clusterRef === cluster.id).length;
        return h('tr', { key: cluster.id },
          h('td', { className: 'mono' }, cluster.id),
          h('td', null, cluster.name),
          h('td', null, String(cluster.kind || '').toUpperCase()),
          h('td', null, cluster.kind === 'kubernetes' ? (cluster.topology ? topologyLabel(cluster.topology) : '—') : '—'),
          h('td', { className: 'mono' }, cluster.apiEndpoint || '—'),
          h('td', null, (cluster.namespaces || []).join(', ') || '—'),
          h('td', null, String(nodeCount)),
          h('td', { className: 'mono' }, cluster.credentialRef || '—'),
          h('td', null, h(Button, { onClick: () => openCluster(cluster) }, t('editCluster'))));
      });
      const clusterTable = h('div', { className: 'dem-card' },
        h('div', { className: 'dem-table-wrap' },
          h('table', { className: 'dem-table' },
            h('thead', null, h('tr', null,
              h('th', null, 'ID'),
              h('th', null, t('clusterName')),
              h('th', null, t('clusterKind')),
              h('th', null, t('clusterTopology')),
              h('th', null, t('clusterApiEndpoint')),
              h('th', null, t('clusterNamespaces')),
              h('th', null, t('clusterNodeCount')),
              h('th', null, t('credentialRef')),
              h('th', null, ''))),
            h('tbody', null, clusterRows))));
      const clustersView = h('div', { className: 'dem-detail-main' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h3', { className: 'dem-section-title' }, t('clusters') + ' · ' + clusters.length),
            h('p', { className: 'dem-hint' }, t('clustersHint'))),
          h(Button, { onClick: () => openCluster(), variant: 'primary', disabled: editing === 'cluster' }, t('addCluster'))),
        editing === 'cluster' || editingCluster ? clusterForm(editingCluster) : null,
        clusters.length
          ? clusterTable
          : h('div', { className: 'dem-card' },
            h('div', { className: 'dem-empty' },
              h('strong', null, t('noClusters')),
              h('span', null, t('noClustersHint')),
              h(Button, { onClick: () => openCluster(), variant: 'primary' }, t('addCluster')))));

      const endpointsView = endpoints.length
        ? h('div', { className: 'dem-card' },
          h('div', { className: 'dem-section-head' },
            h('h3', { className: 'dem-section-title' }, t('endpoints')),
            h('span', { className: 'dem-pill' }, String(endpoints.length))),
          h('div', { className: 'dem-table-wrap' },
            h('table', { className: 'dem-table' },
              h('thead', null, h('tr', null,
                h('th', null, 'ID'),
                h('th', null, t('kind')),
                h('th', null, t('target')),
                h('th', null, t('protocol')),
                h('th', null, t('port')),
                h('th', null, t('credentialRef')),
                h('th', null, t('note')))),
              h('tbody', null, endpoints.map((endpoint) =>
                h('tr', { key: endpoint.id },
                  h('td', { className: 'mono' }, endpoint.id),
                  h('td', null, (endpoint.kind || '').toUpperCase()),
                  h('td', null, endpointTarget(endpoint)),
                  h('td', { className: 'mono' }, endpoint.url || '—'),
                  h('td', null, endpoint.port ? String(endpoint.port) : '—'),
                  h('td', { className: 'mono' }, endpoint.credentialRef || '—'),
                  h('td', null, endpoint.note || '—')))))))
        : h('div', { className: 'dem-card' },
          h('div', { className: 'dem-empty' },
            h('strong', null, t('noEndpoints')),
            h('span', null, t('noEndpointsHint'))));

      const yamlView = h('div', { className: 'dem-card dem-editor' },
        h('div', { className: 'dem-editor-head' },
          h('div', null,
            h('div', { className: 'dem-editor-title' }, t('rawYaml')),
            h('div', { className: 'dem-editor-sub' }, 'environment / ' + record.id)),
          h('div', { className: 'dem-actions' },
            h(Button, { onClick: props.onSave, variant: 'primary' }, t('save')),
            h(Button, { onClick: props.onRemove, variant: 'danger' }, t('remove')))),
        h('textarea', {
          className: 'dem-textarea',
          'aria-label': t('rawYaml'),
          value: props.yaml,
          onChange: (event) => props.onYamlChange(event.target.value),
          spellCheck: false,
        }));

      const tabs = [
        ['overview', t('environmentOverview')],
        ['hosts', t('allNodes')],
        ...roleCatalog.map((role) => ['role:' + role.id, roleName(role.id)]),
        ['logins', t('loginRecords')],
        ['clusters', t('clusters')],
        ['endpoints', t('endpoints')],
        ['yaml', t('rawYaml')],
      ];
      const activeTab = tabs.some(([value]) => value === tab) ? tab : 'overview';
      const body = activeTab === 'overview' ? overview
        : activeTab === 'hosts' ? nodesView(null)
          : activeTab.startsWith('role:') ? nodesView(activeTab.slice('role:'.length))
            : activeTab === 'logins' ? loginsView
              : activeTab === 'clusters' ? clustersView
                : activeTab === 'endpoints' ? endpointsView
                  : yamlView;

      return h('div', { className: 'dem-detail' },
        h('div', { className: 'dem-detail-top' },
          h('button', { type: 'button', className: 'dem-back', onClick: props.onBack }, '← ' + t('backToRecords'))),
        h('div', { className: 'dem-detail-head' },
          h('div', { className: 'dem-detail-identity' },
            h('span', { className: 'dem-detail-mark' }, h(EnvManagerIcon, { size: 22 })),
            h('div', null,
              h('h2', { className: 'dem-detail-title' }, record.name || record.id),
              h('div', { className: 'dem-detail-sub' },
                h('span', { className: 'dem-detail-id' }, record.id),
                h('span', { className: 'dem-pill' }, categoryLabel(record.category)),
                h('span', { className: 'dem-status ' + (hosts.some((host) => host.isActive === true) ? 'active' : '') },
                  hosts.length + ' ' + t('hostCount').toLowerCase() + ' · ' + clusters.length + ' ' + t('clusterCount').toLowerCase() + ' · ' + accounts.length + ' ' + t('accountCount').toLowerCase())))),
          h('div', { className: 'dem-actions' },
            h(Button, { onClick: () => setTab('yaml'), variant: 'primary' }, t('editYaml')),
            h(Button, { onClick: props.onRemove, variant: 'danger' }, t('remove')))),
        h('div', { className: 'dem-detail-tabs', role: 'tablist' }, tabs.map(([value, label]) =>
          h('button', {
            key: value,
            type: 'button',
            className: 'dem-detail-tab',
            role: 'tab',
            'aria-selected': activeTab === value ? 'true' : 'false',
            onClick: () => setTab(value),
          }, label))),
        body);
    }

    function EnvironmentWizard(props) {
      const [form, setForm] = useState({
        name: '',
        id: '',
        category: 'test',
        description: '',
      });
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState(null);
      const field = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
      const roleLabel = (id) => ROLE_KEYS[id] ? t(ROLE_KEYS[id]) : ((DEFAULT_ROLES.find((role) => role.id === id) || {}).name || id);
      const envId = stableSlug(String(form.id || '').trim() || form.name, 'env');

      const submit = async () => {
        const name = String(form.name || '').trim();
        if (!name) {
          setError({ message: t('fillEnvironmentShell') });
          return;
        }
        if ((props.existingIds || []).includes(envId)) {
          setError({ message: t('envIdExists') });
          return;
        }
        setSaving(true);
        setError(null);
        try {
          await props.onCreate({
            id: envId,
            schemaVersion: 1,
            name,
            aliases: [],
            category: form.category || 'test',
            description: String(form.description || '').trim() || undefined,
            roles: DEFAULT_ROLES.map((role) => ({ ...role })),
            hosts: [],
            clusters: [],
            endpoints: [],
            loginRecords: [],
          });
        } catch (next) {
          setError(next);
          setSaving(false);
        }
      };

      return h('div', { className: 'dem-card dem-wizard' },
        h('div', { className: 'dem-section-head' },
          h('div', null,
            h('h3', { className: 'dem-section-title' }, t('newEnvironment')),
            h('p', { className: 'dem-hint' }, t('newEnvironmentHint')))),
        h('div', { className: 'dem-inline-form' },
          h('div', { className: 'dem-form-grid dem-form-grid-3' },
            h(Field, { label: t('name'), value: form.name, onChange: field('name'), placeholder: 'oracle-prod', required: true }),
            h(Field, { label: t('environmentIdOptional'), value: form.id, onChange: field('id'), placeholder: t('optional') }),
            h(Select, {
              label: t('category'), value: form.category, onChange: field('category'),
              options: ['dev', 'test', 'staging', 'production', 'custom'].map((value) => ({ value, label: categoryLabel(value) })),
            }),
            h(TextArea, { label: t('description'), value: form.description, onChange: field('description'), rows: 2, wide: true })),
          h('div', { className: 'dem-field' },
            h('span', { className: 'dem-label' }, t('defaultRoles')),
            h('div', { className: 'dem-chips' }, DEFAULT_ROLES.map((role) =>
              h('span', { key: role.id, className: 'dem-chip' }, roleLabel(role.id))))),
          h('p', { className: 'dem-hint' }, t('defaultRolesHint')),
          h(ErrorBox, { error }),
          h('div', { className: 'dem-form-foot' },
            h(Button, { onClick: props.onCancel, disabled: saving }, t('cancel')),
            h(Button, { onClick: submit, variant: 'primary', disabled: saving }, t('createEnvironment')))));
    }

    function Records(props) {
      const environmentMode = props.kind === 'environment';
      const [recordKind, setRecordKind] = useState('service');
      const kind = environmentMode ? 'environment' : recordKind;
      const [items, setItems] = useState([]);
      const [selected, setSelected] = useState(null);
      const [record, setRecord] = useState(null);
      const [yaml, setYaml] = useState('');
      const [creating, setCreating] = useState(false);
      const [error, setError] = useState(null);
      const [message, setMessage] = useState(null);

      const load = useCallback(async (nextKind) => {
        try {
          setError(null);
          const data = await call('list', { kind: nextKind });
          setItems(data.items || []);
        } catch (next) {
          setError(next);
        }
      }, []);

      useEffect(() => {
        load(kind);
        setSelected(null);
        setRecord(null);
        setYaml('');
        setCreating(false);
        setMessage(null);
      }, [kind, load]);

      useEffect(() => {
        if (!environmentMode || !props.createRequest) return;
        setSelected(null);
        setRecord(null);
        setYaml('');
        setError(null);
        setMessage(null);
        setCreating(true);
        if (props.onCreateConsumed) props.onCreateConsumed();
      }, [environmentMode, props.createRequest, props.onCreateConsumed]);

      const open = async (id) => {
        try {
          setError(null);
          setMessage(null);
          const data = await call('get', { kind, id });
          setSelected(id);
          setRecord(data.record || null);
          setYaml(data.yaml);
        } catch (next) {
          setError(next);
        }
      };

      const startNew = () => {
        setCreating(false);
        setSelected(null);
        setRecord(null);
        setYaml(TEMPLATES[kind] || '');
        setMessage(null);
      };

      const startWizard = () => {
        setSelected(null);
        setRecord(null);
        setYaml('');
        setError(null);
        setMessage(null);
        setCreating(true);
      };

      const saveCredential = async (ref, value) => {
        await call('credential', { ref, value });
      };
      const saveCredentialUnset = async (ref) => {
        await call('credentialUnset', { ref });
      };

      const createEnvironment = async (nextRecord) => {
        let result;
        try {
          setError(null);
          result = await call('save', { kind: 'environment', record: nextRecord });
        } catch (next) {
          setError(next);
          throw next;
        }
        setMessage(t('environmentCreated') + ': ' + result.id);
        setCreating(false);
        await load('environment');
        setSelected(result.id);
        try {
          const fresh = await call('get', { kind: 'environment', id: result.id });
          setRecord(fresh.record || null);
          setYaml(fresh.yaml);
        } catch (next) {
          setError(next);
        }
      };

      const closeDetail = () => {
        setSelected(null);
        setRecord(null);
        setYaml('');
        setMessage(null);
      };

      const save = async () => {
        try {
          setError(null);
          const result = await call('save', { kind, yaml });
          setMessage(t('saved') + ': ' + result.id);
          setSelected(result.id);
          if (kind === 'environment') {
            const fresh = await call('get', { kind, id: result.id });
            setRecord(fresh.record || null);
            setYaml(fresh.yaml);
          }
          await load(kind);
        } catch (next) {
          setError(next);
        }
      };

      const saveRecord = async (nextRecord) => {
        try {
          setError(null);
          const result = await call('save', { kind: 'environment', record: nextRecord });
          setMessage(t('saved') + ': ' + result.id);
          setSelected(result.id);
          const fresh = await call('get', { kind: 'environment', id: result.id });
          setRecord(fresh.record || null);
          setYaml(fresh.yaml);
          await load('environment');
        } catch (next) {
          setError(next);
          throw next;
        }
      };

      const remove = async () => {
        if (!selected) return;
        if (!window.confirm(t('confirmDelete'))) return;
        try {
          setError(null);
          await call('remove', { kind, id: selected });
          setMessage(t('deleted') + ': ' + selected);
          setSelected(null);
          setRecord(null);
          setYaml('');
          await load(kind);
        } catch (next) {
          setError(next);
        }
      };

      return h('div', { className: 'dem-view' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h2', { className: 'dem-section-title' }, t(environmentMode ? 'environments' : 'records')),
            h('p', { className: 'dem-hint' }, t(environmentMode ? 'environmentsHint' : 'recordsHint'))),
          h('div', { className: 'dem-actions' },
            environmentMode ? null : h(Button, { onClick: startNew }, t('newRecord')),
            h(Button, { onClick: () => load(kind) }, t('refresh')))),
        environmentMode ? null : h('div', { className: 'dem-subtabs', role: 'group' }, RECORD_KINDS.map((item) =>
          h('button', {
            key: item,
            type: 'button',
            className: 'dem-subtab',
            'aria-pressed': kind === item ? 'true' : 'false',
            onClick: () => setRecordKind(item),
          }, t(KIND_LABEL[item])))),
        error ? h(ErrorBox, { error }) : null,
        h(Toast, { message }),
        kind === 'environment' && selected && record
          ? h(EnvironmentDetail, {
            record,
            yaml,
            onBack: closeDetail,
            onYamlChange: setYaml,
            onSave: save,
            onSaveRecord: saveRecord,
            onRemove: remove,
            onCredential: saveCredential,
            onCredentialUnset: saveCredentialUnset,
            onMessage: setMessage,
          })
          : kind === 'environment' && creating
            ? h(EnvironmentWizard, {
              existingIds: items.map((item) => item.id),
              onCreate: createEnvironment,
              onCancel: () => setCreating(false),
            })
            : h('div', { className: 'dem-record-layout' },
            h('div', { className: 'dem-card dem-list-card' },
              h('div', { className: 'dem-list-head' },
                h('span', { className: 'dem-list-title' }, t(KIND_LABEL[kind])),
                h('span', null, String(items.length))),
              items.length === 0
                ? h('div', { className: 'dem-empty' },
                  h('strong', null, t(environmentMode ? 'emptyEnvironments' : 'emptyRecords')),
                  h('span', null, t(environmentMode ? 'emptyEnvironmentsHint' : 'emptyRecordsHint')))
                : items.map((item) =>
                  h('button', {
                    key: item.id,
                    type: 'button',
                    className: 'dem-list-item',
                    'data-active': selected === item.id ? 'true' : 'false',
                    onClick: () => open(item.id),
                    title: item.id,
                  },
                    h('span', { className: 'dem-item-name' }, item.name || item.id),
                    h('span', { className: 'dem-item-meta' }, item.id + (item.summary ? ' · ' + item.summary : ''))))),
            selected || yaml
              ? h('div', { className: 'dem-card dem-editor' },
                h('div', { className: 'dem-editor-head' },
                  h('div', null,
                    h('div', { className: 'dem-editor-title' }, selected || t('newRecord')),
                    selected ? h('div', { className: 'dem-editor-sub' }, kind + ' / ' + selected) : null),
                  h('div', { className: 'dem-actions' },
                    h(Button, { onClick: save, variant: 'primary' }, t('save')),
                    selected ? h(Button, { onClick: remove, variant: 'danger' }, t('remove')) : null)),
                h('textarea', {
                  className: 'dem-textarea',
                  'aria-label': t('yaml'),
                  value: yaml,
                  onChange: (event) => setYaml(event.target.value),
                  spellCheck: false,
                }))
              : h('div', { className: 'dem-card dem-empty-editor' },
                h('div', { className: 'dem-empty' },
                  h('strong', null, t('selectRecord')),
                  h('span', null, t(environmentMode ? 'selectEnvironmentHint' : 'selectRecordHint')),
                  h(Button, { onClick: environmentMode ? startWizard : startNew, variant: 'primary' },
                    environmentMode ? t('newEnvironment') : t('newRecord'))))));
    }

    function ContextView() {
      const [environmentId, setEnvironmentId] = useState('');
      const [serviceId, setServiceId] = useState('');
      const [deploymentId, setDeploymentId] = useState('');
      const [result, setResult] = useState(null);
      const [error, setError] = useState(null);
      const run = async () => {
        try {
          setError(null);
          setResult(await call('resolve', { environmentId, serviceId, deploymentId: deploymentId || undefined }));
        } catch (next) {
          setError(next);
        }
      };
      return h('div', { className: 'dem-view' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h2', { className: 'dem-section-title' }, t('context')),
            h('p', { className: 'dem-hint' }, t('contextHint')))),
        error ? h(ErrorBox, { error }) : null,
        h('div', { className: 'dem-card' },
          h('div', { className: 'dem-form-grid' },
            h(Field, { label: t('environmentIdOptional'), value: environmentId, onChange: setEnvironmentId, placeholder: 'test-a' }),
            h(Field, { label: t('serviceId'), value: serviceId, onChange: setServiceId, placeholder: 'aicoservice' }),
            h(Field, { label: t('deploymentId'), value: deploymentId, onChange: setDeploymentId, placeholder: 'deploy-001' })),
          h('div', { className: 'dem-form-actions' },
            h(Button, { onClick: run, variant: 'primary' }, t('resolve')))),
        result
          ? h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' }, h('h3', { className: 'dem-section-title' }, t('result'))),
            h('pre', { className: 'dem-result' }, JSON.stringify(result.context || result, null, 2)))
          : h('div', { className: 'dem-card' }, h('div', { className: 'dem-empty' }, h('span', null, t('emptyResult')))));
    }

    function OperationsView() {
      const [operation, setOperation] = useState('redeploy');
      const [environmentId, setEnvironmentId] = useState('');
      const [serviceId, setServiceId] = useState('');
      const [deploymentId, setDeploymentId] = useState('');
      const [result, setResult] = useState(null);
      const [error, setError] = useState(null);
      const run = async () => {
        try {
          setError(null);
          setResult(await call('route', { operation, environmentId, serviceId, deploymentId: deploymentId || undefined }));
        } catch (next) {
          setError(next);
        }
      };
      return h('div', { className: 'dem-view' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h2', { className: 'dem-section-title' }, t('operations')),
            h('p', { className: 'dem-hint' }, t('operationsHint')))),
        error ? h(ErrorBox, { error }) : null,
        h('div', { className: 'dem-card' },
          h('div', { className: 'dem-form-grid' },
            h(Field, { label: t('operation'), value: operation, onChange: setOperation, placeholder: 'redeploy' }),
            h(Field, { label: t('environmentId'), value: environmentId, onChange: setEnvironmentId, placeholder: 'test-a' }),
            h(Field, { label: t('serviceId'), value: serviceId, onChange: setServiceId, placeholder: 'aicoservice' }),
            h(Field, { label: t('deploymentId'), value: deploymentId, onChange: setDeploymentId, placeholder: 'deploy-001' })),
          h('div', { className: 'dem-form-actions' },
            h(Button, { onClick: run, variant: 'primary' }, t('route')))),
        result
          ? h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' }, h('h3', { className: 'dem-section-title' }, t('result'))),
            h('pre', { className: 'dem-result' }, JSON.stringify(result, null, 2)))
          : h('div', { className: 'dem-card' }, h('div', { className: 'dem-empty' }, h('span', null, t('emptyRoute')))));
    }

    function EnvManagerIcon(props) {
      const size =
        typeof props?.size === 'number' && Number.isFinite(props.size) && props.size > 0
          ? props.size
          : 20;
      return h('svg', {
        viewBox: '0 0 20 20',
        width: size,
        height: size,
        fill: 'none',
        'aria-hidden': true,
        style: {
          display: 'block',
          opacity: props?.active === false ? 0.72 : 1,
          color: 'currentColor',
        },
      }, [
        h('rect', {
          key: 'top',
          x: 2.6,
          y: 3.2,
          width: 14.8,
          height: 5.4,
          rx: 1.6,
          stroke: 'currentColor',
          strokeWidth: 1.3,
        }),
        h('rect', {
          key: 'bottom',
          x: 2.6,
          y: 11.4,
          width: 14.8,
          height: 5.4,
          rx: 1.6,
          stroke: 'currentColor',
          strokeWidth: 1.3,
        }),
        h('circle', { key: 'top-dot', cx: 5.7, cy: 5.9, r: 0.9, fill: 'currentColor' }),
        h('circle', { key: 'bottom-dot', cx: 5.7, cy: 14.1, r: 0.9, fill: 'currentColor' }),
        h('path', {
          key: 'top-line',
          d: 'M8.6 5.9h5.8',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        }),
        h('path', {
          key: 'bottom-line',
          d: 'M8.6 14.1h5.8',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        }),
      ]);
    }

    function Panel() {
      const [tab, setTab] = useState('environments');
      const [createRequest, setCreateRequest] = useState(0);
      const tabs = useMemo(() => [
        ['environments', t('environments')],
        ['overview', t('overview')],
        ['records', t('records')],
        ['context', t('context')],
        ['operations', t('operations')],
      ], []);
      const requestCreate = () => {
        setTab('environments');
        setCreateRequest((value) => value + 1);
      };
      return h('div', { className: 'dem-root' },
        h('div', { className: 'dem-shell' },
          h('header', { className: 'dem-header' },
            h('div', { className: 'dem-heading' },
              h('div', { className: 'dem-mark' }, h(EnvManagerIcon, { size: 22, active: true })),
              h('div', { className: 'dem-heading-copy' },
                h('h1', { className: 'dem-title' }, t('title')),
                h('p', { className: 'dem-sub' }, t('subtitle')))),
            h('div', { className: 'dem-header-actions' },
              h(Button, { onClick: requestCreate, variant: 'primary' }, t('newEnvironment')))),
          h('div', { className: 'dem-tabs', role: 'tablist' }, tabs.map(([key, label]) =>
            h('button', {
              key,
              type: 'button',
              role: 'tab',
              className: 'dem-tab',
              'aria-selected': tab === key ? 'true' : 'false',
              onClick: () => setTab(key),
            }, label))),
          tab === 'overview' ? h(Overview, { onCreateEnvironment: requestCreate }) : null,
          tab === 'environments' ? h(Records, {
            kind: 'environment',
            createRequest,
            onCreateConsumed: () => setCreateRequest(0),
          }) : null,
          tab === 'records' ? h(Records) : null,
          tab === 'context' ? h(ContextView) : null,
          tab === 'operations' ? h(OperationsView) : null));
    }

    return {
      name: 'dsh-env-manager-plugin',
      inject: ['slots', 'locale'],
      apply(ctx) {
        ensureStyles();
        try {
          if (ctx.locale && ctx.locale.register) ctx.locale.register('envManager', MESSAGES);
        } catch (error) {
          // Locale registration is best-effort; the panel has its own fallback.
        }
        ctx.slots.inject('sidebar.panellist', () => {
          try {
            return ctx.slots.register({
              name: 'sidebar.panellist',
              id: 'dsh-env-manager',
              order: 40,
              label: () => {
                let active = lang;
                try {
                  const id = String(ctx.locale?.getLocale?.().active || '');
                  if (id) active = id.toLowerCase().startsWith('zh') ? 'zh' : 'en';
                } catch (error) {
                  // Keep the browser-derived fallback.
                }
                return MESSAGES[active].title;
              },
            }, EnvManagerIcon);
          } catch (error) {
            console.warn('[dsh-env-manager] sidebar entry unavailable:', error);
            return () => undefined;
          }
        });
        ctx.slots.inject('main', () => {
          try {
            return ctx.slots.register({
              name: 'main',
              key: 'dsh-env-manager',
              inject: () => ({}),
            }, Panel);
          } catch (error) {
            console.warn('[dsh-env-manager] main panel unavailable:', error);
            return () => undefined;
          }
        });
      },
    };
  },
});
