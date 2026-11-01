# UI Design (V1)

> Status: normative for the Client half. Host behavior is in
> [`detailed-design.md`](detailed-design.md); transport and authentication are
> §4 here and §12 there.

## 1. Goals

The V1 UI makes the registry **inspectable and editable** without asking the agent to
run a tool, and makes rule resolution **explainable** rather than magical.

It is not a CMDB dashboard: no charts, no topology graph, no Skill execution button.
Bulk import is limited to the node line format below. Every other screen answers one
question and offers focused write actions.

## 2. Constraints

- Plain JavaScript `client.js`; no bundler, no JSX, no npm imports (F13).
- React comes from `require('react')`; elements via `React.createElement`.
- Only `slots` and `locale` services (F16).
- All data through `POST /env-manager/api` (F14, ADR-0009).
- All colors from `--dsw-alias-*` tokens (F17).
- No credential value is rendered or persisted. Environment-shell creation collects no
  password. The add/edit node form may collect a login password transiently and send it
  once to the Host, which forwards it to `ctx.credentials.set`; the registry keeps only
  `credentialRef`. Editing a node with both login fields empty never touches existing
  accounts or credentials.

## 3. Information architecture

```text
Sidebar
└── Environment Manager  (id: dsh-env-manager, order 40)
    └── main panel (key: dsh-env-manager)
        ├── Environments  (default; list, detail, New environment)
        ├── Overview      (counts, runtime, warnings, getting started, validation)
        ├── Records       (Services, Deployments, Rule Profiles, Operation Bindings)
        ├── Context Preview
        └── Operation Preview
```

Sections are a horizontal tab strip inside the panel, not separate sidebar entries. The
sidebar entry is the only global surface; the panel fills the same region as
`conversation`. **Environments is the default section** because host and account
management is the primary job; the panel header also carries a persistent
`New environment` action. Records is for the remaining configuration kinds and no longer
offers environment creation.

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

The implemented V1 panel is a centered content column, not a second navigation
sidebar:

```text
┌──────────────────────────────────────────────────────────────┐
│ [glyph] Environment Manager                  [New environment]│
│         Environments, services, deployments, routing.        │
│                                                              │
│ Environments   Overview   Records   Context   Operations     │
│ ────────────                                                 │
│ Environments                                    [Refresh]    │
│ ┌────────────────────┬───────────────────────────────────┐   │
│ │ Oracle 1           │ Select an environment,            │   │
│ │ test · 1 host ...  │ or add a new one.  [New environment]│  │
│ └────────────────────┴───────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

- The root is a plugin-owned `div.dem-root` with `height:100%; overflow:auto`; the
  content column is capped at 1080 px and centered.
- Title 22 px / 650; subtitle 13 px secondary. The header carries identity **and** the
  persistent `New environment` primary action; each view still supplies its own toolbar.
- Tabs are a horizontal underline strip (`role="tablist"`), never host `nav` styling.
  Environments / Overview / Records / Context / Operations are views. Environments is
  the default; record kinds are a second, segmented control inside Records.
- Panel background: `--dsw-alias-bg-base`; cards `--dsw-alias-bg-layer-1`; borders
  `--dsw-alias-border-l1`; secondary text `--dsw-alias-label-secondary`.
- The primary button is filled with `--dsw-alias-brand-primary` and uses
  `--dsw-alias-bg-base` for its label; this stays legible in both themes because the
  brand color and the base background are a contrast pair.
- Content scrolls with the root. Minimum practical width is 720 px; below 820 px the
  two-column blocks and the record split stack into one column.
- Avoid bare `<nav>`/`<section>` layout containers: host global styles can impose
  height on them. Use prefixed class names and plugin-owned elements.

## 6. Screens

### 6.1 Overview

- Five compact stat cards: Environments, Services, Deployments, Rule Profiles,
  Operation Bindings. Each shows the count only; no per-card diagnostics.
- Two side-by-side cards: Runtime (`dataDir`, total records, version pill) and Warnings
  (count pill, diagnostic list, or an empty state).
- `Refresh` reloads `meta`; `Validate` calls `validate` and renders a result card with
  a pass/fail pill and diagnostics.
- When the registry is empty, a "Get started" card shows the registration order
  (environment → service → deployment → operation binding) and opens the guided
  `New environment` form directly.

### 6.2 Environments

- The default section. A toolbar shows the section title, a one-line purpose and
  `Refresh`; the persistent header action `New environment` is always available.
- Environments use a master/detail flow: the left card lists environments (name, id,
  `category · hosts · accounts · login records`); selecting one opens the grouped detail
  view (§6.3).
- `New environment` creates only the **environment shell**: name, optional id, category and
  description. It seeds the four standard planes (`management`, `business`, `database`,
  `extension`) and leaves `hosts`, `clusters`, `endpoints` and `loginRecords` empty. Nodes
  are added inside the environment, from the plane they belong to. The shell form never
  asks for a password.
- Empty lists show a dashed empty state with `New environment` and `Refresh`.
- There is no global search across environments in V1; the `record.find` HTTP operation
  remains available to future screens.

### 6.2a Records

- A kind segmented control for Services, Deployments, Rule Profiles and Operation
  Bindings only. Environments are not listed here.
- `New record` loads the selected kind's YAML template into the editor; `Refresh`
  reloads the list. This is the advanced path for non-environment records.
- Empty lists show a dashed empty state with a short hint, not a blank card.

### 6.3 Environment detail

```text
← Back to environments
[glyph] Oracle 1        [Edit YAML] [Delete]
        oracle1  [test]  ● 4 hosts · 5 accounts
