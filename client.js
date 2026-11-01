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
        recordsHint: 'Browse, create and edit YAML registry records.',
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
        emptyRecords: 'No records yet',
        emptyRecordsHint: 'Create one from a template, or refresh.',
        emptyRegistry: 'Empty registry',
        gettingStarted: 'Get started',
        gettingStartedHint: 'Register an environment first, then its services, deployments and operation bindings. Context resolution and routing become available as soon as records exist.',
        openRecords: 'Open records',
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
      },
      zh: {
        title: '环境管理器',
        subtitle: '环境、服务、部署与操作路由。',
        overview: '概览',
        records: '记录',
        context: '上下文',
        operations: '操作',
        overviewHint: '注册表健康状态与最近一次校验结果。',
        recordsHint: '浏览、新建和编辑 YAML 注册表记录。',
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
        emptyRecords: '暂无记录',
        emptyRecordsHint: '从模板新建一条，或刷新列表。',
        emptyRegistry: '注册表为空',
        gettingStarted: '开始使用',
        gettingStartedHint: '先注册环境，再补充服务、部署和操作绑定；有记录后即可解析上下文和路由操作。',
        openRecords: '打开记录',
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

    const STYLE_ID = 'dsh-env-manager-styles';

    const CSS = `
.dem-root{height:100%;min-height:100%;overflow:auto;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:28px 32px 48px;box-sizing:border-box;font:13px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.dem-root *{box-sizing:border-box}
.dem-shell{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
.dem-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
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
.dem-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
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
.dem-btn:focus-visible,.dem-tab:focus-visible,.dem-subtab:focus-visible,.dem-list-item:focus-visible,.dem-input:focus-visible,.dem-textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
@media (max-width:820px){.dem-root{padding:20px 16px 36px}.dem-two{grid-template-columns:1fr}.dem-record-layout{grid-template-columns:1fr}.dem-list-card{max-height:280px;min-height:0}}
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
          value: props.value,
          placeholder: props.placeholder || '',
          onChange: (event) => props.onChange(event.target.value),
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
            h(Button, { onClick: props.onOpenRecords, variant: 'primary' }, t('openRecords')))) : null,
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
        } catch (next) {
          setError(next);
        }
      }, []);

      useEffect(() => {
        load(kind);
        setSelected(null);
        setYaml('');
        setMessage(null);
      }, [kind, load]);

      const open = async (id) => {
        try {
          setError(null);
          setMessage(null);
          const data = await call('get', { kind, id });
          setSelected(id);
          setYaml(data.yaml);
        } catch (next) {
          setError(next);
        }
      };

      const startNew = () => {
        setSelected(null);
        setYaml(TEMPLATES[kind] || '');
        setMessage(null);
      };

      const save = async () => {
        try {
          setError(null);
          const result = await call('save', { kind, yaml });
          setMessage(t('saved') + ': ' + result.id);
          setSelected(result.id);
          await load(kind);
        } catch (next) {
          setError(next);
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
          setYaml('');
          await load(kind);
        } catch (next) {
          setError(next);
        }
      };

      return h('div', { className: 'dem-view' },
        h('div', { className: 'dem-toolbar' },
          h('div', { className: 'dem-toolbar-copy' },
            h('h2', { className: 'dem-section-title' }, t('records')),
            h('p', { className: 'dem-hint' }, t('recordsHint'))),
          h('div', { className: 'dem-actions' },
            h(Button, { onClick: startNew, variant: 'primary' }, t('newRecord')),
            h(Button, { onClick: () => load(kind) }, t('refresh')))),
        h('div', { className: 'dem-subtabs', role: 'group' }, KINDS.map((item) =>
          h('button', {
            key: item,
            type: 'button',
            className: 'dem-subtab',
            'aria-pressed': kind === item ? 'true' : 'false',
            onClick: () => setKind(item),
          }, t(KIND_LABEL[item])))),
        error ? h(ErrorBox, { error }) : null,
        h(Toast, { message }),
        h('div', { className: 'dem-record-layout' },
          h('div', { className: 'dem-card dem-list-card' },
            h('div', { className: 'dem-list-head' },
              h('span', { className: 'dem-list-title' }, t(KIND_LABEL[kind])),
              h('span', null, String(items.length))),
            items.length === 0
              ? h('div', { className: 'dem-empty' },
                h('strong', null, t('emptyRecords')),
                h('span', null, t('emptyRecordsHint')))
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
                h('span', null, t('selectRecordHint')),
                h(Button, { onClick: startNew, variant: 'primary' }, t('newRecord'))))));
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
      const [tab, setTab] = useState('overview');
      const tabs = useMemo(() => [
        ['overview', t('overview')],
        ['records', t('records')],
        ['context', t('context')],
        ['operations', t('operations')],
      ], []);
      return h('div', { className: 'dem-root' },
        h('div', { className: 'dem-shell' },
          h('header', { className: 'dem-header' },
            h('div', { className: 'dem-heading' },
              h('div', { className: 'dem-mark' }, h(EnvManagerIcon, { size: 22, active: true })),
              h('div', { className: 'dem-heading-copy' },
                h('h1', { className: 'dem-title' }, t('title')),
                h('p', { className: 'dem-sub' }, t('subtitle'))))),
          h('div', { className: 'dem-tabs', role: 'tablist' }, tabs.map(([key, label]) =>
            h('button', {
              key,
              type: 'button',
              role: 'tab',
              className: 'dem-tab',
              'aria-selected': tab === key ? 'true' : 'false',
              onClick: () => setTab(key),
            }, label))),
          tab === 'overview' ? h(Overview, { onOpenRecords: () => setTab('records') }) : null,
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
