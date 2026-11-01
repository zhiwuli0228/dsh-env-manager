# Client UI Integration

This note records the **host-side contract** a DSH bundle must follow when it adds a
sidebar entry and a main panel. It is derived from the installed
`@deepseek-ai/dsh-client-ui-sidebar` implementation (not from a mock), and from the
working `dsh-image-router` bundle.

Runtime source of truth:

- `@deepseek-ai/dsh-client-ui-sidebar/lib/client.js`, function `PanelRow`.
- The live slot catalog: `cordis_inspect_query` → `Slots.listSubTree` with root
  `sidebar.panellist`, and root `main`.
- Skill reference: `cordis-plugin-development/references/ui-plugin.md` and
  `references/practices.md` (plugin UI is part of the Harness UI).

## Sidebar entry

The sidebar owns the row. A plugin contributes only the row's **icon** and **label**;
it must not draw a button, row background, tooltip, margin, or hit area.

### Registration

```js
ctx.slots.inject('sidebar.panellist', () =>
  ctx.slots.register(
    {
      name: 'sidebar.panellist',
      id: 'dsh-env-manager', // row key; also the main panel key
      order: 40,
      label: () => t('title'), // thunk, re-read on locale projection
    },
    SidebarGlyph,
  ),
)
```

Rules:

1. `sidebar.panellist` is a **list** slot. Its registration fields are `id` (required),
   `order`, and `label`. `id` must be unique; reusing a shipped id replaces that row.
2. `name` is the common slots registration field. Include it; the live sidebar
   registers only entries that carry their slot name.
3. `label` is the row text and tooltip. Use a thunk when the text is localized so the
   owner can re-read it without re-registering.
4. The second argument is the glyph component. The owner renders it inside
   `span.panelGlyph` and passes exactly `{ size, active }`.

### Glyph contract

The owner passes:

- `size`: `16` when the sidebar is wide (`wide ? 16 : 18`);
- `active`: whether this row is the selected panel.

The glyph must:

- render an inline `<svg>` with `viewBox="0 0 20 20"`,
  `width={size}`, `height={size}`;
- default defensively to `20` if `size` is missing or invalid;
- use `fill="none"` and `stroke="currentColor"` (shipped icons are monochrome line
  icons; they inherit light/dark theme colors);
- use `opacity: 0.72` when `active === false`;
- set `aria-hidden="true"` and omit `aria-label`/tooltip — the row button owns the
  accessible name from `label`;
- avoid fixed pixel width/height, background, border, border-radius, margin, or padding.

A filled colored square at `48×48` is the common failure mode: it overflows the
`panelGlyph` box, ignores the `size` prop, and looks like a different navigation
control from the shipped rows.

## Main panel

```js
ctx.slots.inject('main', () =>
  ctx.slots.register(
    { name: 'main', key: 'dsh-env-manager', inject: () => ({}) },
    Panel,
  ),
)
```

- `main` is a **keyed** root slot. `key` must equal the sidebar `id`.
- A sidebar id without a matching `main` key opens an empty page; a `main` key without
  the sidebar id is unreachable.
- The panel owns its own layout, header, and content. It fills the same region as
  `conversation`.

## Styling and localization

- Use theme tokens (`--dsw-alias-*`) and `currentColor`; do not hard-code brand colors
  in the sidebar glyph.
- The host row supplies `.panelRow`, `.panelActive`, hover, focus, tooltip, and
  `aria-current`.
- Register the locale namespace best-effort, and make the sidebar `label` read the
  active locale. Do not re-register the row to change language.

## Verification

After installing or changing the plugin:

1. `Slots.listSubTree('sidebar.panellist')` must list the id with `active: true` and the
   expected order.
2. `Slots.listSubTree('main')` must list the same key as an occupant.
3. Toggle the sidebar between wide and collapsed; the glyph must render at `16` and
   `18` pixels respectively, with no clipping or colored background.
4. Switch `en`/`zh`; the row label must change without a reload or duplicate row.
5. Select the row and confirm the panel replaces the conversation region.

Client changes are picked up by HMR while the Web client watcher is running; a newly
installed bundle may need one page refresh before its module is present.
