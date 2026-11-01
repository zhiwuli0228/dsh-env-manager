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
        diagnostics: 'Diagnostics',
        refresh: 'Refresh',
        validate: 'Validate',
        save: 'Save',
        remove: 'Delete',
        newRecord: 'New',
        environments: 'Environments',
        services: 'Services',
        deployments: 'Deployments',
        ruleProfiles: 'Rule profiles',
        operationBindings: 'Operation bindings',
        dataDir: 'Data directory',
        warnings: 'Warnings',
        noWarnings: 'No warnings.',
        selectRecord: 'Select a record.',
        yaml: 'YAML',
        resolve: 'Resolve',
        route: 'Route',
        environmentId: 'Environment id',
        serviceId: 'Service id',
        deploymentId: 'Deployment id (optional)',
        operation: 'Operation',
        result: 'Result',
        saved: 'Saved',
        deleted: 'Deleted',
        confirmDelete: 'Delete this record? A backup is kept.',
        loading: 'Loading…',
        panelUnavailable: 'The panel API is unavailable.',
      },
      zh: {
        title: '环境管理器',
        subtitle: '环境、服务、部署与操作路由。',
        overview: '概览',
        records: '记录',
        context: '上下文',
        operations: '操作',
        diagnostics: '诊断',
        refresh: '刷新',
        validate: '校验',
        save: '保存',
        remove: '删除',
        newRecord: '新建',
        environments: '环境',
        services: '服务',
        deployments: '部署',
        ruleProfiles: '规则集',
        operationBindings: '操作绑定',
        dataDir: '数据目录',
        warnings: '警告',
        noWarnings: '无警告。',
        selectRecord: '请选择记录。',
        yaml: 'YAML',
        resolve: '解析',
        route: '路由',
        environmentId: '环境 ID',
        serviceId: '服务 ID',
        deploymentId: '部署 ID（可选）',
        operation: '操作',
        result: '结果',
        saved: '已保存',
        deleted: '已删除',
        confirmDelete: '删除该记录？会保留备份。',
        loading: '加载中…',
        panelUnavailable: '面板 API 不可用。',
      },
    };
    const lang = String(navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const t = (key) => MESSAGES[lang][key] || MESSAGES.en[key] || key;

    const KINDS = ['environment', 'service', 'deployment', 'ruleProfile', 'operationBinding'];
    const KIND_LABEL = {
      environment: 'environments',
      service: 'services',
      deployment: 'deployments',
      ruleProfile: 'ruleProfiles',
      operationBinding: 'operationBindings',
    };

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

    const styles = {
      page: { padding: 20, display: 'grid', gap: 16, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)', minHeight: '100%' },
      header: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
      h1: { margin: 0, fontSize: 20 },
      muted: { opacity: 0.7, fontSize: 13 },
      tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--dsw-alias-border-l1)', paddingBottom: 8 },
      tab: { border: '1px solid transparent', background: 'transparent', color: 'inherit', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
      tabActive: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)' },
      row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
      input: { background: 'var(--dsw-alias-bg-layer-1)', color: 'inherit', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: '6px 8px', minWidth: 180, font: 'inherit' },
      button: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-1)', color: 'inherit', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', font: 'inherit' },
      primary: { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' },
      danger: { borderColor: 'var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)' },
      grid: { display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 16, alignItems: 'start' },
      card: { border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-1)', borderRadius: 10, padding: 14 },
      list: { display: 'grid', gap: 4, maxHeight: 420, overflow: 'auto' },
      item: { textAlign: 'left', border: '1px solid transparent', background: 'transparent', color: 'inherit', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', font: 'inherit' },
      itemActive: { background: 'var(--dsw-alias-bg-layer-2)', borderColor: 'var(--dsw-alias-border-l2)' },
      textarea: { width: '100%', minHeight: 320, boxSizing: 'border-box', background: 'var(--dsw-alias-bg-layer-2)', color: 'inherit', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, padding: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5 },
      pre: { margin: 0, padding: 12, borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2)', overflow: 'auto', fontSize: 12, maxHeight: 460 },
      error: { border: '1px solid var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)', borderRadius: 8, padding: 10, fontSize: 13, whiteSpace: 'pre-wrap' },
      ok: { color: 'var(--dsw-alias-state-success-primary)' },
      warn: { color: 'var(--dsw-alias-state-warn-primary)' },
      count: { fontSize: 22, fontWeight: 600 },
    };

    function Button(props) {
      const style = Object.assign({}, styles.button, props.variant === 'primary' ? styles.primary : null, props.variant === 'danger' ? styles.danger : null, props.style || null);
      return h('button', { type: 'button', style, onClick: props.onClick, disabled: props.disabled }, props.children);
    }

    function Field(props) {
      return h('label', { style: { display: 'grid', gap: 4, fontSize: 12, flex: '1 1 180px' } },
        h('span', { style: styles.muted }, props.label),
        h('input', {
          style: styles.input,
          value: props.value,
          placeholder: props.placeholder || '',
          onChange: (event) => props.onChange(event.target.value),
        }));
    }

    function ErrorBox(props) {
      if (!props.error) return null;
      return h('div', { style: styles.error }, props.error.message || String(props.error));
    }

    function DiagnosticsList(props) {
      const items = props.items || [];
      if (!items.length) return h('p', { style: styles.muted }, t('noWarnings'));
      return h('div', { style: styles.list }, items.map((item, index) =>
        h('div', { key: index, style: { fontSize: 12, padding: '4px 0' } },
          h('span', { style: item.severity === 'error' ? styles.warn : styles.muted }, '[' + item.code + '] '),
          item.message)));
    }

    function Overview() {
      const [meta, setMeta] = useState(null);
      const [report, setReport] = useState(null);
      const [error, setError] = useState(null);
      const load = useCallback(async () => {
        try {
          setError(null);
          setMeta(await call('meta'));
        } catch (next) { setError(next); }
      }, []);
      useEffect(() => { load(); }, [load]);
      const validate = async () => {
        try { setError(null); setReport(await call('validate')); } catch (next) { setError(next); }
      };
      if (!meta) return h('div', null, error ? h(ErrorBox, { error }) : t('loading'));
      return h('div', { style: { display: 'grid', gap: 14 } },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 } },
          KINDS.map((kind) => h('div', { key: kind, style: styles.card },
            h('div', { style: styles.count }, String((meta.counts || {})[kind === 'ruleProfile' ? 'ruleProfiles' : kind === 'operationBinding' ? 'operationBindings' : kind + 's'] || 0)),
            h('div', { style: styles.muted }, t(KIND_LABEL[kind]))))),
        h('div', { style: styles.card },
          h('div', { style: styles.muted }, t('dataDir')),
          h('code', null, meta.dataDir),
          h('div', { style: { marginTop: 8 } }, h('span', { style: styles.muted }, 'v' + meta.version))),
        h('div', { style: styles.row },
          h(Button, { onClick: load }, t('refresh')),
          h(Button, { onClick: validate, variant: 'primary' }, t('validate'))),
        error ? h(ErrorBox, { error }) : null,
        report ? h('div', { style: styles.card },
          h('div', { style: report.ok ? styles.ok : styles.warn }, report.ok ? 'OK' : 'INVALID'),
          h('div', { style: { marginTop: 8 } }, h(DiagnosticsList, { items: report.diagnostics }))) : null,
        h('div', { style: styles.card },
          h('h3', { style: { margin: '0 0 8px', fontSize: 14 } }, t('warnings')),
          h(DiagnosticsList, { items: meta.warnings })));
    }

    const TEMPLATES = {
      environment: 'id: new-env\nschemaVersion: 1\nname: New Environment\naliases: []\ncategory: test\nroles: []\nhosts: []\nclusters: []\nendpoints: []\n',
      service: 'id: new-service\nschemaVersion: 1\nname: New Service\naliases: []\ncategory: backend\ngit:\n  url: https://example.invalid/repo.git\n  defaultBranch: main\ndeployModes: [kubernetes]\nruleProfileRefs: []\n',
      deployment: 'id: new-deployment\nschemaVersion: 1\nenvironmentId: new-env\nserviceId: new-service\nruntimeMode: kubernetes\nlocation:\n  kind: kubernetes\n  clusterRef: k8s-01\n  namespace: default\n  workload:\n    kind: Deployment\n    name: new-service\n',
      ruleProfile: 'id: new-rule\nschemaVersion: 1\ndescription: New rule profile\nvariables: {}\npaths: {}\n',
      operationBinding: 'id: new-binding\nschemaVersion: 1\noperation: redeploy\nmatch:\n  environmentId: new-env\n  serviceId: new-service\nskill:\n  name: example-skill\nparameters: {}\npolicy:\n  requiresApproval: true\n  allowProduction: false\nenabled: true\n',
    };

    function Records() {
      const [kind, setKind] = useState('environment');
      const [items, setItems] = useState([]);
      const [selected, setSelected] = useState(null);
      const [yaml, setYaml] = useState('');
      const [error, setError] = useState(null);
      const [message, setMessage] = useState(null);

      const load = useCallback(async (nextKind) => {
        try {
          setError(null);
          const data = await call('list', { kind: nextKind });
          setItems(data.items || []);
        } catch (next) { setError(next); }
      }, []);

      useEffect(() => { load(kind); setSelected(null); setYaml(''); }, [kind, load]);

      const open = async (id) => {
        try {
          setError(null);
          setMessage(null);
          const data = await call('get', { kind, id });
          setSelected(id);
          setYaml(data.yaml);
        } catch (next) { setError(next); }
      };

      const save = async () => {
        try {
          setError(null);
          const result = await call('save', { kind, yaml });
          setMessage(t('saved') + ': ' + result.id);
          await load(kind);
        } catch (next) { setError(next); }
      };

      const remove = async () => {
        if (!selected) return;
        if (!window.confirm(t('confirmDelete'))) return;
        try {
          setError(null);
          await call('remove', { kind, id: selected });
          setMessage(t('deleted') + ': ' + selected);
          setSelected(null);
          setYaml('');
          await load(kind);
        } catch (next) { setError(next); }
      };

      return h('div', { style: { display: 'grid', gap: 12 } },
        h('div', { style: styles.tabs }, KINDS.map((item) =>
          h('button', {
            key: item,
            type: 'button',
            style: Object.assign({}, styles.tab, kind === item ? styles.tabActive : null),
            onClick: () => setKind(item),
          }, t(KIND_LABEL[item])))),
        h('div', { style: styles.row },
          h(Button, { onClick: () => { setSelected(null); setYaml(TEMPLATES[kind] || ''); } }, t('newRecord')),
          h(Button, { onClick: () => load(kind) }, t('refresh'))),
        error ? h(ErrorBox, { error }) : null,
        message ? h('div', { style: styles.ok }, message) : null,
        h('div', { style: styles.grid },
          h('div', { style: Object.assign({}, styles.card, styles.list) },
            items.length === 0 ? h('span', { style: styles.muted }, '—') : items.map((item) =>
              h('button', {
                key: item.id,
                type: 'button',
                style: Object.assign({}, styles.item, selected === item.id ? styles.itemActive : null),
                onClick: () => open(item.id),
              },
                h('div', null, item.name || item.id),
                h('div', { style: styles.muted }, item.id + (item.summary ? ' · ' + item.summary : ''))))),
          h('div', { style: styles.card },
            selected || yaml ? h('div', { style: { display: 'grid', gap: 10 } },
              h('div', { style: styles.row },
                h('strong', null, selected || 'new'),
                h('span', { style: { flex: 1 } }),
                h(Button, { onClick: save, variant: 'primary' }, t('save')),
                selected ? h(Button, { onClick: remove, variant: 'danger' }, t('remove')) : null),
              h('textarea', { style: styles.textarea, value: yaml, onChange: (event) => setYaml(event.target.value), spellCheck: false }))
              : h('span', { style: styles.muted }, t('selectRecord')))));
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
        } catch (next) { setError(next); }
      };
      return h('div', { style: { display: 'grid', gap: 12 } },
        h('div', { style: styles.row },
          h(Field, { label: t('environmentId'), value: environmentId, onChange: setEnvironmentId }),
          h(Field, { label: t('serviceId'), value: serviceId, onChange: setServiceId }),
          h(Field, { label: t('deploymentId'), value: deploymentId, onChange: setDeploymentId })),
        h('div', { style: styles.row }, h(Button, { onClick: run, variant: 'primary' }, t('resolve'))),
        error ? h(ErrorBox, { error }) : null,
        result ? h('pre', { style: styles.pre }, JSON.stringify(result.context || result, null, 2)) : null);
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
        } catch (next) { setError(next); }
      };
      return h('div', { style: { display: 'grid', gap: 12 } },
        h('div', { style: styles.row },
          h(Field, { label: t('operation'), value: operation, onChange: setOperation }),
          h(Field, { label: t('environmentId'), value: environmentId, onChange: setEnvironmentId }),
          h(Field, { label: t('serviceId'), value: serviceId, onChange: setServiceId }),
          h(Field, { label: t('deploymentId'), value: deploymentId, onChange: setDeploymentId })),
        h('div', { style: styles.row }, h(Button, { onClick: run, variant: 'primary' }, t('route'))),
        error ? h(ErrorBox, { error }) : null,
        result ? h('pre', { style: styles.pre }, JSON.stringify(result, null, 2)) : null);
    }

    function EnvManagerIcon() {
      return h('svg', {
        viewBox: '0 0 64 64',
        width: 48,
        height: 48,
        'aria-hidden': true,
        style: { display: 'block', pointerEvents: 'none' },
      }, [
        h('rect', { key: 'bg', x: 2, y: 2, width: 60, height: 60, rx: 14, fill: '#0f766e' }),
        h('path', { key: 'stack', d: 'M18 20h28v8H18zm0 12h28v8H18z', fill: '#ffffff' }),
        h('circle', { key: 'dot', cx: 44, cy: 46, r: 6, fill: '#99f6e4' }),
      ]);
    }

    function Panel() {
      const [tab, setTab] = useState('overview');
      const tabs = useMemo(() => [
        ['overview', t('overview')],
        ['records', t('records')],
        ['context', t('context')],
        ['operations', t('operations')],
      ], []);
      return h('section', { style: styles.page },
        h('header', { style: styles.header },
          h('h1', { style: styles.h1 }, t('title')),
          h('span', { style: styles.muted }, t('subtitle'))),
        h('nav', { style: styles.tabs }, tabs.map(([key, label]) =>
          h('button', {
            key,
            type: 'button',
            style: Object.assign({}, styles.tab, tab === key ? styles.tabActive : null),
            onClick: () => setTab(key),
          }, label))),
        tab === 'overview' ? h(Overview) : null,
        tab === 'records' ? h(Records) : null,
        tab === 'context' ? h(ContextView) : null,
        tab === 'operations' ? h(OperationsView) : null);
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        try {
          if (ctx.locale && ctx.locale.register) ctx.locale.register('envManager', MESSAGES);
        } catch (error) {
          // Locale registration is best-effort; the panel has its own fallback.
        }
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
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
        }, EnvManagerIcon));
        ctx.slots.inject('main', () => ctx.slots.register({
          key: 'dsh-env-manager',
        }, Panel));
      },
    };
  },
});
