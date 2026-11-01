window.__ModuleLoader__.load({
  id: 'dsh-env-manager',
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
        contextHint: 'Resolve layered variables and inspect their provenance.',
        operationsHint: 'Resolve the Skill bound to an operation and context.',
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
        hostsAndLogins: 'Hosts & logins',
        loginRecords: 'Login records',
        endpoints: 'Endpoints',
        rawYaml: 'YAML',
        editYaml: 'Edit YAML',
        environmentOverview: 'Environment overview',
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
        noHosts: 'No hosts registered',
        noHostsHint: 'Add hosts and login accounts in the YAML tab.',
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
        addHost: 'Add host',
        addAccount: 'Add account',
        addLogin: 'Add login record',
        cancel: 'Cancel',
        hostId: 'Host id',
        hostname: 'Hostname',
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
        newEnvironmentHint: 'Register the environment, its SSH host and first login account in one step.',
        environmentIdOptional: 'Environment id (optional)',
        password: 'Password',
        passwordStoredHint: 'The password is stored in the DSH credential service. YAML keeps only the credential reference.',
        createEnvironment: 'Create environment',
        credentialRefAuto: 'Credential ref (auto)',
        fillEnvironmentFields: 'Fill in name, IP, port, username and password.',
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
        contextHint: '解析分层变量，并查看每个值的来源。',
        operationsHint: '解析操作在指定上下文下绑定的 Skill。',
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
        hostsAndLogins: '主机与登录',
        loginRecords: '登录记录',
        endpoints: '访问端点',
        rawYaml: 'YAML',
        editYaml: '编辑 YAML',
        environmentOverview: '环境概览',
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
        noHosts: '未登记主机',
        noHostsHint: '在 YAML 页补充 hosts 和登录账号。',
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
        addHost: '添加主机',
        addAccount: '添加账号',
        addLogin: '登记登录',
        cancel: '取消',
        hostId: '主机 ID',
        hostname: '主机名',
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
        newEnvironmentHint: '一次填写环境、SSH 主机和首个登录账号，创建后直接进入详情。',
        environmentIdOptional: '环境 ID（可选）',
        password: '密码',
        passwordStoredHint: '密码写入 DSH 凭据库，YAML 只保存凭据引用，不保存明文。',
        createEnvironment: '创建环境',
        credentialRefAuto: '凭据引用（自动）',
        fillEnvironmentFields: '请填写环境名称、IP、端口、登录用户名和密码。',
        envIdExists: '该环境 ID 已存在。',
        environmentCreated: '环境已创建',
      },
    };
    const lang = String(navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const t = (key) => MESSAGES[lang][key] || MESSAGES.en[key] || key;

    const KINDS = ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding'];
    const RECORD_KINDS = KINDS.filter((kind) => kind !== 'environment');
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
.dem-detail-tab{border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);padding:8px 10px;font:inherit;font-size:12px;cursor:pointer;margin-bottom:-1px}
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
      environment: 'id: new-env\nschemaVersion: 1\nname: New Environment\naliases: []\ncategory: test\nroles: []\nhosts: []\nclusters: []\nendpoints: []\n',
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
      const hostById = new Map(hosts.map((host) => [host.id, host]));
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
      const slug = (value) => String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63) || 'item';
      const saveNext = async (next) => {
        setSaving(true);
        try {
          await props.onSaveRecord(next);
          setEditing(null);
        } catch (nextError) {
          // The parent surfaces the Host error above the detail view.
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

      const openHost = () => {
        setEditing('host');
        setDraft({ id: '', name: '', ip: '', sshPort: '22', platform: '', adminUser: '', credentialRef: '', roles: '' });
      };
      const submitHost = () => {
        const id = String(draft.id || '').trim();
        const name = String(draft.name || '').trim();
        if (!id || !name || hosts.some((host) => host.id === id)) return;
        saveNext({
          ...record,
          hosts: [...hosts, {
            id,
            name,
            ip: String(draft.ip || '').trim() || undefined,
            sshPort: draft.sshPort ? Number(draft.sshPort) : undefined,
            platform: String(draft.platform || '').trim() || undefined,
            adminUser: String(draft.adminUser || '').trim() || undefined,
            credentialRef: String(draft.credentialRef || '').trim() || undefined,
            roles: String(draft.roles || '').split(',').map((item) => item.trim()).filter(Boolean),
            isActive: true,
            accounts: [],
          }],
        });
      };

      const openAccount = (host) => {
        setEditing('account:' + host.id);
        setDraft({
          id: '',
          username: '',
          purpose: '',
          protocol: 'ssh',
          authType: 'private-key',
          credentialRef: '',
          lastLoginAt: '',
          lastLoginFrom: '',
        });
      };
      const submitAccount = (host) => {
        const username = String(draft.username || '').trim();
        if (!username) return;
        const id = String(draft.id || '').trim() || slug(username);
        if ((host.accounts || []).some((account) => account.id === id)) return;
        const account = {
          id,
          username,
          purpose: String(draft.purpose || '').trim() || undefined,
          protocol: draft.protocol || 'ssh',
          port: host.sshPort || 22,
          authType: draft.authType || 'other',
          credentialRef: String(draft.credentialRef || '').trim() || undefined,
          lastLoginAt: toIso(draft.lastLoginAt),
          lastLoginFrom: String(draft.lastLoginFrom || '').trim() || undefined,
        };
        saveNext({
          ...record,
          hosts: hosts.map((item) => item.id === host.id
            ? { ...item, accounts: [...(item.accounts || []), account] }
            : item),
        });
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

      const roles = h('div', { className: 'dem-chips' },
        (record.roles || []).length
          ? record.roles.map((role) => h('span', { key: role.id, className: 'dem-chip', title: role.id },
            role.name || role.id))
          : h('span', { className: 'dem-hint' }, '—'));

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
              h('h3', { className: 'dem-section-title' }, t('hostsAndLogins')),
              h('span', { className: 'dem-pill' }, String(hosts.length))),
            hosts.length
              ? h('div', { className: 'dem-chips' }, hosts.map((host) =>
                h('span', { key: host.id, className: 'dem-chip' }, host.name + ' · ' + (host.ip || host.id))))
              : h('div', { className: 'dem-empty' },
                h('strong', null, t('noHosts')),
                h('span', null, t('noHostsHint'))))),
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
                h('b', null, String(failed)), h('span', null, t('failedLogins')))),
            h('div', { className: 'dem-info-item', style: { marginTop: '12px' } },
              h('div', { className: 'dem-info-label' }, t('latestLogin')),
              h('div', { className: 'dem-info-value' },
                latest ? formatTime(latest.at) : (lastAccountLogin ? formatTime(lastAccountLogin) : t('never'))))),
          h('div', { className: 'dem-card' },
            h('div', { className: 'dem-section-head' },
              h('h3', { className: 'dem-section-title' }, t('roles'))),
            roles)));

      const hostForm = h('div', { className: 'dem-card' },
        h('div', { className: 'dem-inline-form' },
          h('div', { className: 'dem-form-grid' },
            h(Field, { label: t('hostId'), value: draft.id || '', onChange: field('id'), placeholder: 'host-001' }),
            h(Field, { label: t('hostname'), value: draft.name || '', onChange: field('name'), placeholder: 'node-01' }),
            h(Field, { label: t('ipAddress'), value: draft.ip || '', onChange: field('ip'), placeholder: '10.0.1.10' }),
            h(Field, { label: t('sshPort'), value: draft.sshPort || '', onChange: field('sshPort'), type: 'number' }),
            h(Field, { label: t('platform'), value: draft.platform || '', onChange: field('platform'), placeholder: 'Linux / x86_64' }),
            h(Field, { label: t('adminUser'), value: draft.adminUser || '', onChange: field('adminUser'), placeholder: 'root' }),
            h(Field, { label: t('credentialRef'), value: draft.credentialRef || '', onChange: field('credentialRef'), placeholder: 'cred-host-root' }),
            h(Field, { label: t('roles'), value: draft.roles || '', onChange: field('roles'), placeholder: 'management, business' })),
          h('div', { className: 'dem-form-foot' },
            h(Button, { onClick: () => setEditing(null) }, t('cancel')),
            h(Button, { onClick: submitHost, variant: 'primary', disabled: saving }, t('save')))));

      const accountForm = (host) => h('div', { className: 'dem-inline-form' },
        h('div', { className: 'dem-form-grid' },
          h(Field, { label: t('accountId'), value: draft.id || '', onChange: field('id'), placeholder: 'root' }),
          h(Field, { label: t('username'), value: draft.username || '', onChange: field('username'), placeholder: 'root' }),
          h(Field, { label: t('purpose'), value: draft.purpose || '', onChange: field('purpose'), placeholder: 'DBA / admin' }),
          h(Select, {
            label: t('protocol'), value: draft.protocol || 'ssh', onChange: field('protocol'),
            options: ['ssh', 'rdp', 'web', 'k8s-api', 'docker', 'custom'].map((value) => ({ value, label: value.toUpperCase() })),
          }),
          h(Select, {
            label: t('authType'), value: draft.authType || 'private-key', onChange: field('authType'),
            options: ['password', 'private-key', 'agent', 'token', 'other'].map((value) => ({ value, label: authLabel(value) })),
          }),
          h(Field, { label: t('credentialRef'), value: draft.credentialRef || '', onChange: field('credentialRef'), placeholder: 'cred-host-root' }),
          h(Field, { label: t('latestLogin'), value: draft.lastLoginAt || '', onChange: field('lastLoginAt'), type: 'datetime-local' }),
          h(Field, { label: t('source'), value: draft.lastLoginFrom || '', onChange: field('lastLoginFrom'), placeholder: '10.0.8.21' })),
        h('div', { className: 'dem-form-foot' },
          h(Button, { onClick: () => setEditing(null) }, t('cancel')),
          h(Button, { onClick: () => submitAccount(host), variant: 'primary', disabled: saving }, t('save'))));

      const hostsView = h('div', { className: 'dem-detail-main' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h3', { className: 'dem-section-title' }, t('hostsAndLogins')),
            h('p', { className: 'dem-hint' }, t('accounts') + ': ' + accounts.length)),
          h(Button, { onClick: openHost, variant: 'primary', disabled: editing === 'host' }, t('addHost'))),
        editing === 'host' ? hostForm : null,
        hosts.length
          ? hosts.map((host) =>
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
                    host.credentialRef ? h('span', { className: 'dem-code-inline' }, t('credentialRef') + ': ' + host.credentialRef) : null)),
                h('div', { className: 'dem-actions' },
                  h('div', { className: 'dem-chips' }, (host.roles || []).map((role) =>
                    h('span', { key: role, className: 'dem-chip' }, role))),
                  h(Button, { onClick: () => openAccount(host) }, t('addAccount')))),
              editing === 'account:' + host.id ? accountForm(host) : null,
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
                      h('th', null, t('source')))),
                    h('tbody', null, (host.accounts || []).map((account) =>
                      h('tr', { key: account.id },
                        h('td', null, h('strong', null, account.username || account.id)),
                        h('td', null, account.purpose || '—'),
                        h('td', { className: 'mono' }, (account.protocol || 'ssh').toUpperCase()),
                        h('td', null, authLabel(account.authType)),
                        h('td', { className: 'mono' }, account.credentialRef || '—'),
                        h('td', null, account.lastLoginAt ? formatTime(account.lastLoginAt) : t('never')),
                        h('td', { className: 'mono' }, account.lastLoginFrom || '—'))))))
                : h('div', { className: 'dem-table-empty' },
                  t('noAccounts') + ' ',
                  h(Button, { onClick: () => openAccount(host) }, t('addAccount')))))
          : h('div', { className: 'dem-card' },
            h('div', { className: 'dem-empty' },
              h('strong', null, t('noHosts')),
              h('span', null, t('noHostsHint')))));

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
        ['hosts', t('hostsAndLogins')],
        ['logins', t('loginRecords')],
        ['endpoints', t('endpoints')],
        ['yaml', t('rawYaml')],
      ];
      const body = tab === 'hosts' ? hostsView
        : tab === 'logins' ? loginsView
          : tab === 'endpoints' ? endpointsView
            : tab === 'yaml' ? yamlView
              : overview;

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
                  hosts.length + ' ' + t('hostCount').toLowerCase() + ' · ' + accounts.length + ' ' + t('accountCount').toLowerCase())))),
          h('div', { className: 'dem-actions' },
            h(Button, { onClick: () => setTab('yaml'), variant: 'primary' }, t('editYaml')),
            h(Button, { onClick: props.onRemove, variant: 'danger' }, t('remove')))),
        h('div', { className: 'dem-detail-tabs', role: 'tablist' }, tabs.map(([value, label]) =>
          h('button', {
            key: value,
            type: 'button',
            className: 'dem-detail-tab',
            role: 'tab',
            'aria-selected': tab === value ? 'true' : 'false',
            onClick: () => setTab(value),
          }, label))),
        body);
    }

    function EnvironmentWizard(props) {
      const [form, setForm] = useState({
        name: '',
        id: '',
        category: 'test',
        ip: '',
        sshPort: '22',
        username: '',
        password: '',
      });
      const [saving, setSaving] = useState(false);
      const [error, setError] = useState(null);
      const field = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
      const envId = stableSlug(String(form.id || '').trim() || form.name, 'env');
      const accountId = stableSlug(form.username, 'user');
      const credentialRef = 'env-manager/' + envId + '/' + accountId;
      const credentialPreview = String(form.name || form.id || '').trim() && String(form.username || '').trim()
        ? credentialRef
        : 'env-manager/<environment>/<account>';

      const submit = async () => {
        const name = String(form.name || '').trim();
        const ip = String(form.ip || '').trim();
        const port = Number(form.sshPort || 22);
        const username = String(form.username || '').trim();
        const password = String(form.password || '');
        if (!name || !ip || !username || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
          setError({ message: t('fillEnvironmentFields') });
          return;
        }
        if ((props.existingIds || []).includes(envId)) {
          setError({ message: t('envIdExists') });
          return;
        }
        setSaving(true);
        setError(null);
        try {
          await props.onCredential(credentialRef, password);
          await props.onCreate({
            id: envId,
            schemaVersion: 1,
            name,
            aliases: [],
            category: form.category || 'test',
            description: '',
            roles: [],
            hosts: [{
              id: 'host-01',
              name,
              ip,
              sshPort: port,
              adminUser: username,
              isActive: true,
              credentialRef,
              accounts: [{
                id: accountId,
                username,
                purpose: 'ssh login',
                protocol: 'ssh',
                port,
                authType: 'password',
                credentialRef,
              }],
            }],
            clusters: [],
            endpoints: [{
              id: 'ssh-host-01',
              kind: 'ssh',
              hostRef: 'host-01',
              port,
              credentialRef,
            }],
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
            h(Field, { label: t('ipAddress'), value: form.ip, onChange: field('ip'), placeholder: '10.20.30.41', required: true }),
            h(Field, { label: t('sshPort'), value: form.sshPort, onChange: field('sshPort'), type: 'number', inputMode: 'numeric', required: true }),
            h(Field, { label: t('loginUser'), value: form.username, onChange: field('username'), placeholder: 'root', required: true, autoComplete: 'username' }),
            h(Field, { label: t('password'), value: form.password, onChange: field('password'), type: 'password', required: true, autoComplete: 'new-password' }),
            h('div', { className: 'dem-field' },
              h('span', { className: 'dem-label' }, t('credentialRefAuto')),
              h('div', { className: 'dem-code-inline' }, credentialPreview))),
          h('p', { className: 'dem-hint' }, t('passwordStoredHint')),
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

      const createEnvironment = async (nextRecord) => {
        let result;
        try {
          setError(null);
          result = await call('save', { kind: 'environment', record: nextRecord });
        } catch (next) {
          const ref = nextRecord.hosts && nextRecord.hosts[0] && nextRecord.hosts[0].credentialRef;
          if (ref) await call('credentialUnset', { ref }).catch(() => {});
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
          })
          : kind === 'environment' && creating
            ? h(EnvironmentWizard, {
              existingIds: items.map((item) => item.id),
              onCredential: saveCredential,
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
            h(Field, { label: t('environmentId'), value: environmentId, onChange: setEnvironmentId, placeholder: 'test-a' }),
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