Environment overview | All nodes | Management | Business | Database |
Expansion / other | Login records | Endpoints | YAML
┌────────────────────────────────────┬──────────────────────────┐
│ Basic information                  │ Access summary           │
│ ID / category / name / aliases     │ 4 hosts   5 accounts     │
│ description / created / updated    │ 1 endpoint 0 failed      │
│ hosts / accounts                   │ latest login             │
│ Plane distribution                 │ Roles                    │
│ [Management 2] [Business 2] ...    │ [management] [business]  │
│ All nodes                          │                          │
│ [Oracle1] [db-01] [db-02] ...      │                          │
└────────────────────────────────────┴──────────────────────────┘
```

- Tabs are `Environment overview`, `All nodes`, one tab per declared role (`Management`,
  `Business`, `Database`, `Expansion / other`), `Login records`, `Endpoints`, `YAML`.
  The identity row and the back link stay visible above the tabs; tabs wrap rather than
  hide behind a horizontal scrollbar.
- The environment is **one network and one YAML document**. Plane tabs are filtered views
  over `hosts[]`: the same node appears in every plane it serves, and no record is copied
  per plane. A plane with zero nodes is valid and shows a plane-specific empty state with
  `Add node`.
- Overview basic information is a two-column key/value grid. `Edit info` opens an inline
  form for name, aliases, category and description; the ID is immutable. Saving sends the
  full structured record through `save` (`record`, not `yaml`) and then re-reads it.
- Access summary counts hosts, accounts, endpoints and failed logins; the latest login time
  and declared roles sit in the right rail. The role card shows node counts per plane and
  the four standard roles even when the environment declares only some of them.
- `All nodes` and every plane tab share one node view:
  - toolbar: search box (id, name, IP, platform, admin user or role), `Add node`,
    `Batch import`;
  - one compact card per host: name, active state, IP/port, platform, admin user, account
    count, credential reference and role chips;
  - `Edit node` opens the same form prefilled; `Accounts (n)` expands the account table;
    `Add account` opens the account form for that host.
- `Add node` / `Edit node` form fields: id (auto-slug when blank), name, IP, SSH port,
  platform, admin user, credential reference, role checkboxes (at least one) and an
  optional login username + password. Username and password must be filled together; when
  present the password is written to `ctx.credentials.set` and the account/credential ref
  is `env-manager/<environmentId>/<hostId>-<username>`. Editing a node preserves its
  existing accounts; filling username + password again adds a new password account while
  leaving the existing accounts and host credential reference intact. Opening the form
  from a plane tab preselects that role.
- `Batch import` accepts one node per line:
  `IP,name,roles,port,user`; multiple roles use `|` or `/`, for example
  `10.20.30.53,app-01,business|management,22,root`. Import creates hosts and optional
  accounts but never passwords; the operator binds credentials per node afterwards. The
  batch parser rejects unknown roles, duplicate IPs, duplicate host ids and invalid ports,
  and reports the first offending line without saving a partial batch.
- `Login records` sorts newest-first and shows time, result (success/failure), user, host,
  source IP, protocol and note. `Add login record` opens an inline form with host/account
  pickers; picking an account fills its username. A successful login also updates that
  account's `lastLoginAt`/`lastLoginFrom` when it is newer than the stored value. A
  failure renders with the error state color.
- `Endpoints` lists id, kind, target, URL, port, credential reference and note.
- `YAML` exposes the whole environment document with `Save` and `Delete`; it is the
  escape hatch, not the primary path. Account and login fields never contain secrets.
- Forms validate required fields locally (name, at least one role, IP format/duplicates,
  port range, and username/password pairing) and rely on the Host for schema and
  referential-integrity failures. A Host rejection stays visible above the node form and
  the form remains open; a failed save also removes any credential written for that
  attempt.

### 6.4 YAML record editor

Services, deployments, rule profiles and operation bindings. Environments are created as
shells through the dedicated shell form; an existing environment's YAML is editable from
its detail tab.

```text
test-a                                  [Save] [Delete]
environment / test-a
┌─────────────────────────────────────────────────────┐
│ id: test-a                                          │
│ schemaVersion: 1                                    │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

