# UI Design (V1)

> Status: normative for the Client half. Host behavior is in
> [`detailed-design.md`](detailed-design.md); transport and authentication are
> §4 here and §12 there.

## 1. Goals

The V1 UI makes the registry **inspectable and editable** without asking the agent to
run a tool, and makes rule resolution **explainable** rather than magical.

It is not a CMDB dashboard: no charts, no topology graph, no bulk import, no Skill
execution button. Every screen answers one question and offers one write action.

## 2. Constraints

- Plain JavaScript `client.js`; no bundler, no JSX, no npm imports (F13).
- React comes from `require('react')`; elements via `React.createElement`.
- Only `slots` and `locale` services (F16).
- All data through `POST /env-manager/api` (F14, ADR-0009).
- All colors from `--dsw-alias-*` tokens (F17).
- No credential value is ever displayed or requested.

## 3. Information architecture

```text
Sidebar
└── Environment Manager  (id: dsh-env-manager, order 40)
    └── main panel (key: dsh-env-manager)
        ├── Overview
        ├── Environments
        ├── Services
        ├── Deployments
        ├── Rule Profiles
        ├── Operation Bindings
        ├── Context Preview
        ├── Operation Preview
        └── Diagnostics
```

Sections are a vertical tab strip inside the panel, not separate sidebar entries. The
sidebar entry is the only global surface; the panel fills the same region as
`conversation`.

### 3.1 Sidebar slot contract

The sidebar is a host-owned list slot, not a free-form navigation area. The entry must
follow the installed `sidebar.panellist` contract (verified against
`@deepseek-ai/dsh-client-ui-sidebar` in this runtime). The full reusable contract is in
[`client-ui-integration.md`](../02-harness/client-ui-integration.md); the project-specific
rules are:

1. Register a list entry on the root context:

   ```js
   ctx.slots.inject('sidebar.panellist', () =>
     ctx.slots.register({
       name: 'sidebar.panellist',
       id: 'dsh-env-manager',
       order: 40,
       label: () => t('title'), // thunk: re-read on every locale projection
     }, SidebarGlyph),
   )
   ```

   `name` names the slot for the registration; `id` is the row key and must equal the
   `main` key. `label` is the row text and tooltip; use a thunk so a language switch does
   not require re-registration. Do not register a second entry for panel sections.

2. The owner renders the second registration argument inside its own
   `span.panelGlyph` and passes exactly `{ size, active }`:
   - `size` is `16` when the sidebar is wide and `18` in the collapsed rail;
   - `active` is the selected-page state.

   The glyph must render an inline `<svg>` with `viewBox="0 0 20 20"`,
   `width={size}`, `height={size}`, `fill="none"`, and `stroke="currentColor"`.
   Use `opacity: 0.72` when `active === false`; do not set a fixed pixel size,
   background, border, radius, margin, or padding. The host row already supplies the
   button, hit area, hover, focus, tooltip, and `aria-current`.

3. The glyph is decorative: set `aria-hidden="true"` and do not put an `aria-label` or
   tooltip on it. The row button owns the accessible name from `label`.

4. Register the page under `main` on the root context with the same key:

   ```js
   ctx.slots.inject('main', () =>
     ctx.slots.register({ name: 'main', key: 'dsh-env-manager', inject: () => ({}) }, Panel),
   )
   ```

   A sidebar id without a matching `main` key opens an empty page; a `main` key without
   the sidebar id is unreachable.

5. Keep the glyph monochrome. Brand color belongs to `icon.svg` (the plugin-manager
   card), not to the sidebar row; the sidebar uses host `currentColor` so light and dark
   themes stay consistent with shipped icons.

The bundle page (`plugins.bundle.config`, keyed `dsh-env-manager`) shows a read-only
summary: version, `dataDir`, record counts, last load time, warning count. It links to
the panel's Diagnostics section.

## 4. Client ↔ Host transport

### 4.1 Request

```js
const API = '/env-manager/api'

async function call(op, payload, signal) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-env-manager-request': '1' },
    body: JSON.stringify(payload === undefined ? { op } : { op, payload }),
    signal,
  })
  const body = await res.json().catch(() => null)
  if (!body) throw { code: 'NETWORK', message: `HTTP ${res.status}` }
  if (!body.ok) throw body.error
  return body.data
}
```

