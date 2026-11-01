# Local Run Guide

## Install in DSH Profile

From the project root:

```bash
dsh plugin_manager install_bundle --target .
```

Then restart DSH.

## Verify Installation

Check plugin manager for the installed bundle:

```bash
dsh plugin_manager list_bundles
```

## Uninstall

```bash
dsh plugin_manager remove_bundle --target dsh-env-manager
```

## Client Development

The client entry is `client.js`. It is loaded by the DSH Web/Desktop client.

To see changes, reinstall the bundle or rely on HMR if supported.