- The textarea is the source of truth for this editor; environment detail forms are the
  structured alternative.
- `Save` sends the whole YAML through `save`; schema failures are shown in an alert with
  the Host message and code. There is no per-record dry-run button in V1; `Validate`
  on Overview checks the whole registry.
- `Delete` asks for confirmation, then calls `remove`. The Host keeps a backup.
- Production records are still protected by the Host write policy; the panel surfaces
  `POLICY_DENIED` instead of retrying.
- Empty editor state offers `New record`, so the user does not have to go back to the
  toolbar.
- Keyboard shortcuts (Ctrl/Cmd+S, Esc) and dirty-state prompts are not implemented in
  V1; they remain on the roadmap.

Production records show a persistent banner:
"Production environment. Changes affect a live system." with
`--dsw-alias-state-warn-primary`.

### 6.5 Context Preview

Inputs: environment id, service id, deployment id (optional), entered as free text with
example placeholders (`test-a`, `aicoservice`, `deploy-001`).

Output in V1: the resolved context as formatted JSON in a scrollable `<pre>`. The Host
already returns provenance and structured `paths`/`variables`/`logSources`; a table view
with expandable provenance is a later refinement, not part of the current panel.

If resolution fails, the Host error (code and message) appears in the alert above the
form.

### 6.6 Operation Preview

Inputs: operation id, environment id, service id, deployment id (optional).

Output in V1: the routing result as formatted JSON, including the selected binding,
Skill, policy and parameters. Conflicts and missing Skills surface as the Host error
alert. A per-field policy card and an "also matched" list are later refinements.

### 6.7 Validation

There is no separate Diagnostics tab in V1. `Validate` on Overview calls the whole
registry check and renders its result card: pass/fail pill plus diagnostics with
severity, code and message. `Refresh` reloads `meta` and its warnings.

### 6.8 Bundle config page

Read-only rows: version, `dataDir`, record counts, warning count, "Open manager".

## 7. State and data flow

```js
const [section, setSection] = useState('overview')
const [kind, setKind] = useState('environment')
const [items, setItems] = useState([])
const [selected, setSelected] = useState(null)  // record id, not an object
const [record, setRecord] = useState(null)      // parsed environment detail
const [yaml, setYaml] = useState('')
const [error, setError] = useState(null)
const [message, setMessage] = useState(null)    // transient save/delete toast
```

- Requests use the shared `call(op, payload)` helper and surface Host errors as `ErrorBox`.
- After a successful save/delete: refresh the list, re-read the selected record for
  structured saves, and clear detail state when the record is removed.
- Environment detail forms save with `{ kind: 'environment', record }`; the YAML tab and
  the other record kinds save with `{ kind, yaml }`.