- One helper, one place that knows the URL and header.
- `signal` is always passed; every screen creates an `AbortController` on mount and
  aborts it on unmount or section switch.
- Errors are surfaced as `{ code, message, details }`; the UI never renders a stack.

### 4.2 Operations used by the UI

`meta`, `record.list`, `record.get`, `record.find`, `record.save`, `record.remove`
(with `confirm`), `record.validate`, `context.resolve`, `operation.resolve`,
`diagnostics`. No session-context operation.

### 4.3 Failure presentation

| HTTP | UI |
|---|---|
| 400/422 | inline field banner with `code` and message |
| 403 | banner: "This action is not allowed by the current policy" + code |
| 404 | banner + refresh button |
| 409 | conflict dialog listing the conflicting ids from `details` |
| 500 | banner: "Unexpected error", `code`, copy button for the message |
| network | banner with retry |

## 5. Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Environment Manager                     [dataDir] [refresh]  │
├──────────────┬───────────────────────────────────────────────┤
│ Overview     │  Environments                       [+ New]   │
│ Environments │  [search……………]                              │
│ Services     │  ┌──────────────────────────────────────────┐ │
│ Deployments  │  │ id        name        category   updated │ │
│ Rules        │  │ test-a    Test A      test       …       │ │
│ Bindings     │  └──────────────────────────────────────────┘ │
│ Context      │                                               │
│ Operation    │  <editor / detail replaces the table on select>│
│ Diagnostics  │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

- Panel background: `--dsw-alias-bg-base`; cards `--dsw-alias-bg-layer-1`; borders
  `--dsw-alias-border-l1`.
- Section strip: 180 px fixed, `--dsw-alias-bg-layer-1`; active item uses
  `--dsw-alias-brand-primary` text and a 2 px left bar.
- Content scrolls independently; the header stays.
- Minimum practical width 720 px; below 640 px the strip becomes a `<select>`.

## 6. Screens

### 6.1 Overview

Cards: Environments, Services, Deployments, Rule Profiles, Operation Bindings,
Diagnostics. Each card shows the count and the number of error/warning diagnostics.
Below: `dataDir` (copyable), plugin version, last load time, and a "Validate" button.

### 6.2 List screens (Environments, Services, Deployments, Rules, Bindings)

A shared `RecordList` component:

- search box filters by id/name/alias on the Host (`record.find`) after 2 characters,
  debounced 200 ms; locally filters the loaded list otherwise;
- table columns: `id`, `name`, one kind-specific column, `updatedAt`;
- clicking a row loads `record.get` and opens the editor;
- `+ New` opens an empty YAML template for that kind;
- empty state names the kind and the `dataDir`, with a "Create the first one" action.

Kind-specific column:

| Kind | Column |
|---|---|
| environment | `category`, host count |
| service | `category`, deploy modes |
| deployment | `environmentId`, `runtimeMode` |
| ruleProfile | path count, variable count |
| operationBinding | `operation`, match summary |

### 6.3 Record editor

Shared `RecordEditor`:

```text
[back]  test-a                                    [validate] [save]
──────────────────────────────────────────────────────────────────
 id: test-a                     |  Status: valid / 2 errors
 category: test                 |  (diagnostics list)
 ...                            |
 [YAML textarea, monospace,  |  [preview of parsed summary]
  min 320px, tab inserts 2]   |
```

- The textarea is the source of truth; no form fields in V1. Structured forms are a
  later refinement, and YAML keeps round-tripping honest.
- `validate` calls `record.save` with `dryRun: true`; the Host validates **without
  writing**. A `RECORD_INVALID` failure is rendered as inline diagnostics from
  `error.details.issues` (with `path`), not as a toast. The whole-registry check remains
  `record.validate`.
- `save` is disabled while the text is unchanged or invalid.
- `Ctrl/Cmd+S` triggers save; `Esc` returns to the list.
- Dirty state prompts before leaving the section.
- Delete lives in an overflow menu, never beside Save.

