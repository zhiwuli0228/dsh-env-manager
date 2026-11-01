# Local Run Guide

## Build

```bash
npm install
npm run build
```

## Install in a DSH Profile

In a DSH session, call the `plugin_manager` tool:

```text
action: install_bundle
target: <absolute path to this repository>
```

Restart DSH if the bundle was already installed before this change.

## Verify Installation

Ask `plugin_manager` for `action: list_bundles`, then confirm the bundle appears.

Then check that the tools are available: ask the Agent to call `env_list`; it should return an empty list rather than an unknown-tool error.

## Where the data lives

The Host reports the resolved `dataDir` once at startup. On first run the directories are created:

```text
<dataDir>/environments  services  deployments  rules  operations  sessions
```

Put a sample environment there or use `env_save`.

## Development loop

1. Edit `src/`.
2. `npm run build`.
3. Reinstall the bundle.
4. Restart DSH (Host code changes need a fresh module generation).
5. Call the tool again.

`client.js` changes need the same reinstall; they do not require a build.

## Uninstall

Call `plugin_manager` with `action: remove_bundle` and `target: dsh-env-manager-plugin`.

Registry data under `dataDir` is not removed automatically. Back it up before deleting the profile.

## Troubleshooting

See `06-operations/troubleshooting.md`.