- No global state, no context provider, no polling. "Refresh" is explicit.
- A client reload or HMR resets the selected section and open detail; this is accepted in V1.

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
├── PanelHeader (glyph, title, subtitle)
├── HeaderActions (New environment, persistent)
├── SectionTabs (Environments / Overview / Records / Context / Operations)
├── SectionContent
│   ├── OverviewView (stat cards, runtime, warnings, onboarding)
│   ├── EnvironmentsView
│   │   ├── EnvironmentList ── EnvironmentRow
│   │   ├── EnvironmentDetail
│   │   │   ├── DetailHeader (back, identity, actions)
│   │   │   ├── DetailTabs (overview/all nodes/plane tabs/logins/endpoints/yaml)
│   │   │   ├── BasicInfo + BasicInfoForm
│   │   │   ├── AccessSummary + PlaneDistribution + RoleChips
│   │   │   ├── NodeToolbar (search/add/batch)
│   │   │   ├── NodeCard ── AccountTable + AccountForm
│   │   │   ├── NodeForm (multi-role, optional credential)
│   │   │   ├── BatchNodeForm
│   │   │   ├── LoginTable + LoginForm
│   │   │   ├── EndpointTable
│   │   │   └── YamlEditor
│   │   └── EnvironmentWizard (shell create: name/id/category/description + default planes)
│   ├── RecordsView
│   │   └── YamlRecordEditor (service/deployment/rule/binding)
│   ├── ContextView ── ResultBlock
│   └── OperationsView ── ResultBlock
└── Toast / ErrorBox
```

Each component is a function in `client.js`; shared helpers are `h()`, `t()`, `call()`,
`formatTime()`, `categoryLabel()`, `authLabel()`, `roleName()`, `countByRole()`,
`stableSlug()` and the form primitives `Field`, `Select` and `TextArea`.

## 12. Manual QA checklist

- [ ] Sidebar icon appears once, at 16 px wide / 18 px collapsed, in `currentColor`,
      with no filled background, and selects the panel.
- [ ] The sidebar row shows one label, aligned with the shipped rows, and the active
      row uses the host highlight rather than plugin-provided styling.
- [ ] Panel opens on **Environments**, not Overview or Records.
- [ ] The header `New environment` action opens the guided shell form from any tab.
- [ ] `Records` excludes Environments and keeps Services/Deployments/Rule Profiles/
      Operation Bindings YAML editing.
- [ ] Panel renders with an empty `dataDir` and with several environments.
- [ ] `New environment` creates one environment shell with the four standard roles and
      zero hosts; no password is requested and no credential is written.
- [ ] Environment list summary shows hosts, accounts and login records.
- [ ] Detail back link returns to the list and keeps the Records tab selected.
- [ ] Basic info edit round-trips name, aliases, category and description.
- [ ] Detail tabs wrap without clipping and show Overview, All nodes, each declared
      plane, Login records, Endpoints and YAML.
- [ ] A plane tab shows only nodes with that role; a multi-role node appears in every
      plane it serves without duplicating the host record.
- [ ] A plane with zero nodes shows its empty state and `Add node` preselects that role.
- [ ] Add node requires a name and at least one role; optional username + password writes
      a credential reference and never a plaintext secret.
- [ ] Edit node preserves existing accounts and can add/remove roles.
- [ ] Batch import parses `IP,name,roles,port,user`, supports `|` role separators and
      rejects unknown roles/duplicate IPs without saving a partial batch.
- [ ] Node search filters by id, name, IP, platform, admin user and role.
- [ ] An expanded node card shows every account with auth type and last login source.
- [ ] Add node / add account / add login record persist and re-render without a reload.
- [ ] Login records are ordered newest-first and failures use the error color.
- [ ] Endpoints show target name plus id and preserve URL/credential reference.
- [ ] YAML tab saves the same document and clears stale detail state after delete.
- [ ] Invalid YAML shows a diagnostic and does not write.
- [ ] Delete asks for confirmation and reports the Host error if removal fails.
- [ ] Production save is denied when `allowUiProductionWrites` is false.
- [ ] Context preview returns a structured context.
- [ ] Operation preview resolves a binding or a clear diagnostic.
- [ ] Language switch between `en` and `zh` updates every visible string.
- [ ] Light and dark themes both keep contrast on cards and badges.
- [ ] Keyboard-only navigation reaches every action.
- [ ] Reload of the page keeps the selected section out of scope (state resets).

## 13. Out of scope for V1

- Full CRUD forms for services, deployments, rules and bindings.
- Deleting individual hosts/accounts/logins from rows (edit + YAML is the V1 path).
- Database primary/replica/sharding topology; V1 models the database plane as a role and
  keeps topology detail in node notes.
- YAML syntax highlighting, folding, or diff view.
- Topology graphs and dependency visualizations.
- Creating or editing the session default environment.
- Executing a Skill or showing an operation timeline.
- Multi-user presence, comments, or audit UI.
- JumpServer/PAM API synchronization; login data is entered or imported explicitly.