Production records show a persistent banner:
"Production environment. Changes affect a live system." with
`--dsw-alias-state-warn-primary`.

### 6.4 Context Preview

Inputs: environment (select), service (select), deployment (select, optional).

Output:

1. Header: resolved environment/service/deployment ids and runtime mode.
2. `paths` table: field, value, `definedBy` badge.
3. Clicking a row expands `inputs` (field → layer) and `shadowed` (layer + profile).
4. `variables` table: name, value, `definedBy`.
5. `logSources[runtime]` and `classLocations[runtime]` cards, each property carrying its
   own `definedBy` badge.
6. Credential status list: `credentialRef`, configured source, never a value.
7. Unknown fields are absent, not blank.

If resolution fails, the diagnostics panel appears above the inputs, each with `code`,
`message` and the field path.

### 6.5 Operation Preview

Inputs: operation (`select` of the 13 standard ids), environment, service,
deployment (optional).

Output:

1. Selected binding id, match level, and the reason it won.
2. Skill: name, `available` (true/false/unknown), source, provider.
3. Policy: `requiresApproval`, `allowProduction`, and the production verdict.
4. Parameters table with resolved values.
5. Every lower-level binding that was eligible, collapsed under "also matched".

Conflicts render as an error card listing all candidates — never a silent winner.

### 6.6 Diagnostics

Table: severity, code, message, file, field path. Filters: severity, kind. Buttons:
"Reload registry" (`meta`), "Copy report".

### 6.7 Bundle config page

Read-only rows: version, `dataDir`, record counts, warning count, "Open manager".

## 7. State and data flow

```js
const [section, setSection] = useState('overview')
const [list, setList] = useState(null)        // { items, warnings }
const [selected, setSelected] = useState(null) // { kind, id, record, yaml }
const [busy, setBusy] = useState(false)
const [error, setError] = useState(null)
```

- One `AbortController` per active request; a new request aborts the previous one.
- After a successful save/delete: refresh `meta` and the current list, then close the
  editor.
- No global state, no context provider, no polling. "Refresh" is explicit.
- `useEffect` deps always include the current section and selected id.

## 8. Internationalization

Namespace `envManager`; dictionaries registered for `en` and `zh`.

| Key | en | zh |
|---|---|---|
| `title` | Environment Manager | 环境管理器 |
| `section.overview` | Overview | 概览 |
| `section.environments` | Environments | 环境 |
| `section.services` | Services | 服务 |
| `section.deployments` | Deployments | 部署 |
| `section.rules` | Rule Profiles | 规则档案 |
| `section.bindings` | Operation Bindings | 操作绑定 |
| `section.context` | Context Preview | 上下文预览 |
| `section.operation` | Operation Preview | 操作预览 |
| `section.diagnostics` | Diagnostics | 诊断 |
| `action.new` | New | 新建 |
| `action.save` | Save | 保存 |
| `action.validate` | Validate | 校验 |
| `action.delete` | Delete | 删除 |
| `action.refresh` | Refresh | 刷新 |
| `action.back` | Back | 返回 |
| `action.cancel` | Cancel | 取消 |
| `state.empty` | No records yet | 暂无记录 |
| `state.loading` | Loading… | 加载中… |
| `state.dirty` | Unsaved changes | 有未保存的修改 |
| `state.production` | Production environment. Changes affect a live system. | 生产环境，修改会影响线上系统。 |
| `confirm.delete.title` | Delete {id}? | 删除 {id}？ |
| `confirm.delete.body` | This cannot be undone. A backup copy is kept. | 此操作不可撤销，但会保留一份备份。 |
| `confirm.delete.type` | Type {id} to confirm | 输入 {id} 以确认 |
| `error.policy` | Not allowed by the current policy | 当前策略不允许此操作 |
| `error.network` | Cannot reach the Host | 无法连接 Host |
| `error.conflict` | Conflicting bindings: {ids} | 冲突的绑定：{ids} |
| `context.definedBy` | Defined by | 定义来源 |
| `context.inputs` | Inputs | 输入 |
| `context.shadowed` | Shadowed | 被覆盖 |
| `context.noValue` | Not defined | 未定义 |
| `operation.requiresApproval` | Requires approval | 需要审批 |
| `operation.allowProduction` | Allows production | 允许生产 |
| `skill.available` | Available | 可用 |
| `skill.unavailable` | Unavailable | 不可用 |
| `skill.unknown` | Unknown | 未知 |

Rules:

- `t(key, params)` from `ctx.locale.bind('envManager')`; no string concatenation.
- Dates render with `Intl.DateTimeFormat` from the active locale id.
- A missing key falls back to English and logs once.

## 9. Styling

```js
const S = {
  panel: { display: 'flex', height: '100%', background: 'var(--dsw-alias-bg-base)' },
  strip: { width: 180, borderRight: '1px solid var(--dsw-alias-border-l1)',
           background: 'var(--dsw-alias-bg-layer-1)', padding: 8 },
  card: { background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l1)',
          borderRadius: 8, padding: 16 },
  text: { color: 'var(--dsw-alias-label-primary)' },
  muted: { color: 'var(--dsw-alias-label-secondary)' },
  danger: { color: 'var(--dsw-alias-state-error-primary)' },
  warn: { color: 'var(--dsw-alias-state-warn-primary)' },
  ok: { color: 'var(--dsw-alias-state-success-primary)' },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 },
}
```

- No inline hex colors except the plugin-manager `icon.svg` brand mark. The sidebar
  glyph uses `currentColor` only, so it follows the host theme.
- Radius 8, spacing multiples of 4, body 13 px, mono 12 px.
- Hover uses `--dsw-alias-bg-layer-2`; focus ring uses `--dsw-alias-brand-primary`.

## 10. Accessibility

- Section strip is a `role="tablist"` with arrow-key navigation.
- Every icon-only button has `aria-label`.
- Errors use `role="alert"`; success uses `role="status"`.
- The YAML textarea has a label and a described-by diagnostics id.
- Focus returns to the row that opened the editor after Save/Back.
- No action is reachable only by hover.

## 11. Component tree

```text
EnvManagerPanel
├── PanelHeader (title, dataDir, refresh)
├── SectionStrip (tabs)
├── SectionContent
│   ├── OverviewSection
│   ├── RecordListSection (kind) ── RecordTable ── RecordRow
│   ├── RecordEditor (kind, id) ── YamlEditor, DiagnosticList, ConfirmBar
│   ├── ContextSection ── ProvenanceTable ── ProvenanceRow
│   ├── OperationSection ── BindingCard ── PolicyCard ── ParameterTable
│   └── DiagnosticsSection ── DiagnosticTable
└── Banner (error / warning / production)
```

Each component is a function in `client.js`; shared helpers are `h()`, `t()`, `call()`,
`formatDate()`, `badge()`.

## 12. Manual QA checklist

- [ ] Sidebar icon appears once, at 16 px wide / 18 px collapsed, in `currentColor`,
      with no filled background, and selects the panel.
- [ ] The sidebar row shows one label, aligned with the shipped rows, and the active
      row uses the host highlight rather than plugin-provided styling.
- [ ] Panel renders with an empty `dataDir` and with 20 records.
- [ ] Search finds by id, name and alias.
- [ ] Create → save → list → reopen preserves all values (comments are dropped because
      the Host normalizes YAML).
- [ ] Invalid YAML shows a diagnostic and does not write.
- [ ] Delete requires typing the id and offers a backup note.
- [ ] Production save is denied when `allowUiProductionWrites` is false.
- [ ] Context preview shows `definedBy` and expands `inputs`/`shadowed`.
- [ ] Operation preview shows a conflict card for two same-level bindings.
- [ ] Skill unavailable renders as an error, not as "unknown".
- [ ] Language switch between `en` and `zh` updates every visible string.
- [ ] Light and dark themes both keep contrast on cards and badges.
- [ ] Keyboard-only navigation reaches every action.
- [ ] Reload of the page keeps the selected section out of scope (state resets).

## 13. Out of scope for V1

- Structured forms per record kind.
- YAML syntax highlighting, folding, or diff view.
- Topology graphs and dependency visualizations.
- Creating or editing the session default environment.
- Executing a Skill or showing an operation timeline.
- Multi-user presence, comments, or audit UI.
